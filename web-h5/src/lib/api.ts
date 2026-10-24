/**
 * H5 网络层：与 web-pc 共用同一套接口约定（{ code, message, data } 信封）
 * - 开发环境走 Vite 代理 /api → http://localhost:8080，生产由 Nginx 同域转发
 * - 令牌存在本地存储，401 自动清理并跳登录
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE || '/api';

/** 当前端标识：多端登录与短信验证码频控按端隔离 */
export const CLIENT = 'H5';

const TOKEN_KEY = 'quizpeak_h5_token';
const LOGIN_PAGE = '/pages/login/index';

export interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string {
  try {
    return (uni.getStorageSync(TOKEN_KEY) as string) || '';
  } catch {
    return '';
  }
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token);
}

export function clearToken(): void {
  uni.removeStorageSync(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

/** 跳登录页（带回来地址），已登录则直接返回 */
export function requireLogin(): boolean {
  if (isLoggedIn()) return true;
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { route?: string } | undefined;
  const redirect = current?.route ? `/${current.route}` : '';
  uni.navigateTo({ url: `${LOGIN_PAGE}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}` });
  return false;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

interface RequestOptions {
  method?: Method;
  data?: Record<string, unknown>;
  /** 静默模式：401 不跳登录（首页等公共页用） */
  silent?: boolean;
}

export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${path}`,
      method: options.method ?? 'GET',
      data: options.data,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        const status = res.statusCode;
        const body = res.data as Envelope<T> | null;
        if (status === 401) {
          clearToken();
          if (!options.silent) {
            const pages = getCurrentPages();
            const current = pages[pages.length - 1] as { route?: string } | undefined;
            if (current?.route !== 'pages/login/index') {
              uni.navigateTo({
                url: `${LOGIN_PAGE}?redirect=${encodeURIComponent(`/${current?.route ?? ''}`)}`,
              });
            }
          }
          reject(new ApiError(body?.message ?? '请先登录', 401));
          return;
        }
        if (!body || status < 200 || status >= 300) {
          reject(new ApiError(body?.message ?? `请求失败（${status}）`, status));
          return;
        }
        if (body.code !== 0) {
          reject(new ApiError(body.message || '请求失败', status));
          return;
        }
        resolve(body.data);
      },
      fail: (err) => {
        reject(new ApiError(err.errMsg || '网络异常，请稍后再试', 0));
      },
    });
  });
}

/* ---------------------------------- 类型 ---------------------------------- */

export interface Me {
  id: string;
  phone: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  points: number;
  totalEarned: number;
  likesReceived: number;
  xp: number;
  level: number;
  streakDays: number;
  inviteCode: string;
  createdAt: string;
}

export interface AuthResult {
  user: Me;
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface QuizCard {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  cover: string | null;
  difficulty: Difficulty;
  durationSec: number;
  questionCount: number;
  levelsCount: number;
  enrollFee: number;
  playerCount: number;
  category: { id: string; name: string; nameEn: string | null } | null;
}

export interface QuizLevel {
  id: string;
  levelNo: number;
  questionCount: number;
  passThreshold: number;
}

export interface QuizDetail extends QuizCard {
  description: string | null;
  unlockThreshold: number;
  questionTotal: number;
  levels: QuizLevel[];
}

export interface LevelProgress {
  levelNo: number;
  questionCount: number;
  passThreshold: number;
  unlocked: boolean;
  best: { rate: number; score: number; totalScore: number; attemptId: string };
}

export interface QuizProgress {
  quiz: { id: string; title: string; enrollFee: number; levelsCount: number };
  enrolled: boolean;
  expiresAt: string | null;
  levels: LevelProgress[];
}

export interface PlayQuestion {
  id: string;
  type: 'SINGLE' | 'MULTI' | 'TRUE_FALSE' | 'FILL';
  stem: string;
  options: { key: string; text: string }[];
  score: number;
}

export interface PlayData {
  attemptId: string;
  quiz: { id: string; title: string; levelNo: number };
  questionSeconds: number;
  questions: PlayQuestion[];
  answered: { questionId: string; answer: string[]; isCorrect: boolean; skipped: boolean }[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string[];
  analysis: string | null;
  score: number;
}

export interface HintResult {
  hint: string;
  free: boolean;
  cost: number;
}

export interface ReviewItem {
  index: number;
  questionId: string;
  stem: string;
  options: { key: string; text: string }[];
  correctAnswer: string[];
  userAnswer: string[];
  isCorrect: boolean;
  skipped: boolean;
  analysis: string;
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

export interface LeaderRow {
  userId: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
  points: number;
  likesReceived: number;
  quizzes: number;
  avgRate: number;
  metric: number;
  rank: number;
}

export interface LeaderboardPage extends PageResult<LeaderRow> {
  period: 'all' | 'month';
}

export interface MyRank {
  all: { rank: number; metric: number; total: number } | null;
  month: { rank: number | null; metric: number; total: number } | null;
}

export interface PointTask {
  type: 'CHECKIN' | 'AD' | 'LIKE' | 'ACTIVITY';
  titleZh: string;
  points: number;
  dailyLimit: number;
  usedToday: number;
  claimable: boolean;
}

export interface PointsSummary {
  balance: number;
  earnedToday: number;
  checkedInToday: boolean;
  streakDays: number;
  tasks: PointTask[];
}

export interface PointTx {
  id: string;
  change: number;
  type: string;
  remark: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  titleEn: string | null;
  desc: string | null;
  points: number;
  startAt: string;
  endAt: string;
  claimed: boolean;
}

export interface AttemptHistoryItem {
  id: string;
  quiz?: { title: string } | null;
  contest?: { title: string } | null;
  score: number;
  totalScore: number;
  finishedAt: string | null;
}

/* ---------------------------------- 接口 ---------------------------------- */

export const api = {
  /* 认证（client: 'H5' → 与 PC 端的验证码频控互不相干） */
  sendSmsCode: (phone: string, scene: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD' = 'LOGIN') =>
    request<{ ttl: number; devCode?: string; client: string }>('/auth/sms-code', {
      method: 'POST',
      data: { phone, scene, client: CLIENT },
    }),
  smsLogin: (phone: string, code: string) =>
    request<AuthResult>('/auth/login/sms', {
      method: 'POST',
      data: { phone, code, client: CLIENT },
    }),
  passwordLogin: (account: string, password: string) =>
    request<AuthResult>('/auth/login/password', {
      method: 'POST',
      data: { account, password, client: CLIENT },
    }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  /* 我 */
  me: () => request<Me>('/me'),
  favorites: (type: 'quiz' | 'contest' = 'quiz') =>
    request<Array<Record<string, unknown>>>(`/me/favorites?type=${type}`),
  favoriteCheck: (targetId: string, targetType: 'QUIZ' | 'CONTEST' = 'QUIZ') =>
    request<{ favorited: boolean }>(
      `/me/favorites/check?targetType=${targetType}&targetId=${targetId}`,
    ),
  toggleFavorite: (targetId: string, targetType: 'QUIZ' | 'CONTEST' = 'QUIZ') =>
    request<{ favorited: boolean }>('/me/favorites/toggle', {
      method: 'POST',
      data: { targetType, targetId },
    }),
  myRank: () => request<MyRank>('/leaderboard/me'),
  history: (type: 'quiz' | 'contest' = 'quiz', page = 1, pageSize = 10) =>
    request<PageResult<AttemptHistoryItem>>(
      `/me/history?type=${type}&page=${page}&pageSize=${pageSize}`,
    ),

  /* 题库 */
  quizzes: (params: { page?: number; pageSize?: number; keyword?: string; difficulty?: string } = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return request<PageResult<QuizCard>>(`/quizzes${query ? `?${query}` : ''}`);
  },
  quiz: (id: string) => request<QuizDetail>(`/quizzes/${id}`),
  quizProgress: (id: string) => request<QuizProgress>(`/quizzes/${id}/progress`),
  enroll: (id: string) =>
    request<{ enrolled: boolean; replayed?: boolean; expiresAt: string }>(`/quizzes/${id}/enroll`, {
      method: 'POST',
    }),

  /* 答题 */
  startAttempt: (quizId: string, levelNo: number) =>
    request<PlayData>(`/quizzes/${quizId}/levels/${levelNo}/attempt`, { method: 'POST' }),
  answer: (attemptId: string, questionId: string, answer: string[], usedSec?: number) =>
    request<AnswerResult>(`/attempts/${attemptId}/answer`, {
      method: 'POST',
      data: { questionId, answer, usedSec },
    }),
  skip: (attemptId: string, questionId: string) =>
    request<{ skipped: boolean }>(`/attempts/${attemptId}/skip`, {
      method: 'POST',
      data: { questionId },
    }),
  finishAttempt: (attemptId: string) =>
    request<FinishResult>(`/attempts/${attemptId}/finish`, { method: 'POST' }),
  hint: (attemptId: string, questionId: string) =>
    request<HintResult>(`/attempts/${attemptId}/hint`, {
      method: 'POST',
      data: { questionId },
    }),
  review: (attemptId: string) => request<ReviewData>(`/attempts/${attemptId}/review`),

  /* 排行榜 */
  leaderboard: (period: 'all' | 'month', page = 1, pageSize = 20) =>
    request<LeaderboardPage>(`/leaderboard?period=${period}&page=${page}&pageSize=${pageSize}`),
  like: (toUserId: string, period: 'all' | 'month') =>
    request<{ points: number; likesReceived: number; balance: number }>('/points/like', {
      method: 'POST',
      data: {
        toUserId,
        targetType: period === 'month' ? 'LEADERBOARD_MONTH' : 'LEADERBOARD_ALL',
      },
    }),

  /* 积分 */
  pointsSummary: () => request<PointsSummary>('/points/summary'),
  pointTx: (page = 1, pageSize = 10) =>
    request<PageResult<PointTx>>(`/points/transactions?page=${page}&pageSize=${pageSize}`),
  activities: () => request<ActivityItem[]>('/points/activities'),
  checkin: () => request<{ points: number; streakDay: number; balance: number }>('/points/checkin', {
    method: 'POST',
  }),
  adReward: () => request<{ points: number; balance: number; usedToday: number }>('/points/ad-reward', {
    method: 'POST',
  }),
  claimActivity: (id: string) =>
    request<{ points: number; balance: number }>(`/points/activities/${id}/claim`, { method: 'POST' }),
};
