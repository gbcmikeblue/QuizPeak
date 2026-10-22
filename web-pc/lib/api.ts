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
