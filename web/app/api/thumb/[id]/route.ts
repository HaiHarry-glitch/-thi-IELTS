import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "../data");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const externalBase = process.env.THUMB_BASE_URL;
  if (externalBase) {
    return NextResponse.redirect(`${externalBase.replace(/\/$/, "")}/${encodeURIComponent(`${id}.jpg`)}`);
  }
  // Try reading first, then listening (filenames don't collide because IDs are globally unique)
  const candidates = [
    path.join(DATA, "images", `${id}.jpg`),
    path.join(DATA, "images-listening", `${id}.jpg`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      return new NextResponse(buf, {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
      });
    }
  }
  return new NextResponse(null, { status: 404 });
}
