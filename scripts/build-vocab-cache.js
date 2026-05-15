/**
 * build-vocab-cache.js — Pre-warm vocab cache từ tất cả đề đang có
 *
 * Usage:
 *   node scripts/build-vocab-cache.js              # warm tất cả, bỏ qua đã cache
 *   node scripts/build-vocab-cache.js --force      # re-fetch kể cả đã cache
 *   node scripts/build-vocab-cache.js --quiz 10291 # chỉ warm 1 quiz
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SESSION_PATH = path.join(ROOT, "data/sessions/storage-state.json");
const CACHE_PATH   = path.join(ROOT, "data/api/vocab/cache.json");
const NORM_DIR     = path.join(ROOT, "data/normalized");
const NORM_DIR_LS  = path.join(ROOT, "data/normalized-listening");
const BASE         = "https://api.youpass.vn/v1";

const FORCE     = process.argv.includes("--force");
const ONLY_QUIZ = (() => { const i = process.argv.indexOf("--quiz"); return i >= 0 ? parseInt(process.argv[i+1]) : null; })();
const CONCURRENT = 8;   // tăng lên 8 parallel
const DELAY_MS   = 120; // giảm delay xuống 120ms

// ─── Common English stop words & short words to SKIP ───────────────────────
const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","can","shall",
  "not","no","nor","so","yet","both","either","whether","that","this","these",
  "those","which","who","whom","whose","what","when","where","why","how",
  "all","any","each","every","few","more","most","other","some","such",
  "than","then","too","very","just","only","also","as","if","its","it",
  "his","her","him","she","he","they","them","their","we","our","us","you",
  "your","my","me","i","up","out","about","into","through","during","before",
  "after","above","below","between","without","within","along","across",
  "there","here","one","two","three","new","old","well","even","back","still",
  "now","get","make","like","time","way","first","last","long","great","little",
  "own","right","high","come","think","know","take","see","use","work","give",
  "over","same","good","need","place","large","often","order","point","part",
  "end","put","keep","let","begin","show","turn","move","play","run","live",
  "hold","bring","happen","write","seem","feel","try","leave","call","keep",
  "off","off","then","into","over","just","much","many","while","where","when",
]);

function isSkippable(word) {
  if (word.length < 4) return true;
  if (STOP_WORDS.has(word)) return true;
  if (/^\d+$/.test(word)) return true;
  return false;
}

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Session ────────────────────────────────────────────────────────────────

function loadSession() {
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    const cookies = (state.cookies || []).filter(c => /youpass\.vn$/.test(c.domain || ""));
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    const authToken = cookies.find(c => c.name === "auth_token")?.value || null;
    if (!authToken) throw new Error("auth_token not found");
    return { cookieHeader, authToken };
  } catch(e) {
    console.error("❌ Không đọc được session:", e.message);
    console.error("   Chạy: node scripts/scrape-new.js để refresh session");
    process.exit(1);
  }
}

// ─── API fetch ──────────────────────────────────────────────────────────────

function apiFetch(url, { cookieHeader, authToken }) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        Cookie: cookieHeader,
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
        Origin: "https://e-learning.youpass.vn",
        Referer: "https://e-learning.youpass.vn/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on("error", () => resolve({ status: 0, body: null }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ status: 0, body: null }); });
  });
}

// ─── Extract sentences from passage HTML ────────────────────────────────────
// Format in data: {[sentence text][sentenceId]}

function extractSentences(html) {
  if (!html || html === "null") return [];
  const results = [];
  const re = /\{\[([^\]]+)\]\[(\d+)\]\}/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({ text: m[1], id: parseInt(m[2]) });
  }
  return results;
}

function extractWords(text) {
  return [...new Set(
    text.replace(/[^a-zA-Z\s'-]/g, " ")
      .split(/\s+/)
      .map(w => w.replace(/^['-]+|['-]+$/g, "").toLowerCase())
      .filter(w => !isSkippable(w))
  )];
}

// ─── Load quiz files ─────────────────────────────────────────────────────────

function loadAllQuizFiles() {
  const files = [];
  for (const dir of [NORM_DIR, NORM_DIR_LS]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json") || f === "_index.json") continue;
      const id = parseInt(f);
      if (!isNaN(id) && (!ONLY_QUIZ || id === ONLY_QUIZ)) {
        files.push(path.join(dir, f));
      }
    }
  }
  return files;
}

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

// ─── Save cache ──────────────────────────────────────────────────────────────

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  const mb = (fs.statSync(CACHE_PATH).size / 1048576).toFixed(1);
  return `${Object.keys(cache).length} entries, ${mb} MB`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log("════════════════════════════════════════");
  log("  HIN — Build Vocab Cache (offline)");
  log("════════════════════════════════════════");

  const session = loadSession();
  log(`Session: ✅ (auth_token có)`);

  // Load existing cache
  let cache = {};
  try {
    if (fs.existsSync(CACHE_PATH)) {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
      log(`Cache hiện tại: ${Object.keys(cache).length} entries`);
    }
  } catch { cache = {}; }

  // Collect quiz files
  const quizFiles = loadAllQuizFiles();
  if (ONLY_QUIZ && !quizFiles.length) {
    log(`❌ Quiz #${ONLY_QUIZ} không tìm thấy`); process.exit(1);
  }
  log(`Quiz files: ${quizFiles.length}`);

  // Extract pairs
  log("Phân tích passages (lọc stop words)...");
  const allPairs = [];
  const seen = new Set();
  for (const f of quizFiles) {
    for (const p of extractPairsFromQuiz(f)) {
      const key = `${p.parentId}::${p.word}`;
      if (!seen.has(key)) { seen.add(key); allPairs.push(p); }
    }
  }

  const todo = FORCE
    ? allPairs
    : allPairs.filter(p => !cache[`${p.parentId}::${p.word}`]);

  const estMin = Math.ceil((todo.length / CONCURRENT) * (DELAY_MS / 1000) / 60);
  log(`Tổng cần fetch: ${todo.length} (bỏ stop words, bỏ đã cache)`);
  log(`Ước tính: ~${estMin} phút (${CONCURRENT} concurrent, ${DELAY_MS}ms delay)`);

  if (!todo.length) {
    log("✅ Cache đã đầy đủ!");
    log(saveCache(cache));
    return;
  }

  // Process
  let ok = 0, skip404 = 0, err = 0, authFail = false;
  let lastSave = Date.now();
  let lastLog  = Date.now();

  for (let i = 0; i < todo.length; i += CONCURRENT) {
    if (authFail) break;
    const batch = todo.slice(i, i + CONCURRENT);

    await Promise.all(batch.map(async ({ parentId, word }) => {
      if (authFail) return;
      const key = `${parentId}::${word}`;
      const url = `${BASE}/vocabs?parent_id=${encodeURIComponent(parentId)}&word=${encodeURIComponent(word)}`;
      const { status, body } = await apiFetch(url, session);

      if (status === 200 && body?.data) {
        cache[key] = body;
        ok++;
      } else if (status === 404 || status === 204) {
        skip404++; // word not in YouPass — normal, ignore
      } else if (status === 401 || status === 403) {
        authFail = true;
        err++;
      } else {
        err++;
      }
    }));

    await sleep(DELAY_MS);

    // Log every 5 seconds
    if (Date.now() - lastLog > 5000) {
      const done = ok + skip404 + err;
      const pct = ((done / todo.length) * 100).toFixed(1);
      const remaining = Math.ceil(((todo.length - done) / CONCURRENT) * (DELAY_MS / 1000) / 60);
      log(`${pct}% | ✅ ${ok} | ⚪ ${skip404} | ❌ ${err} | còn ~${remaining} phút`);
      lastLog = Date.now();
    }

    // Save every 30 seconds
    if (Date.now() - lastSave > 30000) {
      const info = saveCache(cache);
      log(`  💾 Auto-save: ${info}`);
      lastSave = Date.now();
    }
  }

  if (authFail) {
    log("❌ Session hết hạn! Chạy scrape-new.js để refresh rồi chạy lại.");
    saveCache(cache);
    process.exit(1);
  }

  log(`\nHoàn thành! OK=${ok} | Skip(no entry)=${skip404} | Lỗi=${err}`);
  const info = saveCache(cache);
  log(`Cache: ${info}`);
  log(`\nCommit lên git để dùng offline trên Netlify:`);
  log(`  git add data/api/vocab/cache.json`);
  log(`  git commit -m "chore(vocab): update offline cache"`);
  log(`  git push origin main`);
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
