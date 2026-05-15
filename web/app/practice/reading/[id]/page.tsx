import { getQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import PracticeClient from "./PracticeClient";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; answerId?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const quiz = getQuiz(Number(id));
  if (!quiz) notFound();

  const mode = sp.type === "review" ? "review" : "exam";

  return <PracticeClient quiz={quiz} initialMode={mode} />;
}
