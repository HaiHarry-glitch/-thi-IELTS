/**
 * build-vocab-cache.js — Pre-warm vocab cache từ tất cả đề đang có
 *
 * Cách hoạt động:
 *   1. Đọc tất cả file JSON trong data/normalized/ và data/normalized-listening/
 *   2. Parse passageHtml/transcriptHtml để lấy tất cả (sentenceId, word) pairs
 *   3. Gọi YouPass API /v1/vocabs?parent_id=...&word=... cho từng pair
 *   4. Lưu kết quả vào data/api/vocab/cache.json
 *   5. Cache này được commit lên git → Netlify dùng offline, không cần session
 *
 * Usage:
 *   node scripts/build-vocab-cache.js              # warm tất cả, bỏ qua đã cache
 *   node scripts/build-vocab-cache.js --force      # re-fetch kể cả đã cache
 *   node scripts/build-vocab-cache.js --quiz 10291 # chỉ warm 1 quiz
 *
 * Note: cần có session hợp lệ trong data/sessions/storage-state.json
 *       Chạy scrape-new.js trước nếu chưa có session.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SESSION_PATH = path.join(ROOT, "data/sessions/storage-state.json");
const CACHE_PATH = path.join(ROOT, "data/api/vocab/cache.json");
const NORM_DIR = path.join(ROOT, "data/normalized");
const NORM_DIR_LS = path.join(ROOT, "data/normalized-listening");
const BASE = "https://api.youpass.vn/v1";

const FORCE = process.argv.includes("--force");
const ONLY_QUIZ = (() => {
  const idx = process.argv.indexOf("--quiz");
  return idx >= 0 ? parseInt(process.argv[idx + 1]) : null;
})();

// Rate limit: max requests per second
const DELAY_MS = 250;
const CONCURRENT = 3;

// ─── Helpers ───────────────────────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function loadSession() {
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    const cookies = (state.cookies || []).filter((c) => /youpass\.vn$/.test(c.domain || ""));
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const authToken = cookies.find((c) => c.name === "auth_token")?.value || null;
    return { cookieHeader, authToken };
  } catch (e) {
    console.error("❌ Không đọc được session:", e.message);
    console.error("   Chạy: node scripts/scrape-new.js để refresh session");
    process.exit(1);
  }
}

function apiFetch(url, { cookieHeader, authToken }) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        Cookie: cookieHeader,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        Accept: "application/json",
        Origin: "https://e-learning.youpass.vn",
        Referer: "https://e-learning.youpass.vn/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
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
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ─── Parse sentence IDs from passage/transcript HTML ──────────────────────
// Format: {[sentence text][sentenceId]}

function extractSentences(html) {
  if (!html || html === "null") return [];
  const results = [];
  // Match {[sentence text][id]} pattern
  const re = /\{\[([^\]]*)\]\[(\d+)\]\}/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({ text: m[1], id: parseInt(m[2]) });
  }
  return results;
}

// Extract meaningful words from a sentence (length 3+, alpha only)
function extractWords(text) {
  const words = text
    .replace(/[^a-zA-Z\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, "").toLowerCase())
    .filter((w) => w.length >= 3 && /^[a-z]/.test(w));
  // Deduplicate
  return [...new Set(words)];
}

// ─── Load all quiz files ───────────────────────────────────────────────────

function loadAllQuizFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "_index.json")
    .map((f) => ({ id: parseInt(f), path: path.join(dir, f) }))
    .filter((x) => !isNaN(x.id));
}

// ─── Extract all (sentenceId, word) pairs from a quiz ─────────────────────

function extractPairsFromQuiz(quizPath) {
  try {
    const quiz = JSON.parse(fs.readFileSync(quizPath, "utf8"));
    const pairs = [];
    for (const part of quiz.parts || []) {
      for (const html of [part.passageHtml, part.transcriptHtml]) {
        for (const { text, id } of extractSentences(html || "")) {
          for (const word of extractWords(text)) {
            pairs.push({ parentId: id, word });
          }
        }
      }
    }
    return pairs;
  } catch { return []; }
}

// ─── Fetch and cache vocab for one (parentId, word) ───────────────────────

async function fetchAndCache(parentId, word, cache, session) {
  const key = `${parentId}::${word}`;
  if (!FORCE && cache[key]) return "HIT";

  const url = `${BASE}/vocabs?parent_id=${encodeURIComponent(parentId)}&word=${encodeURIComponent(word)}`;
  const { status, body } = await apiFetch(url, session);

  if (status === 200 && body?.data) {
    cache[key] = body;
    return "OK";
  }
  if (status === 401) return "AUTH"; // session expired
  return `ERR:${status}`;
}

// ─── Process in batches ────────────────────────────────────────────────────

async function processBatch(pairs, cache, session, onProgress) {
  let ok = 0, hit = 0, err = 0, authFail = false;

  for (let i = 0; i < pairs.length; i += CONCURRENT) {
    const batch = pairs.slice(i, i + CONCURRENT);
    const results = await Promise.all(
      batch.map(({ parentId, word }) => fetchAndCache(parentId, word, cache, session))
    );
    for (const r of results) {
      if (r === "HIT") hit++;
      else if (r === "OK") ok++;
      else if (r === "AUTH") { authFail = true; err++; }
      else err++;
    }
    if (authFail) { log("❌ Session hết hạn! Chạy scrape-new.js để refresh."); break; }
    onProgress(ok, hit, err, pairs.length);
    await sleep(DELAY_MS);
  }
  return { ok, hit, err };
}

// ─── Save cache ────────────────────────────────────────────────────────────

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  const sizeMB = (fs.statSync(CACHE_PATH).size / 1048576).toFixed(1);
  log(`💾 Cache đã lưu: ${Object.keys(cache).length} entries, ${sizeMB} MB → ${CACHE_PATH}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  log("════════════════════════════════════════");
  log("  HIN — Build Vocab Cache (offline mode)");
  log("════════════════════════════════════════");
  if (FORCE) log("⚠ --force: re-fetching kể cả đã cache");

  const session = loadSession();
  log(`Session loaded (auth_token: ${session.authToken ? "✅" : "❌ không có"})`);

  // Load existing cache
  let cache = {};
  try {
    if (fs.existsSync(CACHE_PATH)) {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
      log(`Cache hiện tại: ${Object.keys(cache).length} entries`);
    }
  } catch { cache = {}; }

  // Collect quiz files
  let quizFiles = [
    ...loadAllQuizFiles(NORM_DIR),
    ...loadAllQuizFiles(NORM_DIR_LS),
  ];
  if (ONLY_QUIZ) {
    quizFiles = quizFiles.filter((f) => f.id === ONLY_QUIZ);
    if (!quizFiles.length) { log(`❌ Quiz #${ONLY_QUIZ} không tìm thấy`); process.exit(1); }
  }
  log(`Tìm thấy ${quizFiles.length} quiz files cần process`);

  // Extract all (parentId, word) pairs
  log("Đang phân tích passage/transcript...");
  const allPairs = [];
  const seenKeys = new Set();
  for (const { path: qPath } of quizFiles) {
    const pairs = extractPairsFromQuiz(qPath);
    for (const p of pairs) {
      const key = `${p.parentId}::${p.word}`;
      if (!seenKeys.has(key)) { seenKeys.add(key); allPairs.push(p); }
    }
  }
  log(`Tổng từ cần cache: ${allPairs.length} (sau dedup)`);
  const uncached = FORCE ? allPairs : allPairs.filter((p) => !cache[`${p.parentId}::${p.word}`]);
  log(`Chưa có trong cache: ${uncached.length} từ cần fetch`);

  if (!uncached.length) {
    log("✅ Không có gì mới cần fetch!");
    saveCache(cache);
    return;
  }

  // Estimate time
  const estSec = Math.ceil((uncached.length / CONCURRENT) * (DELAY_MS / 1000));
  log(`Ước tính: ~${Math.ceil(estSec / 60)} phút (${uncached.length} requests, ${CONCURRENT} concurrent)`);

  let lastLog = Date.now();
  const onProgress = (ok, hit, err, total) => {
    if (Date.now() - lastLog > 5000) {
      const done = ok + hit + err;
      const pct = ((done / uncached.length) * 100).toFixed(0);
      log(`  ${pct}% (${done}/${uncached.length}) | OK:${ok} HIT:${hit} ERR:${err} | cache=${Object.keys(cache).length}`);
      lastLog = Date.now();
      // Save periodically
      saveCache(cache);
    }
  };

  const { ok, hit, err } = await processBatch(uncached, cache, session, onProgress);
  log(`\nHoàn thành: Fetch=${ok}, Cache hit=${hit}, Lỗi=${err}`);

  saveCache(cache);
  log("\n✅ Xong! Commit cache lên git:");
  log("   git add data/api/vocab/cache.json && git commit -m 'chore(vocab): update offline cache'");
  log("   git push origin main");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
