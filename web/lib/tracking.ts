import type { StudentInfo } from './student';
import { expandQuestion, scoreSlot } from './expandQuestions';
import { getBand } from './bandScore';

const GAS_URL = process.env.NEXT_PUBLIC_TRACKING_GAS_URL || '';
const PENDING_PREFIX = 'hin_pending_attempt_';

// ─── EVENT ──────────────────────────────────────────────────────────────
export interface TrackingEvent {
  ts: number; // seconds since exam start, 1 decimal
  type: string;
  questionId?: number;
  data?: Record<string, unknown>;
}

// ─── ATTEMPT PAYLOAD ────────────────────────────────────────────────────
export interface QuestionResult {
  questionId: number;
  order: number;
  part: number;
  type: string;
  userAnswer: string | string[];
  correctAnswer: string | string[] | null;
  isCorrect: boolean;
  answered: boolean;
}

export interface AttemptPayload {
  action: 'submitAttempt';
  attempt: {
    attemptId: string;
    studentEmail: string;
    studentName: string;
    studentClass: string;
    quizId: number;
    quizTitle: string;
    skill: 'reading' | 'listening';
    mode: 'normal';
    startedAt: string;
    submittedAt: string;
    durationSec: number;
    fullTestKey?: string;
    band?: number;
    score: { total: number; correct: number; wrong: number; skipped: number };
    ip: string;
    userAgent: string;
  };
  answers: QuestionResult[];
  events: TrackingEvent[];
}

// ─── EVENT BUFFER ────────────────────────────────────────────────────────
export class EventBuffer {
  private _events: TrackingEvent[] = [];
  readonly startMs: number;

  constructor() {
    this.startMs = Date.now();
  }

  push(type: string, questionId?: number, data?: Record<string, unknown>): void {
    const ts = Math.round((Date.now() - this.startMs) / 100) / 10;
    this._events.push({
      ts,
      type,
      ...(questionId != null ? { questionId } : {}),
      ...(data ? { data } : {}),
    });
  }

  drain(): TrackingEvent[] {
    return [...this._events];
  }

  get startedAt(): string {
    return new Date(this.startMs).toISOString();
  }
}

// ─── IP FETCH ────────────────────────────────────────────────────────────
async function getIP(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    });
    const j = (await r.json()) as { ip: string };
    return j.ip || '';
  } catch {
    return '';
  }
}

// ─── SUBMIT ──────────────────────────────────────────────────────────────
export async function submitAttempt(payload: AttemptPayload): Promise<void> {
  if (!GAS_URL) {
    console.warn('[tracking] NEXT_PUBLIC_TRACKING_GAS_URL not set, skipping submit');
    return;
  }

  // Fetch IP in parallel (best-effort)
  const ip = await getIP();
  payload.attempt.ip = ip;
  payload.attempt.userAgent = navigator.userAgent.slice(0, 300);

  const body = JSON.stringify(payload);

  try {
    // keepalive: true keeps request alive even after page navigation
    await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // text/plain → no preflight → bypass CORS
      body,
      keepalive: true,
    });
    // Clear any previously saved pending attempt with same id
    localStorage.removeItem(PENDING_PREFIX + payload.attempt.attemptId);
  } catch {
    // Fallback: save to localStorage, retry on next load
    try {
      localStorage.setItem(PENDING_PREFIX + payload.attempt.attemptId, body);
    } catch {
      // localStorage might be full — ignore
    }
  }
}

// ─── RETRY PENDING ───────────────────────────────────────────────────────
export async function retryPendingAttempts(): Promise<void> {
  if (!GAS_URL || typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PENDING_PREFIX));
  for (const key of keys) {
    const body = localStorage.getItem(key);
    if (!body) continue;
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
        keepalive: true,
      });
      localStorage.removeItem(key);
    } catch {
      // keep for next retry
    }
  }
}

// ─── BUILD ATTEMPT PAYLOAD ───────────────────────────────────────────────
// Helper used by both ExamClient + ListeningClient
export function buildAttemptPayload(params: {
  attemptId: string;
  student: StudentInfo;
  quizId: number;
  quizTitle: string;
  skill: 'reading' | 'listening';
  startedAt: string;
  durationSec: number;
  fullTestKey?: string;
  answers: Record<number, string | string[]>;
  parts: Array<{
    questionSets: Array<{
      type: string;
      maxSelections?: number | null;
      questions: Array<{
        id: number;
        order: number;
        type: string;
        correctAnswer?: string | null;
        correctAnswers?: string[] | null;
      }>;
    }>;
  }>;
  events: TrackingEvent[];
}): AttemptPayload {
  const { attemptId, student, quizId, quizTitle, skill, startedAt, durationSec, fullTestKey, answers, parts, events } = params;

  const questionResults: QuestionResult[] = [];
  let correct = 0, wrong = 0, skipped = 0;

  for (const [partIdx, part] of parts.entries()) {
    for (const qs of part.questionSets) {
      for (const q of qs.questions) {
        const userAnswer = answers[q.id];
        const slots = expandQuestion(q, qs.maxSelections);

        for (const slot of slots) {
          const { answered, isCorrect } = scoreSlot(slot, userAnswer);
          if (!answered) skipped++;
          else if (isCorrect) correct++;
          else wrong++;

          questionResults.push({
            questionId: q.id,
            order: slot.order, // virtual order (Q18, Q19 are separate rows)
            part: partIdx + 1,
            type: q.type || qs.type,
            userAnswer: Array.isArray(userAnswer) ? userAnswer : userAnswer || '',
            correctAnswer:
              slot.correctAnswers.length === 1
                ? slot.correctAnswers[0]
                : slot.correctAnswers.length > 1
                ? slot.correctAnswers
                : null,
            isCorrect,
            answered,
          });
        }
      }
    }
  }

  return {
    action: 'submitAttempt',
    attempt: {
      attemptId,
      studentEmail: student.email,
      studentName: student.name,
      studentClass: student.class,
      quizId,
      quizTitle,
      skill,
      mode: 'normal',
      startedAt,
      submittedAt: new Date().toISOString(),
      durationSec,
      ...(fullTestKey ? { fullTestKey, band: getBand(correct, skill) } : {}),
      score: { total: questionResults.length, correct, wrong, skipped },
      ip: '',
      userAgent: '',
    },
    answers: questionResults,
    events,
  };
}
