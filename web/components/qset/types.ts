import type { ReactNode } from "react";

export interface QOption { text: string; option: string }

export interface Question {
  id: number;
  order: number;
  type: string;
  text: string;
  content: string;
  options: QOption[] | null;
  correctAnswer: string | null;
  correctAnswers: string[] | null;
  explanationHtml: string;
  locateInfo: unknown;
  matchingHeadingParagraph: string | number | null;
  mapPosition: unknown;
  audioUrl: string | null;
  sampleAnswers: unknown;
}

export interface QuestionSet {
  id: number;
  type: string;
  title: string;
  instructionHtml: string;
  contentHtml: string;
  options: QOption[] | null;
  optionTitle: string | null;
  allowReuse: boolean;
  maxSelections: number;
  image: string | null;
  sort: number;
  questions: Question[];
}

export type Answers = Record<number, string | string[]>;
export type Mode = "exam" | "review" | "result";
export type ReviewRender = (q: Question, order: number) => ReactNode;

export function getCorrect(q: Question): string | string[] | null {
  if (q.correctAnswers && q.correctAnswers.length > 0) return q.correctAnswers;
  return q.correctAnswer;
}
