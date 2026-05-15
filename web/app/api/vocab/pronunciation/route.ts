import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SESSION_PATH = path.join(process.cwd(), "../data/sessions/storage-state.json");
const CACHE_PATH = path.join(process.cwd(), "../data/api/vocab/pronunciation-cache.json");

let cache: Record<string, unknown> = {};

try {
  if (fs.existsSync(CACHE_PATH)) cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
} catch {
  cache = {};
}

function getCookieHeader(): string {
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    return (state.cookies || [])
      .filter((cookie: { domain?: string }) => {
        const domain = cookie.domain || "";
        return /youpass\.vn$/.test(domain) || domain === ".youpass.vn";
      })
      .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
      .join("; ");
  } catch {
    return "";
  }
}

function getAuthHeader(): string | null {
  try {
    const state = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    const token = (state.cookies || []).find((cookie: { name?: string }) => cookie.name === "auth_token")?.value;
    return token ? `Bearer ${token}` : null;
  } catch {
    return null;
  }
}

function persistCache() {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  } catch {
    // Best-effort cache.
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vocab, word_class, ipa } = body?.data || {};

  if (!vocab) return NextResponse.json({ error: "missing vocab" }, { status: 400 });

  const key = `${vocab}::${word_class || ""}::${ipa || ""}`;
  if (cache[key]) return NextResponse.json(cache[key], { headers: { "X-Cache": "HIT" } });

  const cookie = getCookieHeader();
  if (!cookie) return NextResponse.json({ error: "no session - refresh storage-state.json" }, { status: 401 });

  try {
    const res = await fetch("https://api.youpass.vn/v1/pronunciation", {
      method: "POST",
      headers: {
        Cookie: cookie,
        ...(getAuthHeader() ? { Authorization: getAuthHeader()! } : {}),
        "Content-Type": "application/json",
        Origin: "https://e-learning.youpass.vn",
        Referer: "https://e-learning.youpass.vn/",
      },
      body: JSON.stringify({ data: { vocab, word_class, ipa } }),
    });
    const data = await res.json();
    cache[key] = data;
    persistCache();
    return NextResponse.json(data, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
