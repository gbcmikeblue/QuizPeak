'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Languages } from 'lucide-react';
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, type Locale } from '@quizpeak/i18n';
import { useI18n } from '@/lib/i18n';

/** 后台顶栏语言切换 */
export function LanguageSwitch() {
  const router = useRouter();
  const { locale, tt } = useI18n();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function change(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = next === 'en' ? 'en-US' : 'zh-CN';
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={tt('语言')}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 text-[13px] text-[#475467] transition hover:border-brand/40 hover:text-brand"
      >
        <Languages size={14} />
        {locale === 'en' ? 'EN' : '中文'}
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-[148px] overflow-hidden rounded-xl border border-black/5 bg-white py-1 shadow-lg"
        >
          {LOCALES.map((item) => {
            const active = item === locale;
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => change(item)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition hover:bg-brand-soft/60 ${
                  active ? 'font-medium text-brand' : 'text-[#475467]'
                }`}
              >
                {LOCALE_LABELS[item]}
                {active ? <Check size={14} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
