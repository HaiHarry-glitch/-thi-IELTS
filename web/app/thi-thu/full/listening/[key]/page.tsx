import { loadFullTestQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ListeningClient from "@/app/thi-thu/listening/[id]/ListeningClient";
import ListeningReviewClient from "@/app/thi-thu/listening/[id]/ListeningReviewClient";

export default async function FullListeningExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const quiz = loadFullTestQuiz(key, "listening");
  if (!quiz) notFound();

  if (sp.type === "review") return <ListeningReviewClient quiz={quiz} />;

  return <ListeningClient quiz={quiz} mode="exam" isFullTest fullTestKey={quiz.fullTestKey || key.toUpperCase()} />;
}
