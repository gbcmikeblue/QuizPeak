'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, Star, UserRound } from 'lucide-react';
import { BRAND } from '@quizpeak/shared';
import { clearToken, fetchMe, getToken, type Me } from '@/lib/auth';

const NAV = [
  { href: '/quizzes', label: '答题' },
  { href: '/leaderboard', label: '排行榜' },
  { href: '/contests', label: '竞赛' },
  { href: '/articles', label: '文章' },
  { href: '/games', label: '小游戏' },
];

export function SiteHeader() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    fetchMe().then((data) => {
      setMe(data);
      setReady(true);
    });
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5C518] text-sm font-black text-white">
            知
          </span>
          <span className="text-lg font-bold">{BRAND.nameZh}</span>
          <span className="hidden text-xs font-medium text-[#98A2B3] sm:inline">{BRAND.nameEn}</span>
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

          {ready && me ? (
            <>
              <Link
                href="/points"
                className="flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-sm font-medium text-[#0B3B27] transition hover:bg-brand/15"
                title="赚积分"
              >
                <Star size={15} className="text-[#F5A623]" />
                {me.points} <span className="text-xs font-normal text-[#4A6B5C]">积分</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearToken();
                  router.replace('/');
                  router.refresh();
                  setMe(null);
                }}
                className="hidden h-9 items-center gap-1.5 rounded-full border border-black/10 px-3 text-[13px] text-[#475467] sm:flex"
              >
                <UserRound size={14} />
                {me.nickname ?? me.username}
              </button>
            </>
          ) : ready ? (
            <Link href="/login" className="btn-primary h-9 px-4 text-[13px]">
              登录
            </Link>
          ) : (
            <span className="h-9 w-16 animate-pulse rounded-full bg-black/5" />
          )}
        </div>
      </div>
    </header>
  );
}
