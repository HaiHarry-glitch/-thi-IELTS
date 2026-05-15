import { NextRequest, NextResponse } from "next/server";
import { getQuiz } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quiz = getQuiz(Number(id));
  if (!quiz) return new NextResponse(null, { status: 404 });
  return NextResponse.json(quiz);
}
