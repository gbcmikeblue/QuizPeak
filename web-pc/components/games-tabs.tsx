'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const TABS = [
  { href: '/games/wordling', label: 'Wordling 猜词', desc: '3 / 5 / 7 字母 · 6~7 次机会' },
  { href: '/games/hexling', label: 'Hexling 拼词', desc: '16 字母 · 限时拼词' },
];

/** 小游戏二级 tab：Wordling 与 Hexling 各自独立页面 */
export function GamesTabs() {
  const pathname = usePathname();
  const { tt } = useI18n();

  return (
    <div className="mt-6 flex flex-wrap gap-2 border-b border-black/5 pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl border px-4 py-2.5 transition ${
              active ? 'border-brand bg-brand-soft' : 'border-black/10 bg-white hover:bg-black/[0.03]'
            }`}
          >
            <span className={`block text-[13px] font-medium ${active ? 'text-brand' : 'text-[#475467]'}`}>
              {tt(tab.label)}
            </span>
            <span className="mt-0.5 block text-[11px] text-[#98A2B3]">{tt(tab.desc)}</span>
          </Link>
        );
      })}
    </div>
  );
}
