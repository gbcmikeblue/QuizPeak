import { cookies, headers } from 'next/headers';
import {
  LOCALE_COOKIE,
  createI18n,
  normalizeLocale,
  pickLocaleFromAcceptLanguage,
  type I18n,
  type Locale,
} from '@quizpeak/i18n';

/**
 * 服务端读取当前语言：
 * 1. cookie（用户手动切换过）
 * 2. Accept-Language（首次访问）
 * 3. 默认 zh-CN
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (fromCookie && normalizeLocale(fromCookie) === fromCookie) return normalizeLocale(fromCookie);

  const header = await headers();
  return pickLocaleFromAcceptLanguage(header.get('accept-language'));
}

/** 服务端组件里直接拿到翻译器：const { tt } = await getI18n() */
export async function getI18n(): Promise<I18n> {
  return createI18n(await getLocale());
}
