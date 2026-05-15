import { getQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ExamClient from "./ExamClient";
import ReadingReviewClient from "./ReadingReviewClient";

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const quiz = getQuiz(Number(id));
  if (!quiz) notFound();

  if (sp.type === "review") {
    return <ReadingReviewClient quiz={quiz} />;
  }

  return <ExamClient quiz={quiz} mode="exam" />;
}
