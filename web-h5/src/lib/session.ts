import { reactive } from 'vue';
import { api, clearToken, getToken, setToken, type Me } from './api';

/** 全局会话（跨页面共享，避免重复请求 /me） */
export const session = reactive<{
  me: Me | null;
  loading: boolean;
  error: string;
}>({ me: null, loading: false, error: '' });

export async function loadMe(force = false): Promise<Me | null> {
  if (!getToken()) {
    session.me = null;
    return null;
  }
  if (session.me && !force) return session.me;
  session.loading = true;
  try {
    session.me = await api.me();
    session.error = '';
  } catch (err) {
    session.me = null;
    session.error = (err as Error).message;
  } finally {
    session.loading = false;
  }
  return session.me;
}

export async function loginBySms(phone: string, code: string): Promise<Me> {
  const res = await api.smsLogin(phone, code);
  setToken(res.tokens.accessToken);
  session.me = res.user;
  return res.user;
}

export async function loginByPassword(account: string, password: string): Promise<Me> {
  const res = await api.passwordLogin(account, password);
  setToken(res.tokens.accessToken);
  session.me = res.user;
  return res.user;
}

export async function logout(): Promise<void> {
  try {
    if (getToken()) await api.logout();
  } catch {
    /* 令牌过期也照样清理本地状态 */
  }
  clearToken();
  session.me = null;
}

export function isGuest(): boolean {
  return !session.me;
}
