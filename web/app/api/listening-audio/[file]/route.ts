import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const AUDIO_DIR = path.join(process.cwd(), "../data/listening-audio");

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
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
