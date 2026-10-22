export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api';
const TOKEN_KEY = 'quizpeak_admin_token';
const ADMIN_KEY = 'quizpeak_admin_profile';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, admin: unknown): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
}

export function getAdminProfile(): { name?: string; role?: string; username?: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { name?: string; role?: string; username?: string };
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body) {
    throw new Error(body?.message ?? `请求失败（${res.status}）`);
  }
  if (body.code !== 0) throw new Error(body.message);
  return body.data;
}

export async function adminLogin(username: string, password: string) {
  return apiFetch<{
    admin: { id: string; username: string; name: string; role: string };
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
