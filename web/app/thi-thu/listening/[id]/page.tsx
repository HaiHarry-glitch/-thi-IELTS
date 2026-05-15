import { getListeningQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ListeningClient from "./ListeningClient";
import ListeningReviewClient from "./ListeningReviewClient";

export default async function ListeningExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const quiz = getListeningQuiz(Number(id));
  if (!quiz || quiz.unavailable) notFound();
  const mode = sp.type === "review" ? "review" : "exam";
  return mode === "review" ? <ListeningReviewClient quiz={quiz} /> : <ListeningClient quiz={quiz} mode="exam" />;
}
