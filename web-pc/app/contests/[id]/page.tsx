'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CalendarDays, Coins, Loader2, Trophy, Users } from 'lucide-react';
import { ShareButton } from '@/components/share-button';
import { API_BASE, type ContestDetail } from '@/lib/api';
import { authFetch, fetchMe, getToken, type Me } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

interface MyState {
  enrolled: boolean;
  attempt: {
    id: string;
    status: string;
    score: number;
    totalScore: number;
    rank: number | null;
    totalTimeSec: number;
  } | null;
}

interface LeaderRow {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  totalScore: number;
  timeSec: number;
}

const STATUS: Record<string, { text: string; cls: string }> = {
  RUNNING: { text: '进行中', cls: 'bg-brand-soft text-brand' },
  UPCOMING: { text: '未开始', cls: 'bg-[#FFF7E6] text-[#B7791F]' },
  ENDED: { text: '已结束', cls: 'bg-[#F2F4F7] text-[#667085]' },
};

function mmss(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tt, date } = useI18n();
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [my, setMy] = useState<MyState | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [tab, setTab] = useState<'overview' | 'leaderboard' | 'prizes'>('overview');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`${API_BASE}/contests/${id}`);
    const json = await res.json();
    setContest(json.data);
    const lb = await fetch(`${API_BASE}/contests/${id}/leaderboard?page=1&pageSize=20`);
    setBoard((await lb.json()).data.list);
    if (getToken()) {
      setMy(await authFetch<MyState>(`/contests/${id}/my`).catch(() => null));
      setMe(await fetchMe());
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => setError(tt('竞赛加载失败')));
  }, [load, tt]);

  async function enroll() {
    setBusy('enroll');
    setError('');
    try {
      await authFetch(`/contests/${id}/enroll`, { method: 'POST', body: '{}' });
      setConfirm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('报名失败'));
    } finally {
      setBusy('');
    }
  }

  function requireLogin(action: () => void) {
    if (!getToken()) {
      router.push(`/login?redirect=${encodeURIComponent(`/contests/${id}`)}`);
      return;
    }
    action();
  }

  if (!contest) {
    return (
      <main className="container-page py-16 text-sm text-[#667085]">{error || tt('加载中…')}</main>
    );
  }

  const s = STATUS[contest.effectiveStatus] ?? STATUS.UPCOMING;
  const attempt = my?.attempt;
  const finished = attempt?.status === 'FINISHED';

  return (
    <main className="container-page py-8">
      <Link href="/contests" className="text-sm text-[#667085] hover:text-brand">
        ← {tt('返回竞赛')}
      </Link>

      <section className="mt-4 overflow-hidden rounded-card border border-black/5">
        <div className="relative h-[200px] bg-brand-soft">
          {contest.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contest.cover} alt={contest.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-6xl">🏆</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5 text-white">
            <span className={`rounded-full px-2.5 py-1 text-[11px] ${s.cls}`}>{tt(s.text)}</span>
            <h1 className="mt-2 text-2xl font-bold">{contest.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Users size={13} />{' '}
                {tt('{n}/{total} 已报名', {
                  n: contest.enrolledCount,
                  total: contest.capacity,
                })}
              </span>
              <span>
                {tt('{n} 题', { n: contest.questionCount })} ·{' '}
                {tt('{n} 分钟', { n: Math.round(contest.durationSec / 60) })}
              </span>
              <span className="flex items-center gap-1">
                <Trophy size={13} className="text-[#F5A623]" /> {tt('奖池 {n}', { n: contest.prizePool })}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="flex gap-1 border-b border-black/5 text-sm">
            {(
              [
                { key: 'overview', label: '概览' },
                { key: 'leaderboard', label: '排行榜' },
                { key: 'prizes', label: '奖品' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? 'border-b-2 border-brand px-4 py-2.5 font-medium text-brand'
                    : 'px-4 py-2.5 text-[#667085]'
                }
              >
                {tt(t.label)}
              </button>
            ))}
          </div>

          <div className="card mt-4">
            {tab === 'overview' ? (
              <>
                <h2 className="text-[15px] font-semibold">{tt('竞赛说明')}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#475467]">
                  {contest.description ?? tt('暂无说明')}
                </p>
                <p className="mt-3 text-xs text-[#98A2B3]">
                  {tt(
                    '每题限时 120 秒；按得分排名，得分相同按用时更短者优先；前三名获得积分与 XP。',
                  )}
                </p>
              </>
            ) : null}

            {tab === 'leaderboard' ? (
              <>
                <h2 className="text-[15px] font-semibold">
                  {tt('排行榜（{n}）', { n: board.length })}
                </h2>
                <div className="mt-3 overflow-hidden rounded-lg border border-black/5">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th className="w-16">{tt('名次')}</th>
                        <th>{tt('选手')}</th>
                        <th>{tt('得分')}</th>
                        <th>{tt('用时')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.length ? (
                        board.map((row) => (
                          <tr key={row.userId}>
                            <td className="font-semibold text-[#667085]">{row.rank}</td>
                            <td>
                              {row.nickname}
                              {me?.id === row.userId ? (
                                <span className="ml-2 text-xs text-brand">{tt('我')}</span>
                              ) : null}
                            </td>
                            <td>
                              {row.score}
                              <span className="text-xs text-[#98A2B3]"> / {row.totalScore}</span>
                            </td>
                            <td className="text-sm">{mmss(row.timeSec)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-[#98A2B3]">
                            {tt('还没有人交卷，来做第一个')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {tab === 'prizes' ? (
              <>
                <h2 className="text-[15px] font-semibold">{tt('名次奖励')}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {contest.prizes.map((p) => (
                    <div key={p.rank} className="rounded-lg bg-brand-soft/60 p-4 text-center">
                      <p className="text-xs text-[#4A6B5C]">{tt('第 {n} 名', { n: p.rank })}</p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-lg font-semibold text-[#0B3B27]">
                        <Coins size={15} className="text-[#F5A623]" /> {p.points}
                      </p>
                      <p className="mt-1 text-xs text-[#4A6B5C]">{tt('+ {n} XP', { n: p.xp })}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#667085]">{tt('报名费')}</dt>
                <dd className="font-medium">
                  {contest.entryFee > 0 ? tt('{n} 积分', { n: contest.entryFee }) : tt('免费')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#667085]">{tt('开始')}</dt>
                <dd>{date(contest.startAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#667085]">{tt('结束')}</dt>
                <dd>{date(contest.endAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#667085]">{tt('我的状态')}</dt>
                <dd>
                  {my?.enrolled
                    ? finished
                      ? tt('已完成')
                      : attempt
                        ? tt('进行中')
                        : tt('已报名')
                    : tt('未报名')}
                </dd>
              </div>
            </dl>

            {contest.effectiveStatus === 'ENDED' ? (
              <button type="button" disabled className="btn-outline mt-5 h-10 w-full">
                {tt('竞赛已结束')}
              </button>
            ) : finished ? (
              <div className="mt-4 rounded-lg bg-brand-soft px-3 py-3 text-sm text-[#0B3B27]">
                {tt('我的成绩：{score}/{total} 分 · 第 {rank} 名 · 用时 {time}', {
                  score: attempt?.score ?? 0,
                  total: attempt?.totalScore ?? 0,
                  rank: attempt?.rank ?? '—',
                  time: mmss(attempt?.totalTimeSec ?? 0),
                })}
              </div>
            ) : my?.enrolled ? (
              <button
                type="button"
                className="btn-primary mt-5 h-10 w-full"
                onClick={() => router.push(`/contests/${id}/play`)}
              >
                {attempt ? tt('继续答题') : tt('开始答题')}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary mt-5 h-10 w-full"
                onClick={() => requireLogin(() => setConfirm(true))}
              >
                {contest.effectiveStatus === 'UPCOMING'
                  ? tt('报名（未开始）')
                  : tt('报名参赛')}
              </button>
            )}

            {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
          </div>

          <ShareButton
            title={tt('{title} · 知巅竞赛', { title: contest.title })}
            text={tt('{title}：{n} 题竞赛，奖池 {pool} 积分', {
              title: contest.title,
              n: contest.questionCount,
              pool: contest.prizePool,
            })}
            path={`/contests/${contest.id}`}
            className="w-full"
          />

          <div className="rounded-card bg-brand-cream/60 p-4 text-xs leading-6 text-[#6B5B2E]">
            <CalendarDays size={13} className="mr-1 inline" />
            {tt('报名后即可开赛；同一场竞赛只能交卷一次，按交卷时的成绩参与排名。')}
          </div>
        </aside>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-5">
          <div className="w-full max-w-[420px] rounded-card bg-white p-5">
            <h3 className="text-lg font-semibold">{tt('确认报名')}</h3>
            <p className="mt-1 text-sm text-[#667085]">{tt('报名后将扣除积分，可立即开始答题')}</p>
            <div className="mt-4 space-y-2 rounded-lg bg-[#F7F8F7] p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#667085]">{tt('题目数')}</span>
                <span>{tt('{n} 题', { n: contest.questionCount })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">{tt('报名费')}</span>
                <span>{tt('{n} 积分', { n: contest.entryFee })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">{tt('我的积分')}</span>
                <span>{me?.points ?? 0}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-ghost h-10 flex-1"
                onClick={() => setConfirm(false)}
              >
                {tt('取消')}
              </button>
              <button
                type="button"
                className="btn-primary h-10 flex-1"
                onClick={enroll}
                disabled={busy === 'enroll' || (me ? me.points < contest.entryFee : false)}
              >
                {busy === 'enroll' ? <Loader2 size={15} className="animate-spin" /> : null}
                {tt('确认报名')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
