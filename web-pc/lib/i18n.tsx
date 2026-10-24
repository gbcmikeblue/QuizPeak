'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createI18n, type I18n, type Locale } from '@quizpeak/i18n';

const I18nContext = createContext<I18n>(createI18n());

/** 客户端语言上下文：locale 由根布局（读 cookie）传入 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [current, setCurrent] = useState<Locale>(locale);

  // 切换语言后 router.refresh() 会带来新的 locale，同步到本地状态
  useEffect(() => {
    setCurrent(locale);
  }, [locale]);

  const value = useMemo(() => createI18n(current), [current]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** 组件内使用：const { tt, t, locale } = useI18n() */
export function useI18n(): I18n {
  return useContext(I18nContext);
}
