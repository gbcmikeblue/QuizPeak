export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api';

export interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface QuizCard {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  cover: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationSec: number;
  questionCount: number;
  levelsCount: number;
  enrollFee: number;
  playerCount: number;
  category: { id: string; name: string; nameEn: string | null } | null;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuizLevelInfo {
  id: string;
  levelNo: number;
  questionCount: number;
  passThreshold: number;
}

export interface QuizDetail extends QuizCard {
  description: string | null;
  unlockThreshold: number;
  questionTotal: number;
  levels: QuizLevelInfo[];
}

export interface QuestionOption {
  key: string;
  text: string;
}

export type QuestionTypeCode = 'SINGLE' | 'MULTI' | 'TRUE_FALSE' | 'FILL';

export interface PlayQuestion {
  id: string;
  type: QuestionTypeCode;
  stem: string;
  options: QuestionOption[];
  score: number;
}

export interface PlayData {
  attemptId: string;
  quiz: { id: string; title: string; levelNo: number };
  questionSeconds: number;
  questions: PlayQuestion[];
  answered: Array<{ questionId: string; answer: string[]; isCorrect: boolean; skipped: boolean }>;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string[];
  analysis: string | null;
  score: number;
}

export interface FinishResult {
  attemptId: string;
  score: number;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  rate: number;
  durationSec: number;
  pointsEarned: number;
  xpEarned: number;
  nextLevelUnlocked: boolean;
}

export interface ReviewItem {
  index: number;
  questionId: string;
  stem: string;
  options: QuestionOption[];
  correctAnswer: string[];
  userAnswer: string[];
  isCorrect: boolean;
  skipped: boolean;
  analysis: string;
}

export type ContestStatus = 'UPCOMING' | 'RUNNING' | 'ENDED';

export interface ContestCard {
  id: string;
  title: string;
  cover: string | null;
  description: string | null;
  category: { id: string; name: string } | null;
  startAt: string;
  endAt: string;
  capacity: number;
  entryFee: number;
  prizePool: number;
  questionCount: number;
  durationSec: number;
  enrolledCount: number;
  effectiveStatus: ContestStatus;
}

export interface ContestDetail extends ContestCard {
  questionsCount: number;
  prizes: Array<{ rank: number; points: number; xp: number }>;
}

export interface ContestPlay {
  attemptId: string;
  contest: { id: string; title: string };
  questionSeconds: number;
  endAt: string;
  questions: PlayQuestion[];
  answered: Array<{ questionId: string; answer: string[]; isCorrect: boolean }>;
}

export interface ContestFinish {
  attemptId: string;
  score: number;
  totalScore: number;
  correctCount: number;
  total: number;
  totalTimeSec: number;
  rank: number;
  pointsEarned: number;
  xpEarned: number;
}

export interface ReviewData {
  attempt: {
    id: string;
    score: number;
    totalScore: number;
    correctCount: number;
    wrongCount: number;
    durationSec: number;
    finishedAt: string | null;
  };
  items: ReviewItem[];
}

/** 服务端渲染时的数据获取；接口不可用时返回空结果，避免整站 500 */
export async function fetchQuizzes(params: Record<string, string> = {}): Promise<PageResult<QuizCard>> {
  const query = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${API_BASE}/quizzes${query ? `?${query}` : ''}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as Envelope<PageResult<QuizCard>>;
    return body.data;
  } catch {
    return { list: [], total: 0, page: 1, pageSize: 9 };
  }
}
