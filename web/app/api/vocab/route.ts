import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const YOUPASS_BASE = "https://api.youpass.vn/v1";
const SESSION_PATH = path.join(process.cwd(), "../data/sessions/storage-state.json");
const CACHE_PATH = path.join(process.cwd(), "../data/api/vocab/cache.json");
const COOKIE_TTL = 60 * 60 * 1000;

let cachedCookies: string | null = null;
let cachedAuthToken: string | null = null;
let cachedAt = 0;
let fileCache: Record<string, unknown> = {};

try {
  if (fs.existsSync(CACHE_PATH)) fileCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
} catch {
  fileCache = {};
}

function getCookieHeader(): string {
  // 1. Ưu tiên env var YOUPASS_AUTH_TOKEN (dùng trên Netlify/production)
  const envToken = process.env.YOUPASS_AUTH_TOKEN;
  if (envToken) {
    cachedAuthToken = envToken;
    cachedCookies = `auth_token=${envToken}`;
    return cachedCookies;
  }
  // 2. Fallback: đọc từ session file (local dev)
  if (cachedCookies && Date.now() - cachedAt < COOKIE_TTL) return cachedCookies;
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    const youPassCookies = (state.cookies || []).filter((cookie: { domain?: string }) => {
      const domain = cookie.domain || "";
      return /youpass\.vn$/.test(domain) || domain === ".youpass.vn";
    });
    cachedCookies = youPassCookies.map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`).join("; ");
    cachedAuthToken = youPassCookies.find((cookie: { name: string }) => cookie.name === "auth_token")?.value || null;
    cachedAt = Date.now();
    return cachedCookies || "";
  } catch {
    return "";
  }
}

function getAuthHeader(): string | null {
  getCookieHeader();
  return cachedAuthToken ? `Bearer ${cachedAuthToken}` : null;
}

function persistCache() {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(fileCache));
  } catch {
    // Cache is best-effort; API should still work when disk persistence fails.
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parent_id");
  const word = searchParams.get("word");

  if (!parentId || !word) {
    return NextResponse.json({ error: "missing parent_id or word" }, { status: 400 });
  }

  if (!/^[a-zA-Z'\-]{1,50}$/.test(word)) {
    return NextResponse.json({ error: "invalid word" }, { status: 400 });
  }

  const cacheKey = `${parentId}::${word.toLowerCase()}`;
  if (fileCache[cacheKey]) {
    return NextResponse.json(fileCache[cacheKey], { headers: { "X-Cache": "HIT" } });
  }

  const cookie = getCookieHeader();
  if (!cookie) {
    return NextResponse.json({ error: "no session - refresh storage-state.json" }, { status: 401 });
  }

  try {
    const upstream = `${YOUPASS_BASE}/vocabs?parent_id=${encodeURIComponent(parentId)}&word=${encodeURIComponent(word)}`;
    const res = await fetch(upstream, {
      headers: {
        Cookie: cookie,
        ...(getAuthHeader() ? { Authorization: getAuthHeader()! } : {}),
        Accept: "application/json",
        Origin: "https://e-learning.youpass.vn",
        Referer: "https://e-learning.youpass.vn/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ error: "upstream error", status: res.status, detail }, { status: res.status });
    }

    const data = await res.json();
    fileCache[cacheKey] = data;
    persistCache();
    return NextResponse.json(data, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return NextResponse.json({ error: "fetch failed", message }, { status: 500 });
  }
}
