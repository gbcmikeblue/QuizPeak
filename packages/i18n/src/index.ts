import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

export type Locale = 'zh-CN' | 'en';
export type Messages = typeof zhCN;

export const LOCALES: Locale[] = ['zh-CN', 'en'];
export const DEFAULT_LOCALE: Locale = 'zh-CN';

export const messages: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  en: en as unknown as Messages,
};

/** 简易取值：t('quiz.start')，支持 {name} 占位符 */
export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, string | number>,
): string {
  const segs = key.split('.');
  let cur: unknown = messages[locale];
  for (const seg of segs) {
    if (typeof cur !== 'object' || cur === null) return key;
    cur = (cur as Record<string, unknown>)[seg];
  }
  if (typeof cur !== 'string') return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
