'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import { SearchBox } from '@/components/search-box';

interface Quiz {
  id: string;
  title: string;
  levelsCount: number;
  enrollFee: number;
  playerCount: number;
}
interface Contest {
  id: string;
  title: string;
  startAt: string;
  entryFee: number;
}
interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
}

interface Result {
  keyword: string;
  quizzes: Quiz[];
  contests: Contest[];
  articles: Article[];
  total: number;
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  // 从地址栏读取关键词（避免 useSearchParams 触发 Suspense 要求）
  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get('q') ?? '');
  }, []);

  const load = useCallback(async () => {
    if (!q.trim()) {
      setData({ keyword: '', quizzes: [], contests: [], articles: [], total: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      setData((await res.json()).data as Result);
    } catch {
      setData({ keyword: q, quizzes: [], contests: [], articles: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="container-page py-10">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-brand">SEARCH</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">搜索</h1>
          {q ? <span className="text-sm text-[#667085]">「{q}」共 {data?.total ?? 0} 条结果</span> : null}
        </div>
        <SearchBox />
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-[#667085]">搜索中…</p>
      ) : !q ? (
        <p className="py-16 text-center text-sm text-[#98A2B3]">输入关键词开始搜索，支持题库、竞赛与文章</p>
      ) : data && data.total === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold">没有找到「{q}」</p>
          <p className="mt-1 text-sm text-[#667085]">换个关键词试试，或直接去题库逛逛</p>
          <Link href="/quizzes" className="btn-primary mt-4 h-9 px-4 text-[13px]">
            浏览全部题库
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {data && data.quizzes.length > 0 ? (
            <section>
              <h2 className="text-[15px] font-semibold">题库（{data.quizzes.length}）</h2>
              <div className="mt-3 grid gap-3">
                {data.quizzes.map((item) => (
                  <Link
                    key={item.id}
                    href={`/quizzes/${item.id}`}
                    className="card flex items-center justify-between gap-3 py-3.5 transition hover:border-brand/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[#98A2B3]">
                        {item.levelsCount} 关 · {item.enrollFee > 0 ? `${item.enrollFee} 积分解锁` : '免费'} · {item.playerCount} 人参与
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] text-brand">去答题 →</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {data && data.contests.length > 0 ? (
            <section>
              <h2 className="text-[15px] font-semibold">竞赛（{data.contests.length}）</h2>
              <div className="mt-3 grid gap-3">
                {data.contests.map((item) => (
                  <Link
                    key={item.id}
                    href={`/contests/${item.id}`}
                    className="card flex items-center justify-between gap-3 py-3.5 transition hover:border-brand/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[#98A2B3]">
                        {new Date(item.startAt).toLocaleDateString('zh-CN')} 开赛 ·{' '}
                        {item.entryFee > 0 ? `${item.entryFee} 积分报名` : '免费报名'}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] text-brand">查看 →</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {data && data.articles.length > 0 ? (
            <section>
              <h2 className="text-[15px] font-semibold">文章（{data.articles.length}）</h2>
              <div className="mt-3 grid gap-3">
                {data.articles.map((item) => (
                  <Link
                    key={item.id}
                    href={`/articles/${item.slug}`}
                    className="card block py-3.5 transition hover:border-brand/40"
                  >
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.summary ? <p className="mt-0.5 line-clamp-1 text-xs text-[#98A2B3]">{item.summary}</p> : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
