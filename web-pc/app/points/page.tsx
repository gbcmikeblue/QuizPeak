'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  Clapperboard,
  Gift,
  Loader2,
  Star,
  ThumbsUp,
} from 'lucide-react';
import type { PointsSummary } from '@quizpeak/shared';
import { authFetch, getToken } from '@/lib/auth';

interface Tx {
  id: string;
  change: number;
  balanceAfter: number;
  type: string;
  remark: string | null;
  createdAt: string;
}

interface Activity {
  id: string;
  title: string;
  desc: string | null;
  points: number;
  endAt: string;
}

const TX_LABEL: Record<string, string> = {
  REGISTER_BONUS: '新人礼',
  CHECKIN: '每日签到',
  AD_REWARD: '观看广告',
  LIKE_GIVEN: '点赞奖励',
  ACTIVITY: '活动奖励',
  QUIZ_REWARD: '答题奖励',
  QUIZ_ENROLL: '解锁题库',
  CONTEST_ENROLL: '竞赛报名',
  CONTEST_REWARD: '竞赛奖励',
  HINT_COST: '使用提示',
  INVITE_REWARD: '邀请好友',
  ADMIN_ADJUST: '系统调整',
};

export default function PointsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const [s, t, a] = await Promise.all([
      authFetch<PointsSummary>('/points/summary'),
      authFetch<{ list: Tx[] }>('/points/transactions?page=1&pageSize=10'),
      authFetch<Activity[]>('/points/activities'),
    ]);
    setSummary(s);
    setTxs(t.list);
    setActivities(a);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?redirect=%2Fpoints');
      return;
    }
    load().catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  }, [load, router]);

  async function doTask(kind: 'checkin' | 'ad') {
    setBusy(kind);
    setError('');
    try {
      const path = kind === 'checkin' ? '/points/checkin' : '/points/ad-reward';
      const res = await authFetch<{ points: number; balance: number }>(path, {
        method: 'POST',
        body: '{}',
      });
      setToast(`+${res.points} 积分`);
      setTimeout(() => setToast(''), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy('');
    }
  }

  async function claim(id: string) {
    setBusy(id);
    setError('');
    try {
      const res = await authFetch<{ points: number }>(`/points/activities/${id}/claim`, {
        method: 'POST',
        body: '{}',
      });
      setToast(`+${res.points} 积分`);
      setTimeout(() => setToast(''), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '领取失败');
    } finally {
      setBusy('');
    }
  }

  if (!summary) {
    return <main className="container-page py-16 text-sm text-[#667085]">加载中…</main>;
  }

  const checkin = summary.tasks.find((t) => t.type === 'CHECKIN');
  const ad = summary.tasks.find((t) => t.type === 'AD');
  const like = summary.tasks.find((t) => t.type === 'LIKE');

  return (
    <main className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">赚积分</h1>
          <p className="mt-1 text-sm text-[#667085]">积分只用于站内答题与竞赛，不可提现、不可转让</p>
        </div>
        <Link href="/leaderboard" className="btn-outline h-10 px-4 text-[13px]">
          去看排行榜
        </Link>
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card bg-brand p-5 text-white">
          <p className="text-xs opacity-80">当前积分</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Star size={20} className="text-[#FFD666]" /> {summary.balance}
          </p>
          <p className="mt-2 text-xs opacity-80">今日已获得 +{summary.earnedToday}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[#667085]">连续签到</p>
          <p className="mt-1 text-2xl font-semibold">{summary.streakDays} 天</p>
          <p className="mt-2 text-xs text-[#98A2B3]">
            {summary.checkedInToday ? '今日已签到，明天再来' : '签到可得 10 积分起'}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-[#667085]">今日任务</p>
          <p className="mt-1 text-2xl font-semibold">
            {summary.tasks.filter((t) => t.usedToday > 0).length} / {summary.tasks.length}
          </p>
          <p className="mt-2 text-xs text-[#98A2B3]">完成任务可直接获得积分</p>
        </div>
      </section>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarCheck size={16} className="text-brand" /> 每日签到
          </div>
          <p className="mt-2 text-sm text-[#667085]">签到 +{checkin?.points ?? 10} 积分，连续签到每天递增</p>
          <button
            type="button"
            disabled={!checkin?.claimable || busy === 'checkin'}
            onClick={() => doTask('checkin')}
            className="btn-primary mt-4 h-10"
          >
            {busy === 'checkin' ? <Loader2 size={15} className="animate-spin" /> : null}
            {summary.checkedInToday ? '今日已签到' : '签到'}
          </button>
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <Clapperboard size={16} className="text-brand" /> 看广告得积分
          </div>
          <p className="mt-2 text-sm text-[#667085]">
            每次 +{ad?.points ?? 10}，今日剩余 {Math.max((ad?.dailyLimit ?? 5) - (ad?.usedToday ?? 0), 0)} 次
          </p>
          <button
            type="button"
            disabled={!ad?.claimable || busy === 'ad'}
            onClick={() => doTask('ad')}
            className="btn-primary mt-4 h-10"
          >
            {busy === 'ad' ? <Loader2 size={15} className="animate-spin" /> : null}
            {ad?.claimable ? '观看广告' : '今日次数已用完'}
          </button>
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <ThumbsUp size={16} className="text-brand" /> 给上榜选手点赞
          </div>
          <p className="mt-2 text-sm text-[#667085]">
            每次 +{like?.points ?? 5}，今日剩余 {Math.max((like?.dailyLimit ?? 5) - (like?.usedToday ?? 0), 0)} 次
          </p>
          <Link href="/leaderboard" className="btn-outline mt-4 h-10">
            去排行榜点赞
          </Link>
        </div>
      </section>

      {activities.length > 0 ? (
        <section className="card mt-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <Gift size={16} className="text-brand" /> 活动
          </div>
          <div className="mt-3 space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-soft/50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-[#667085]">
                    +{a.points} 积分 · 截止 {new Date(a.endAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => claim(a.id)}
                  className="btn-primary h-9 px-4 text-[13px]"
                >
                  {busy === a.id ? '领取中…' : '领取'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card mt-5">
        <h2 className="text-[15px] font-semibold">积分明细</h2>
        <div className="mt-3 divide-y divide-black/5">
          {txs.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#98A2B3]">还没有积分记录</p>
          ) : (
            txs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{TX_LABEL[tx.type] ?? tx.type}</p>
                  <p className="text-xs text-[#98A2B3]">
                    {new Date(tx.createdAt).toLocaleString('zh-CN')}
                    {tx.remark ? ` · ${tx.remark}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={tx.change > 0 ? 'font-medium text-brand' : 'font-medium text-red-600'}>
                    {tx.change > 0 ? `+${tx.change}` : tx.change}
                  </p>
                  <p className="text-xs text-[#98A2B3]">余额 {tx.balanceAfter}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-[#0B3B27] px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
