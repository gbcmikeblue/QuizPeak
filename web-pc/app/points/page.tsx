'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Clapperboard, Gift, Loader2, Star, ThumbsUp } from 'lucide-react';
import type { PointsSummary } from '@quizpeak/shared';
import { authFetch, getToken } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

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
  claimed?: boolean;
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
  const { tt, date } = useI18n();
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState<{ key: string; text: string } | null>(null);

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
    load().catch((e) => setError(e instanceof Error ? e.message : tt('加载失败')));
  }, [load, router, tt]);

  async function doTask(kind: 'checkin' | 'ad') {
    setBusy(kind);
    setError('');
    try {
      const path = kind === 'checkin' ? '/points/checkin' : '/points/ad-reward';
      const res = await authFetch<{ points: number; balance: number }>(path, {
        method: 'POST',
        body: '{}',
      });
      setHint({ key: kind, text: tt('获得 {n} 积分', { n: res.points }) });
      setTimeout(() => setHint(null), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('操作失败'));
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
      setHint({ key: id, text: tt('获得 {n} 积分', { n: res.points }) });
      setTimeout(() => setHint(null), 2200);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('领取失败'));
    } finally {
      setBusy('');
    }
  }

  if (!summary) {
    return <main className="container-page py-16 text-sm text-[#667085]">{tt('加载中…')}</main>;
  }

  const checkin = summary.tasks.find((t) => t.type === 'CHECKIN');
  const ad = summary.tasks.find((t) => t.type === 'AD');
  const like = summary.tasks.find((t) => t.type === 'LIKE');

  return (
    <main className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tt('赚积分')}</h1>
          <p className="mt-1 text-sm text-[#667085]">{tt('积分只用于站内答题与竞赛，不可提现、不可转让')}</p>
        </div>
        <Link href="/leaderboard" className="btn-outline h-10 px-4 text-[13px]">
          {tt('去看排行榜')}
        </Link>
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card bg-brand p-5 text-white">
          <p className="text-xs opacity-80">{tt('当前积分')}</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Star size={20} className="text-[#FFD666]" /> {summary.balance}
          </p>
          <p className="mt-2 text-xs opacity-80">{tt('今日已获得 +{n}', { n: summary.earnedToday })}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[#667085]">{tt('连续签到')}</p>
          <p className="mt-1 text-2xl font-semibold">{tt('{n} 天', { n: summary.streakDays })}</p>
          <p className="mt-2 text-xs text-[#98A2B3]">
            {summary.checkedInToday ? tt('今日已签到，明天再来') : tt('签到可得 10 积分起')}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-[#667085]">{tt('今日任务')}</p>
          <p className="mt-1 text-2xl font-semibold">
            {summary.tasks.filter((t) => t.usedToday > 0).length} / {summary.tasks.length}
          </p>
          <p className="mt-2 text-xs text-[#98A2B3]">{tt('完成任务可直接获得积分')}</p>
        </div>
      </section>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarCheck size={16} className="text-brand" /> {tt('每日签到')}
          </div>
          <p className="mt-2 text-sm text-[#667085]">
            {tt('签到 +{n} 积分，连续签到每天递增', { n: checkin?.points ?? 10 })}
          </p>
          <button
            type="button"
            disabled={!checkin?.claimable || busy === 'checkin'}
            onClick={() => doTask('checkin')}
            className="btn-primary mt-4 h-10"
          >
            {busy === 'checkin' ? <Loader2 size={15} className="animate-spin" /> : null}
            {summary.checkedInToday ? tt('今日已签到') : tt('签到')}
          </button>
          {hint?.key === 'checkin' ? (
            <p className="mt-2 text-center text-xs font-medium text-brand">{hint.text}</p>
          ) : (
            <p className="mt-2 text-center text-xs text-[#98A2B3]">
              {summary.checkedInToday ? tt('明天再来可继续累计连续天数') : tt('签到后立即可得积分')}
            </p>
          )}
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <Clapperboard size={16} className="text-brand" /> {tt('看广告得积分')}
          </div>
          <p className="mt-2 text-sm text-[#667085]">
            {tt('每次 +{n}，今日剩余 {left} 次', {
              n: ad?.points ?? 10,
              left: Math.max((ad?.dailyLimit ?? 5) - (ad?.usedToday ?? 0), 0),
            })}
          </p>
          <button
            type="button"
            disabled={!ad?.claimable || busy === 'ad'}
            onClick={() => doTask('ad')}
            className="btn-primary mt-4 h-10"
          >
            {busy === 'ad' ? <Loader2 size={15} className="animate-spin" /> : null}
            {ad?.claimable ? tt('观看广告') : tt('今日次数已用完')}
          </button>
          {hint?.key === 'ad' ? (
            <p className="mt-2 text-center text-xs font-medium text-brand">{hint.text}</p>
          ) : (
            <p className="mt-2 text-center text-xs text-[#98A2B3]">
              {ad?.claimable ? tt('看完广告后自动到账') : tt('明天 00:00 重置次数')}
            </p>
          )}
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <ThumbsUp size={16} className="text-brand" /> {tt('给上榜选手点赞')}
          </div>
          <p className="mt-2 text-sm text-[#667085]">
            {tt('每次 +{n}，今日剩余 {left} 次', {
              n: like?.points ?? 5,
              left: Math.max((like?.dailyLimit ?? 5) - (like?.usedToday ?? 0), 0),
            })}
          </p>
          <Link href="/leaderboard" className="btn-outline mt-4 h-10">
            {tt('去排行榜点赞')}
          </Link>
        </div>
      </section>

      {activities.length > 0 ? (
        <section className="card mt-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <Gift size={16} className="text-brand" /> {tt('活动')}
          </div>
          <div className="mt-3 space-y-2">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-soft/50 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-[#667085]">
                    {tt('+{n} 积分', { n: a.points })} · {tt('截止 {date}', { date: date(a.endAt) })}
                  </p>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    disabled={busy === a.id || a.claimed}
                    onClick={() => claim(a.id)}
                    className="btn-primary h-9 px-4 text-[13px]"
                  >
                    {a.claimed ? tt('已领取') : busy === a.id ? tt('领取中…') : tt('领取')}
                  </button>
                  {hint?.key === a.id && !a.claimed ? (
                    <p className="mt-1 text-xs font-medium text-brand">{hint.text}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="card mt-5">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <Gift size={16} className="text-brand" /> {tt('活动')}
          </div>
          <p className="py-6 text-center text-sm text-[#98A2B3]">{tt('暂无进行中的活动')}</p>
        </section>
      )}

      <section className="card mt-5">
        <h2 className="text-[15px] font-semibold">{tt('积分明细')}</h2>
        <div className="mt-3 divide-y divide-black/5">
          {txs.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#98A2B3]">{tt('还没有积分记录')}</p>
          ) : (
            txs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{tt(TX_LABEL[tx.type] ?? tx.type)}</p>
                  <p className="text-xs text-[#98A2B3]">
                    {date(tx.createdAt, true)}
                    {tx.remark ? ` · ${tx.remark}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={tx.change > 0 ? 'font-medium text-brand' : 'font-medium text-red-600'}>
                    {tx.change > 0 ? `+${tx.change}` : tx.change}
                  </p>
                  <p className="text-xs text-[#98A2B3]">{tt('余额 {n}', { n: tx.balanceAfter })}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
