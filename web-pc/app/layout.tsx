import type { Metadata } from 'next';
import Link from 'next/link';
import { Bell, Search, Star } from 'lucide-react';
import { BRAND } from '@quizpeak/shared';
import './globals.css';

export const metadata: Metadata = {
  title: `${BRAND.nameZh} ${BRAND.nameEn} · 答题登顶`,
  description: '答题闯关、竞赛上榜，用积分赢取站内权益。',
};

const NAV = [
  { href: '/quizzes', label: '答题' },
  { href: '/contests', label: '竞赛' },
  { href: '/articles', label: '文章' },
  { href: '/games', label: '小游戏' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
          <div className="container-page flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5C518] text-sm font-black text-white">
                知
              </span>
              <span className="text-lg font-bold">{BRAND.nameZh}</span>
              <span className="hidden text-xs font-medium text-[#98A2B3] sm:inline">
                {BRAND.nameEn}
              </span>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full bg-brand-soft px-2 py-1.5 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-1.5 text-sm text-[#344054] transition hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2.5">
              <button className="hidden h-9 w-9 place-items-center rounded-full border border-black/5 text-[#475467] sm:grid">
                <Search size={16} />
              </button>
              <button className="hidden h-9 w-9 place-items-center rounded-full border border-black/5 text-[#475467] sm:grid">
                <Bell size={16} />
              </button>
              <span className="flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-sm font-medium text-[#0B3B27]">
                <Star size={15} className="text-[#F5A623]" />
                0 <span className="text-xs font-normal text-[#4A6B5C]">积分</span>
              </span>
              <Link href="/login" className="btn-primary h-9 px-4 text-[13px]">
                登录
              </Link>
            </div>
          </div>
        </header>

        {children}

        <footer className="mt-16 border-t border-black/5 bg-[#FAFBFA] py-10">
          <div className="container-page flex flex-col justify-between gap-4 text-sm text-[#667085] md:flex-row">
            <p>© 2026 知巅. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/about-us">关于我们</Link>
              <Link href="/contact">联系我们</Link>
              <Link href="/privacy-policy">隐私政策</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
