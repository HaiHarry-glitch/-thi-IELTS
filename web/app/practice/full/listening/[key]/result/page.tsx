import { loadFullTestQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ResultClient from "@/app/practice/reading/[id]/result/ResultClient";

export default async function FullListeningResultPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const quiz = loadFullTestQuiz(key, "listening");
  if (!quiz) notFound();
  return <ResultClient quiz={quiz} skill="listening" isFullTest fullTestKey={quiz.fullTestKey || key.toUpperCase()} />;
}
