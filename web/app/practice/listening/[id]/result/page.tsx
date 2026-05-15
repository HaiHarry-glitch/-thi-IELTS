import { getListeningQuiz } from "@/lib/data";
import { notFound } from "next/navigation";
import ResultClient from "../../../reading/[id]/result/ResultClient";

export default async function ListeningResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = getListeningQuiz(Number(id));
  if (!quiz) notFound();
  return <ResultClient quiz={quiz} skill="listening" />;
}
