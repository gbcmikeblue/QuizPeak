/** 固定头像库：存库格式 `emoji:🦊`，为空则回退到昵称首字母 */
export const AVATAR_PRESETS = [
  '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦉',
  '🐳', '🦄', '🐝', '🌵', '⭐', '🔥', '🚀', '🎯',
];

export const AVATAR_PREFIX = 'emoji:';

export function avatarEmoji(avatar?: string | null): string | null {
  if (!avatar) return null;
  return avatar.startsWith(AVATAR_PREFIX) ? avatar.slice(AVATAR_PREFIX.length) : null;
}

/** 头像可能是 emoji、图片 URL 或空（用首字母） */
export function avatarOf(avatar: string | null | undefined, name: string): { emoji: string | null; url: string | null; letter: string } {
  const emoji = avatarEmoji(avatar);
  const url = !emoji && avatar && /^https?:\/\/|^\//.test(avatar) ? avatar : null;
  return { emoji, url, letter: (name || '?').slice(0, 1).toUpperCase() };
}
