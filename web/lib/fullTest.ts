import fs from "fs";
import path from "path";

export type FullTestSkill = "reading" | "listening";

export interface FullTestPartSummary {
  id: number;
  order: number;
  title: string;
  questions: number;
}

export interface FullTestSummary {
  key: string;
  cambridge: number;
  test: number;
  skill: FullTestSkill;
  title: string;
  passages?: FullTestPartSummary[];
  sections?: FullTestPartSummary[];
  totalQuestions: number;
  durationMin: number;
}

const FULL_TEST_INDEX = path.join(process.cwd(), "../data/full-tests/_index.json");

let cache: FullTestSummary[] | null = null;

export function getAllFullTests(): FullTestSummary[] {
  if (cache) return cache;
  if (!fs.existsSync(FULL_TEST_INDEX)) return [];
  cache = JSON.parse(fs.readFileSync(FULL_TEST_INDEX, "utf8")) as FullTestSummary[];
  return cache;
}

export function getFullTests(skill?: FullTestSkill): FullTestSummary[] {
  const items = getAllFullTests();
  return skill ? items.filter((item) => item.skill === skill) : items;
}

export function getFullTest(key: string, skill: FullTestSkill): FullTestSummary | null {
  const normalizedKey = key.toUpperCase();
  return getAllFullTests().find((item) => item.key.toUpperCase() === normalizedKey && item.skill === skill) || null;
}
