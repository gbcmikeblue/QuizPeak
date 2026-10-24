import type { Difficulty } from './api';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: '入门',
  INTERMEDIATE: '进阶',
  ADVANCED: '高手',
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  BEGINNER: '#2E9E5B',
  INTERMEDIATE: '#2F6FE0',
  ADVANCED: '#E5484D',
};

export function difficultyLabel(d: Difficulty): string {
  return DIFFICULTY_LABEL[d] ?? d;
}

export function difficultyColor(d: Difficulty): string {
  return DIFFICULTY_COLOR[d] ?? '#667085';
}

/** 秒 → 分:秒 */
export function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function maskPhone(phone: string): string {
  return phone ? phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '';
}

export function dateText(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function avatarText(name: string | null | undefined): string {
  return (name || '知').trim().slice(0, 1).toUpperCase();
}

/** 头像兼容 emoji 与图片 URL */
export function isImageAvatar(avatar: string | null | undefined): boolean {
  return Boolean(avatar && /^(https?:)?\/|^\/|^data:image/.test(avatar));
}
