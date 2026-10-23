'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Loader2, Star, ThumbsUp } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { avatarOf } from '@/lib/avatars';
import { authFetch, fetchMe, getToken, type Me } from '@/lib/auth';

type Period = 'all' | 'month';

interface Row {
  userId: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
  points: number;
  likesReceived: number;
  quizzes: number;
  avgRate: number;
  metric: number;
  rank: number;
}

interface ListData {
  list: Row[];
  total: number;
  page: number;
  pageSize: number;
  period: Period;
}

interface MyRank {
  all: { rank: number; metric: number; total: number } | null;
  month: { rank: number | null; metric: number; total: number } | null;
}

function Avatar({ row, size = 40 }: { row: Row; size?: number }) {
  // 头像可能是 emoji:🦊 / 图片 URL / 空（首字母）
  const { emoji, url, letter } = avatarOf(row.avatar, row.nickname ?? row.username);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" />
    );
  }

  return (
    <span
      className="grid place-items-center rounded-full bg-brand-soft font-semibold text-[#0B3B27]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
    >
      {emoji ?? letter}
    </span>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [data, setData] = useState<ListData | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/leaderboard?period=${period}&page=1&pageSize=20`);
      const json = await res.json();
      setData(json.data);
    } catch {
      setError('排行榜加载失败');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!getToken()) return;
    fetchMe().then(setMe);
    authFetch<MyRank>('/leaderboard/me').then(setMyRank).catch(() => undefined);
  }, []);

  async function like(row: Row) {
    if (!getToken()) {
      window.location.href = '/login?redirect=%2Fleaderboard';
      return;
    }
    setLiking(row.userId);
    setError('');
    try {
      const res = await authFetch<{ points: number; balance: number }>('/points/like', {
        method: 'POST',
        body: JSON.stringify({ toUserId: row.userId, targetType: period === 'month' ? 'LEADERBOARD_MONTH' : 'LEADERBOARD_ALL' }),
      });
      setToast(`+${res.points} 积分`);
      setTimeout(() => setToast(''), 2000);
      setData((prev) =>
        prev
          ? {
              ...prev,
              list: prev.list.map((r) =>
                r.userId === row.userId ? { ...r, likesReceived: r.likesReceived + 1 } : r,
              ),
            }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '点赞失败');
    } finally {
      setLiking('');
    }
  }

  const list = data?.list ?? [];
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  const metricLabel = period === 'all' ? '累计 XP' : '本月积分';

  return (
    <main className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">积分榜</h1>
          <p className="mt-1 text-sm text-[#667085]">给上榜选手点赞，每次 +5 积分（每日 5 次）</p>
        </div>
        <div className="flex rounded-lg bg-[#F2F5F3] p-1 text-sm">
          {(
            [
              { key: 'all', label: '总榜' },
              { key: 'month', label: '月榜' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className={
                period === tab.key
                  ? 'rounded-md bg-white px-4 py-1.5 font-medium text-brand shadow-sm'
                  : 'rounded-md px-4 py-1.5 text-[#667085]'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      {me && myRank ? (
        <p className="mt-4 text-sm text-[#667085]">
          我的{period === 'all' ? '总榜' : '月榜'}排名：
          <span className="ml-1 font-semibold text-brand">
            {period === 'all'
              ? `第 ${myRank.all?.rank ?? '—'} 名 / ${myRank.all?.total ?? 0}`
              : myRank.month?.rank
                ? `第 ${myRank.month.rank} 名 / ${myRank.month.total}`
                : '本月暂无积分'}
          </span>
        </p>
      ) : null}

      {loading && list.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#667085]">加载中…</p>
      ) : list.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-soft text-4xl">🏅</div>
          <p className="mt-5 text-lg font-semibold">榜单还没有人</p>
          <p className="mt-1 text-sm text-[#667085]">完成一次答题就会进入排行榜</p>
          <Link href="/quizzes" className="btn-primary mt-5 h-10 px-5 text-[13px]">
            去答题
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            {top3.map((row) => (
              <div
                key={row.userId}
                className={`card relative text-center ${row.rank === 1 ? 'ring-1 ring-[#F5C518]' : ''}`}
              >
                <span className="absolute right-3 top-3 text-xs font-semibold text-[#98A2B3]">#{row.rank}</span>
                <div className="flex justify-center">
                  <Crown size={18} className={row.rank === 1 ? 'text-[#F5C518]' : 'text-[#C9CDD3]'} />
                </div>
                <div className="mt-2 flex justify-center">
                  <Avatar row={row} size={52} />
                </div>
                <p className="mt-2 truncate font-medium">{row.nickname ?? row.username}</p>
                <p className="mt-1 text-xs text-[#667085]">
                  {row.quizzes} 场 · 平均 {row.avgRate}%
                </p>
                <p className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-[#8A6A1F]">
                  <Star size={13} className="text-[#F5A623]" /> {row.metric} {metricLabel}
                </p>
                <button
                  type="button"
                  onClick={() => like(row)}
                  disabled={liking === row.userId || me?.id === row.userId}
                  className="btn-outline mt-3 h-8 w-full text-[12px]"
                >
                  {liking === row.userId ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                  {me?.id === row.userId ? '这是你自己' : `点赞 ${row.likesReceived}`}
                </button>
              </div>
            ))}
          </section>

          <section className="card mt-5 overflow-hidden p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-16">排名</th>
                  <th>选手</th>
                  <th>战绩</th>
                  <th>{metricLabel}</th>
                  <th className="w-28">点赞</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((row) => (
                  <tr key={row.userId}>
                    <td className="font-semibold text-[#667085]">{row.rank}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar row={row} size={30} />
                        <span className="font-medium">{row.nickname ?? row.username}</span>
                      </div>
                    </td>
                    <td className="text-xs text-[#667085]">
                      {row.quizzes} 场 · 平均 {row.avgRate}%
                    </td>
                    <td className="font-medium text-[#8A6A1F]">{row.metric}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => like(row)}
                        disabled={liking === row.userId || me?.id === row.userId}
                        className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs text-brand disabled:opacity-50"
                      >
                        {liking === row.userId ? <Loader2 size={11} className="animate-spin" /> : <ThumbsUp size={11} />}
                        {row.likesReceived}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {toast ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-[#0B3B27] px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
