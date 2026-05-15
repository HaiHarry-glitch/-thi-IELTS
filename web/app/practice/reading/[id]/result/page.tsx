import { getQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ResultClient from "./ResultClient";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = getQuiz(Number(id));
  if (!quiz) notFound();
  return <ResultClient quiz={quiz} />;
}
