import fs from "fs";
import path from "path";
import { getFullTest, type FullTestSkill } from "./fullTest";

const DATA_DIR = path.join(process.cwd(), "../data");
const NORMALIZED_DIR = path.join(DATA_DIR, "normalized");
const INDEX_PATH = path.join(NORMALIZED_DIR, "_index.json");

export interface QuizSummary {
  id: number;
  title: string;
  parts: number;
  questions: number;
  hasPassage: boolean;
}

export interface ListeningQuizSummary {
  id: number;
  title: string;
  parts: number;
  questions: number;
  hasTranscript: boolean;
  hasAudio: boolean;
}

export interface IndexItem {
  id: number;
  title: string;
  type: number;
  quiz_type: number;
  time: number;
  thumbnail: string | null;
  quiz_code: string;
  total_submitted: number;
  vote_count: number;
  is_public: boolean;
  date_updated: string;
  tags: { id: number; code: string; title: string }[];
}

export interface NormalizedQuestion {
  id: number;
  order: number;
  type: string;
  text: string;
  content: string;
  options: { text: string; option: string }[] | null;
  correctAnswer: string | null;
  correctAnswers: string[] | null;
  explanationHtml: string;
  locateInfo: LocateInfo | null;
  matchingHeadingParagraph: string | number | null;
  mapPosition: unknown;
  audioUrl: string | null;
  sampleAnswers: unknown;
}

export interface LocateInfo {
  time_ranges?: {
    from?: number | null;
    to?: number | null;
  } | null;
  paragraph_ranges?: Array<{
    start?: {
      paragraph?: number;
      sentence?: number;
      index?: number;
    };
    end?: {
      paragraph?: number;
      sentence?: number;
      index?: number;
    };
  }> | null;
}

export interface TranscriptSentence {
  id: number;
  text: string;
  from: number | null;
  to: number | null;
  speaker: string | null;
}

export interface TranscriptParagraph {
  paragraph: number;
  sentences: TranscriptSentence[];
}

export interface NormalizedQuestionSet {
  id: number;
  type: string;
  title: string;
  instructionHtml: string;
  contentHtml: string;
  options: { text: string; option: string }[] | null;
  optionTitle: string | null;
  allowReuse: boolean;
  maxSelections: number;
  image: string | null;
  sort: number;
  questions: NormalizedQuestion[];
}

export interface NormalizedPart {
  id: number;
  index: number;
  title: string;
  passageHtml?: string;
  transcriptHtml: string | null;
  transcriptSegments?: TranscriptParagraph[] | null;
  fileId: string | null;
  audioUrl?: string | null;
  listenFrom: number | null;
  listenTo: number | null;
  instruction: string | null;
  taskInstruction: string | null;
  questionSets: NormalizedQuestionSet[];
  explanations: unknown[];
}

export interface NormalizedQuiz {
  id: number;
  skill: string;
  title: string;
  type: number;
  quizType: number;
  durationMin: number;
  thumbnail: string | null;
  thumbnailUrl: string;
  totalSubmitted: number;
  voteCount: number;
  isPublic: boolean;
  quizCode: string;
  dateUpdated: string;
  unavailable?: boolean;
  unavailableReason?: string;
  tags: { id: number; code: string; title: string }[];
  parts: NormalizedPart[];
  fullTestKey?: string;
  cambridge?: number;
  test?: number;
}

let _indexCache: QuizSummary[] | null = null;
let _listCache: IndexItem[] | null = null;

export function getIndex(): QuizSummary[] {
  if (_indexCache) return _indexCache;
  const raw = fs.readFileSync(INDEX_PATH, "utf-8");
  _indexCache = JSON.parse(raw);
  return _indexCache!;
}

export function getListIndex(): IndexItem[] {
  if (_listCache) return _listCache;
  const listPath = path.join(DATA_DIR, "index", "reading.json");
  const raw = fs.readFileSync(listPath, "utf-8");
  const data = JSON.parse(raw);
  _listCache = data.items;
  return _listCache!;
}

const _quizCache = new Map<number, NormalizedQuiz>();

export function getQuiz(id: number): NormalizedQuiz | null {
  if (_quizCache.has(id)) return _quizCache.get(id)!;
  const filePath = path.join(NORMALIZED_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const quiz = JSON.parse(raw) as NormalizedQuiz;
  _quizCache.set(id, quiz);
  return quiz;
}

export function getAllQuizIds(): number[] {
  return getIndex().map((q) => q.id);
}

export function getThumbPath(id: number): string {
  return `/thumbs/${id}.jpg`;
}

// ==== Listening ====

const LISTENING_NORMALIZED_DIR = path.join(DATA_DIR, "normalized-listening");
const LISTENING_INDEX_PATH = path.join(LISTENING_NORMALIZED_DIR, "_index.json");
let _listeningListCache: IndexItem[] | null = null;
let _listeningIndexCache: ListeningQuizSummary[] | null = null;
const _listeningQuizCache = new Map<number, NormalizedQuiz>();

export function getListeningIndex(): ListeningQuizSummary[] {
  if (_listeningIndexCache) return _listeningIndexCache;
  if (!fs.existsSync(LISTENING_INDEX_PATH)) return [];
  const raw = fs.readFileSync(LISTENING_INDEX_PATH, "utf-8");
  _listeningIndexCache = JSON.parse(raw);
  return _listeningIndexCache!;
}

export function getListeningListIndex(): IndexItem[] {
  if (_listeningListCache) return _listeningListCache;
  const listPath = path.join(DATA_DIR, "index", "listening.json");
  if (!fs.existsSync(listPath)) return [];
  const raw = fs.readFileSync(listPath, "utf-8");
  const data = JSON.parse(raw);
  _listeningListCache = data.items;
  return _listeningListCache!;
}

export function getListeningQuiz(id: number): NormalizedQuiz | null {
  if (_listeningQuizCache.has(id)) return _listeningQuizCache.get(id)!;
  const filePath = path.join(LISTENING_NORMALIZED_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const quiz = JSON.parse(raw) as NormalizedQuiz;
  _listeningQuizCache.set(id, quiz);
  return quiz;
}

const _fullTestQuizCache = new Map<string, NormalizedQuiz>();

function makeFullTestId(cambridge: number, test: number, skill: FullTestSkill): number {
  const skillOffset = skill === "listening" ? 1000 : 0;
  return -1 * (skillOffset + cambridge * 10 + test);
}

function cloneQuiz(quiz: NormalizedQuiz): NormalizedQuiz {
  return JSON.parse(JSON.stringify(quiz)) as NormalizedQuiz;
}

export function loadFullTestQuiz(key: string, skill: FullTestSkill): NormalizedQuiz | null {
  const cacheKey = `${skill}:${key.toUpperCase()}`;
  if (_fullTestQuizCache.has(cacheKey)) return _fullTestQuizCache.get(cacheKey)!;

  const summary = getFullTest(key, skill);
  if (!summary) return null;

  const sourceItems = skill === "reading" ? summary.passages || [] : summary.sections || [];
  const sourceQuizzes = sourceItems
    .map((item) => (skill === "reading" ? getQuiz(item.id) : getListeningQuiz(item.id)))
    .filter(Boolean)
    .map((quiz) => cloneQuiz(quiz as NormalizedQuiz));

  if (sourceQuizzes.length !== sourceItems.length) return null;

  // Index is built so each passage's natural q.order is already global (1-13, 14-26, 27-40).
  // We preserve those orders as-is — DON'T renumber. The previous renumber logic was buggy
  // because it used raw max(q.order) which under-counts MULTIPLE_CHOICE_MANY slots (1 question
  // at order=25 with maxSel=2 occupies slots 25 AND 26, but raw order is just 25).
  const parts: NormalizedPart[] = [];

  sourceQuizzes.forEach((sourceQuiz, idx) => {
    const sourcePart = sourceQuiz.parts[0];
    if (!sourcePart) return;
    const item = sourceItems[idx];
    const part = sourcePart;
    part.id = item.id;
    part.index = idx;
    part.title = item.title || part.title || `${skill === "reading" ? "Passage" : "Section"} ${idx + 1}`;

    for (const qs of part.questionSets || []) {
      qs.id = item.id * 1000 + qs.sort;
    }

    parts.push(part);
  });

  const first = sourceQuizzes[0];
  const fullQuiz: NormalizedQuiz = {
    ...first,
    id: makeFullTestId(summary.cambridge, summary.test, skill),
    skill,
    title: summary.title,
    durationMin: summary.durationMin,
    totalSubmitted: 0,
    voteCount: 0,
    quizCode: summary.key,
    thumbnail: first.thumbnail,
    thumbnailUrl: first.thumbnailUrl,
    tags: first.tags || [],
    parts,
    fullTestKey: summary.key,
    cambridge: summary.cambridge,
    test: summary.test,
  };

  _fullTestQuizCache.set(cacheKey, fullQuiz);
  return fullQuiz;
}
