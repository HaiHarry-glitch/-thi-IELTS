import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const AUDIO_DIR = path.join(process.cwd(), "../data/listening-audio");
const NORMALIZED_LISTENING_DIR = path.join(process.cwd(), "../data/normalized-listening");

function getContentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".m4a" || ext === ".mp4") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  return "audio/mpeg";
}

function resolveCmsAudioUrl(file: string): string | null {
  const match = /^(\d+)(?:-(\d+))?\.(?:mp3|m4a|wav|ogg)$/i.exec(file);
  if (!match) return null;

  const quizId = Number(match[1]);
  const partIndex = match[2] == null ? 0 : Number(match[2]);
  const quizPath = path.join(NORMALIZED_LISTENING_DIR, `${quizId}.json`);
  if (!Number.isFinite(quizId) || !Number.isFinite(partIndex) || !fs.existsSync(quizPath)) return null;

  try {
    const quiz = JSON.parse(fs.readFileSync(quizPath, "utf8"));
    const part = Array.isArray(quiz.parts) ? quiz.parts[partIndex] : null;
    const fileId = part?.fileId;
    if (typeof fileId !== "string" || !fileId) return null;
    return `https://cms.youpass.vn/assets/${encodeURIComponent(fileId)}`;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  // Defend against path traversal
  if (file.includes("..") || file.includes("/") || file.includes("\\")) {
    return NextResponse.json({ error: "invalid file" }, { status: 400 });
  }
  const externalBase = process.env.LISTENING_AUDIO_BASE_URL;
  if (externalBase) {
    return NextResponse.redirect(`${externalBase.replace(/\/$/, "")}/${encodeURIComponent(file)}`);
  }
  const filePath = path.join(AUDIO_DIR, file);
  if (!fs.existsSync(filePath)) {
    const cmsUrl = resolveCmsAudioUrl(file);
    if (cmsUrl) return NextResponse.redirect(cmsUrl);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });
    return new NextResponse(stream as any, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": getContentType(file),
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      "Content-Type": getContentType(file),
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
