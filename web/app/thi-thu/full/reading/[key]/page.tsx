import { loadFullTestQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ExamClient from "@/app/thi-thu/reading/[id]/ExamClient";
import ReadingReviewClient from "@/app/thi-thu/reading/[id]/ReadingReviewClient";

export default async function FullReadingExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const quiz = loadFullTestQuiz(key, "reading");
  if (!quiz) notFound();

  if (sp.type === "review") return <ReadingReviewClient quiz={quiz} />;

  return <ExamClient quiz={quiz} mode="exam" isFullTest fullTestKey={quiz.fullTestKey || key.toUpperCase()} />;
}
