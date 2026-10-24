import { cookies, headers } from 'next/headers';
import {
  LOCALE_COOKIE,
  createI18n,
  normalizeLocale,
  pickLocaleFromAcceptLanguage,
  type I18n,
  type Locale,
} from '@quizpeak/i18n';

/** 服务端读取后台当前语言（cookie 优先，其次 Accept-Language） */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (fromCookie) return normalizeLocale(fromCookie);

  const header = await headers();
  return pickLocaleFromAcceptLanguage(header.get('accept-language'));
}

export async function getI18n(): Promise<I18n> {
  return createI18n(await getLocale());
}
