'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Star, UserRound } from 'lucide-react';
import { BRAND } from '@quizpeak/shared';
import { authFetch, clearToken, fetchMe, getToken, type Me } from '@/lib/auth';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  // 依赖路由变化重新读取登录态：登录/退出后无需手动刷新页面
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setMe(null);
      setReady(true);
      return;
    }
    let alive = true;
    fetchMe().then((data) => {
      if (!alive) return;
      setMe(data);
      setReady(true);
    });
    authFetch<{ unread: number }>('/notifications?page=1')
      .then((res) => {
        if (alive) setUnread(res.unread);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pathname]);

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
          {NAV.map((item) => {
            // 当前路径命中（含子路由，如 /quizzes/xxx）即高亮
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  active
                    ? 'bg-white font-medium text-brand shadow-[0_1px_2px_rgba(16,24,40,0.06)]'
                    : 'text-[#344054] hover:bg-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/search"
            className="hidden h-9 w-9 place-items-center rounded-full border border-black/5 text-[#475467] transition hover:border-brand/40 hover:text-brand sm:grid"
            title="搜索题库 / 竞赛 / 文章"
          >
            <Search size={16} />
          </Link>
          <Link
            href="/notifications"
            className="relative hidden h-9 w-9 place-items-center rounded-full border border-black/5 text-[#475467] sm:grid"
            title={unread > 0 ? `${unread} 条未读通知` : '通知'}
          >
            <Bell size={16} />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </Link>

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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 px-3 text-[13px] text-[#475467]"
                >
                  <UserRound size={14} />
                  <span className="hidden sm:inline">{me.nickname ?? me.username}</span>
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-11 w-[160px] overflow-hidden rounded-lg border border-black/5 bg-white py-1 text-sm shadow-lg">
                    <Link href="/me" className="block px-3 py-2 hover:bg-black/[0.03]" onClick={() => setMenuOpen(false)}>
                      个人中心
                    </Link>
                    <Link href="/me?tab=settings" className="block px-3 py-2 hover:bg-black/[0.03]" onClick={() => setMenuOpen(false)}>
                      设置
                    </Link>
                    <Link href="/points" className="block px-3 py-2 hover:bg-black/[0.03]" onClick={() => setMenuOpen(false)}>
                      赚积分
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearToken();
                        setMenuOpen(false);
                        setMe(null);
                        router.replace('/');
                        router.refresh();
                      }}
                      className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      退出登录
                    </button>
                  </div>
                ) : null}
              </div>
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
