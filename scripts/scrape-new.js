/**
 * scrape-new.js — Mở trình duyệt, đợi đăng nhập, cào đề mới từ YouPass
 *
 * Usage:
 *   node scripts/scrape-new.js            # cào reading mới
 *   node scripts/scrape-new.js listening  # cào listening mới
 *   node scripts/scrape-new.js all        # cào cả hai
 *
 * Script sẽ:
 *   1. Nếu data/sessions/storage-state.json tồn tại và còn hạn → dùng luôn
 *   2. Nếu không → mở Chrome, đợi bạn đăng nhập vào e-learning.youpass.vn
 *   3. Lưu session → data/sessions/storage-state.json
 *   4. Gọi YouPass API liệt kê tất cả quiz IDs
 *   5. Tìm IDs chưa có trong local data
 *   6. Download + normalize từng quiz mới → data/normalized/ hoặc data/normalized-listening/
 *   7. Cập nhật _index.json
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SKILL = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "reading";
const DO_READING = SKILL === "reading" || SKILL === "all";
const DO_LISTENING = SKILL === "listening" || SKILL === "all";

const SESSION_PATH = path.join(ROOT, "data/sessions/storage-state.json");
const NORM_DIR = path.join(ROOT, "data/normalized");
const NORM_DIR_LS = path.join(ROOT, "data/normalized-listening");
const BASE = "https://api.youpass.vn/v1";

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Session ────────────────────────────────────────────────────────────────

function loadExistingSession() {
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    const cookies = (state.cookies || []).filter((c) => /youpass\.vn$/.test(c.domain || ""));
    const authCookie = cookies.find((c) => c.name === "auth_token");
    if (!authCookie) return null;
    // Check expiry if available
    if (authCookie.expires && authCookie.expires > 0) {
      const expiresMs = authCookie.expires * 1000;
      if (Date.now() > expiresMs) { log("Session đã hết hạn"); return null; }
    }
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    return { cookieHeader, authToken: authCookie.value };
  } catch { return null; }
}

async function loginViaBrowser() {
  log("Mở trình duyệt để đăng nhập...");
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });
  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage();
  await page.goto("https://e-learning.youpass.vn/", { waitUntil: "domcontentloaded" });

  log("⏳ Vui lòng đăng nhập vào YouPass trong cửa sổ trình duyệt...");
  log("   Script sẽ tự động tiếp tục sau khi phát hiện session.");

  let authToken = null, cookieHeader = "";
  for (let i = 0; i < 180; i++) { // wait 3 minutes
    const cookies = await ctx.cookies("https://e-learning.youpass.vn");
    const auth = cookies.find((c) => c.name === "auth_token");
    if (auth?.value) {
      authToken = auth.value;
      cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
      log("✅ Đã phát hiện session!");
      break;
    }
    await sleep(1000);
  }

  if (!authToken) {
    await browser.close();
    throw new Error("Timeout đăng nhập (3 phút). Thử lại.");
  }

  // Save storage state
  const state = await ctx.storageState();
  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
  fs.writeFileSync(SESSION_PATH, JSON.stringify(state, null, 2));
  log(`💾 Session đã lưu → ${SESSION_PATH}`);

  await browser.close();
  return { cookieHeader, authToken };
}

// ─── API ────────────────────────────────────────────────────────────────────

function apiFetch(url, session) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        Cookie: session.cookieHeader,
        Authorization: `Bearer ${session.authToken}`,
        Accept: "application/json",
        Origin: "https://e-learning.youpass.vn",
        Referer: "https://e-learning.youpass.vn/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

async function fetchAllQuizIds(session, type) {
  const ids = [];
  let page = 1;
  while (true) {
    const url = `${BASE}/quizzes?type=${type}&page=${page}&page_size=50&status=published`;
    log(`  Fetching page ${page}...`);
    const { status, body } = await apiFetch(url, session);
    if (status !== 200) { log(`  ⚠ API ${status}`); break; }
    const items = body?.data?.items || [];
    if (!items.length) break;
    for (const item of items) ids.push(item.id);
    if (items.length < 50) break;
    page++;
    await sleep(300);
  }
  return ids;
}

async function fetchQuizDetail(id, session) {
  const { status, body } = await apiFetch(`${BASE}/quizzes/${id}?included_vocabs=true`, session);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  return body?.data;
}

// ─── Normalize ──────────────────────────────────────────────────────────────

function normQ(q, defaultType) {
  const type = q.type || defaultType || "SHORT_ANSWER";
  const raw = q.correct_answer ?? q.correctAnswer ?? null;
  const correctAnswer = Array.isArray(raw) ? raw.join("|") : raw != null ? String(raw) : null;
  return {
    id: q.id,
    order: q.order ?? q.sort ?? 0,
    type,
    text: q.content || q.text || "",
    matchingHeadingParagraph: q.matching_heading_paragraph ?? q.matchingHeadingParagraph ?? null,
    correctAnswer,
    explanationHtml: q.explanation || q.explanationHtml || null,
  };
}

function normQSet(qs) {
  const type = qs.type || "SHORT_ANSWER";
  const opts = (qs.options || []).map((o) => ({ option: o.option || o.code || "", text: o.value || o.text || "" }));
  return {
    id: qs.id,
    type,
    title: qs.title || "",
    instructionHtml: qs.instruction_html || qs.instructionHtml || "",
    contentHtml: qs.content_html || qs.contentHtml || qs.content || "",
    options: opts.length ? opts : null,
    optionTitle: qs.option_title || qs.optionTitle || null,
    allowReuse: qs.allow_reuse ?? qs.allowReuse ?? false,
    maxSelections: qs.max_selections ?? qs.maxSelections ?? 0,
    image: qs.image || null,
    sort: qs.sort ?? 0,
    questions: (qs.questions || []).map((q) => normQ(q, type)),
  };
}

function normPart(part, idx) {
  return {
    id: part.id,
    index: idx + 1,
    title: part.title || "",
    passageHtml: part.passage_html || part.passageHtml || part.content || null,
    transcriptHtml: part.transcript_html || part.transcriptHtml || null,
    fileId: part.file_id || part.fileId || null,
    audioUrl: part.audio_url || part.audioUrl || null,
    listenFrom: part.listen_from ?? part.listenFrom ?? null,
    listenTo: part.listen_to ?? part.listenTo ?? null,
    instruction: part.instruction || null,
    taskInstruction: part.task_instruction || part.taskInstruction || null,
    questionSets: (part.question_sets || part.questionSets || []).map(normQSet),
    explanations: part.explanations || [],
  };
}

function normalizeQuiz(raw) {
  return {
    id: raw.id,
    title: raw.title || "",
    parts: (raw.parts || []).map((p, i) => normPart(p, i)),
  };
}

// ─── Index ──────────────────────────────────────────────────────────────────

function loadLocalIds(dir) {
  try {
    const p = path.join(dir, "_index.json");
    if (!fs.existsSync(p)) return new Set();
    return new Set(JSON.parse(fs.readFileSync(p, "utf8")).map((x) => x.id));
  } catch { return new Set(); }
}

function upsertIndex(dir, entry) {
  const p = path.join(dir, "_index.json");
  let arr = [];
  try { if (fs.existsSync(p)) arr = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  arr = arr.filter((x) => x.id !== entry.id);
  arr.push(entry);
  arr.sort((a, b) => a.id - b.id);
  fs.writeFileSync(p, JSON.stringify(arr, null, 2));
}

function countQ(quiz) {
  let n = 0;
  for (const p of quiz.parts || [])
    for (const qs of p.questionSets || [])
      n += (qs.questions || []).length;
  return n;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════════════════════════════════════");
  log("  HIN — Scrape New Quizzes from YouPass");
  log("═══════════════════════════════════════════");
  log(`Skill: ${SKILL}`);

  // Get session
  let session = loadExistingSession();
  if (session) {
    log("✅ Session hợp lệ trong file, không cần đăng nhập");
  } else {
    session = await loginViaBrowser();
  }

  const jobs = [];
  if (DO_READING)   jobs.push({ type: 10, label: "Reading",   dir: NORM_DIR });
  if (DO_LISTENING) jobs.push({ type: 11, label: "Listening", dir: NORM_DIR_LS });

  let totalNew = 0;

  for (const { type, label, dir } of jobs) {
    log(`\n── ${label} ──────────────────────────────`);
    fs.mkdirSync(dir, { recursive: true });

    const localIds = loadLocalIds(dir);
    log(`Local: ${localIds.size} đề`);

    const remoteIds = await fetchAllQuizIds(session, type);
    log(`YouPass: ${remoteIds.length} đề published`);

    const newIds = remoteIds.filter((id) => !localIds.has(id));
    log(`→ ${newIds.length} đề MỚI`);

    let downloaded = 0, failed = 0;
    for (const id of newIds) {
      try {
        const raw = await fetchQuizDetail(id, session);
        if (!raw) { failed++; continue; }

        const quiz = normalizeQuiz(raw);
        fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(quiz, null, 2));

        const qCount = countQ(quiz);
        upsertIndex(dir, { id, title: quiz.title, parts: quiz.parts.length, questions: qCount, hasPassage: true });

        downloaded++;
        totalNew++;
        log(`  ✅ #${id} (${qCount}Q) "${quiz.title.slice(0, 55)}"`);
        await sleep(400);
      } catch (err) {
        failed++;
        log(`  ❌ #${id}: ${err.message}`);
      }
    }

    log(`${label}: +${downloaded} mới, ${failed} lỗi`);
  }

  log(`\n✅ Xong! Tổng cộng ${totalNew} đề mới được tải về.`);
  if (totalNew > 0) {
    log("Tiếp theo:");
    log("  node scripts/build-full-test-index.js   ← cập nhật full-test index");
    log("  git add data/ && git commit && git push ← push lên GitHub");
  }
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
