import { API_BASE } from './api';

const TOKEN_KEY = 'quizpeak_token';

export interface Me {
  id: string;
  phone: string;
  email: string | null;
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

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => null)) as
    | { code: number; message: string; data: T }
    | null;

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    throw new ApiError(body?.message ?? '请先登录', 401);
  }
  if (!res.ok || !body) throw new ApiError(body?.message ?? `请求失败（${res.status}）`, res.status);
  if (body.code !== 0) throw new ApiError(body.message, res.status);
  return body.data;
}

export async function fetchMe(): Promise<Me | null> {
  if (!getToken()) return null;
  try {
    return await authFetch<Me>('/me');
  } catch {
    return null;
  }
}
