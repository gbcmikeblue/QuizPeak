'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createI18n, type I18n, type Locale } from '@quizpeak/i18n';

const I18nContext = createContext<I18n>(createI18n());

/** 后台语言上下文：locale 由根布局（读 cookie）传入 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [current, setCurrent] = useState<Locale>(locale);

  useEffect(() => {
    setCurrent(locale);
  }, [locale]);

  const value = useMemo(() => createI18n(current), [current]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
