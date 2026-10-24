import { zhCN } from './locales/zh-CN';
import { en } from './locales/en';
import { enPhrases } from './phrases/en';

export type Locale = 'zh-CN' | 'en';

/** 把 as const 的字面量类型放宽成 string，保证其它语言可以填任意译文 */
type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

/** 词条结构以中文词表为准，其它语言必须同构 */
export type Messages = DeepString<typeof zhCN>;

export const LOCALES: Locale[] = ['zh-CN', 'en'];
export const DEFAULT_LOCALE: Locale = 'zh-CN';
export const LOCALE_COOKIE = 'qp_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '简体中文',
  en: 'English',
};

/** 语言切换器里的简称（用于顶栏按钮） */
export const LOCALE_SHORT: Record<Locale, string> = {
  'zh-CN': '中',
  en: 'EN',
};

export const messages: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  en,
};

export const phrases: Record<Locale, Record<string, string>> = {
  'zh-CN': {},
  en: enPhrases,
};

type Vars = Record<string, string | number>;

export function isLocale(value: unknown): value is Locale {
  return value === 'zh-CN' || value === 'en';
}

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  const lower = String(value).toLowerCase();
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('zh')) return 'zh-CN';
  return DEFAULT_LOCALE;
}

/** 从 Accept-Language 里挑一个支持的语言 */
export function pickLocaleFromAcceptLanguage(header?: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: (tag ?? '').trim(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    if (tag.toLowerCase().startsWith('en')) return 'en';
    if (tag.toLowerCase().startsWith('zh')) return 'zh-CN';
  }
  return DEFAULT_LOCALE;
}

export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    vars[key] === undefined ? whole : String(vars[key]),
  );
}

function readPath(source: unknown, key: string): unknown {
  let cur: unknown = source;
  for (const seg of key.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** key 模式：t('quiz.start') */
export function t(key: string, locale: Locale = DEFAULT_LOCALE, vars?: Vars): string {
  const hit = readPath(messages[locale], key) ?? readPath(messages[DEFAULT_LOCALE], key);
  if (typeof hit !== 'string') return key;
  return interpolate(hit, vars);
}

/**
 * 源文案模式：tt('开始答题')
 * - 中文环境直接返回原文（支持 {n} 插值）
 * - 英文环境查 enPhrases，缺词条时回退原文，不会把 key 暴露给用户
 */
export function tt(source: string, locale: Locale = DEFAULT_LOCALE, vars?: Vars): string {
  const text = locale === DEFAULT_LOCALE ? source : (phrases[locale][source] ?? source);
  return interpolate(text, vars);
}

export interface I18n {
  locale: Locale;
  isEn: boolean;
  /** key 模式 */
  t: (key: string, vars?: Vars) => string;
  /** 源文案模式 */
  tt: (source: string, vars?: Vars) => string;
  /** 数字：1200 → 1,200 */
  number: (value: number) => string;
  /** 日期：2026-10-24 10:30 */
  date: (value: string | number | Date | null | undefined, withTime?: boolean) => string;
  /** 相对时间是否可用的语言标签 */
  htmlLang: string;
}

export function createI18n(locale: Locale = DEFAULT_LOCALE): I18n {
  const tag = locale === 'en' ? 'en-US' : 'zh-CN';
  return {
    locale,
    isEn: locale === 'en',
    htmlLang: tag,
    t: (key, vars) => t(key, locale, vars),
    tt: (source, vars) => tt(source, locale, vars),
    number: (value) => new Intl.NumberFormat(tag).format(value),
    date: (value, withTime = false) => {
      if (value === null || value === undefined || value === '') return '—';
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return '—';
      return withTime
        ? new Intl.DateTimeFormat(tag, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(d)
        : new Intl.DateTimeFormat(tag, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    },
  };
}

export { enPhrases };
