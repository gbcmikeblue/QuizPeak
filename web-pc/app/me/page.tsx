'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';
import { authFetch, fetchMe, getToken, type Me } from '@/lib/auth';
import { AVATAR_PREFIX, AVATAR_PRESETS, avatarOf } from '@/lib/avatars';
import { API_BASE } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface HistoryItem {
  id: string;
  title: string;
  targetId: string;
  levelNo?: number | null;
  score: number;
  totalScore: number;
  correctCount: number;
  durationSec: number;
  rank?: number | null;
  time: string | null;
  kind: 'quiz' | 'contest';
}

export default function MePage() {
  const router = useRouter();
  const { tt, date } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<'quiz' | 'contest' | 'favorites' | 'badges' | 'settings'>('quiz');
  const [favorites, setFavorites] = useState<Array<Record<string, unknown>>>([]);
  const [badges, setBadges] = useState<
    Array<{
      code: string;
      name: string;
      desc: string;
      icon: string;
      threshold: number;
      progress: number;
      achieved: boolean;
    }>
  >([]);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [list, setList] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState({ nickname: '', firstName: '', lastName: '', address: '' });
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '' });
  const [avatar, setAvatar] = useState('');
  const [avatarList, setAvatarList] = useState<Array<{ emoji: string; isDefault: boolean }>>([]);
  const [busy, setBusy] = useState('');

  const loadHistory = useCallback(
    async (type: 'quiz' | 'contest') => {
      setLoading(true);
      try {
        const res = await authFetch<{ list: HistoryItem[]; total: number }>(
          `/me/history?type=${type}&page=1&pageSize=20`,
        );
        setList(res.list);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : tt('加载失败'));
      } finally {
        setLoading(false);
      }
    },
    [tt],
  );

  // 头像库由后台维护，前台只读
  useEffect(() => {
    fetch(`${API_BASE}/avatars`)
      .then((r) => r.json())
      .then((j) => setAvatarList(Array.isArray(j?.data) ? j.data : []))
      .catch(() => undefined);
  }, []);

  // 支持 /me?tab=badges 这类深链（通知、头像菜单会带参数跳过来）
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'quiz' || t === 'contest' || t === 'favorites' || t === 'badges' || t === 'settings') {
      setTab(t);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?redirect=%2Fme');
      return;
    }
    fetchMe().then((data) => {
      setMe(data);
      if (data) {
        setAvatar(data.avatar ?? '');
        setProfile({
          nickname: data.nickname ?? '',
          firstName: '',
          lastName: '',
          address: '',
        });
        authFetch<{ firstName: string | null; lastName: string | null; address: string | null }>('/me').then(
          (p) => {
            setProfile((prev) => ({
              ...prev,
              firstName: p.firstName ?? '',
              lastName: p.lastName ?? '',
              address: p.address ?? '',
            }));
          },
        );
      }
    });
  }, [router]);

  useEffect(() => {
    if (tab === 'quiz' || tab === 'contest') void loadHistory(tab);
    if (tab === 'favorites') {
      authFetch<Array<Record<string, unknown>>>('/me/favorites?type=quiz')
        .then(setFavorites)
        .catch(() => setFavorites([]));
    }
    if (tab === 'badges') {
      authFetch<{ newly: string[]; list: typeof badges }>('/me/badges')
        .then((res) => {
          setBadges(res.list);
          setNewBadges(res.newly);
        })
        .catch(() => setBadges([]));
    }
  }, [tab, loadHistory]);

  async function saveProfile() {
    setBusy('profile');
    setError('');
    setNotice('');
    try {
      await authFetch('/me', { method: 'PATCH', body: JSON.stringify({ ...profile, avatar }) });
      setNotice(tt('资料已保存'));
      setMe(await fetchMe());
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('保存失败'));
    } finally {
      setBusy('');
    }
  }

  async function savePassword() {
    setBusy('pwd');
    setError('');
    setNotice('');
    try {
      await authFetch('/me/password', { method: 'POST', body: JSON.stringify(pwd) });
      setNotice(tt('密码已更新'));
      setPwd({ oldPassword: '', newPassword: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('修改失败'));
    } finally {
      setBusy('');
    }
  }

  if (!me) {
    return <main className="container-page py-16 text-sm text-[#667085]">{tt('加载中…')}</main>;
  }

  return (
    <main className="container-page py-8">
      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-brand-soft text-xl font-semibold text-[#0B3B27]">
            {avatarOf(me.avatar, me.nickname ?? me.username).emoji ??
              avatarOf(me.avatar, me.nickname ?? me.username).letter}
          </span>
          <div>
            <p className="text-lg font-semibold">{me.nickname ?? me.username}</p>
            <p className="text-xs text-[#667085]">
              @{me.username} · Lv.{me.level} · {tt('连续签到 {n} 天', { n: me.streakDays })}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-[#0B3B27]">
              <Star size={14} className="text-[#F5A623]" /> {tt('{n} 积分', { n: me.points })}
              <span className="ml-2 text-xs text-[#98A2B3]">{tt('累计获得 {n}', { n: me.totalEarned })}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-[13px]">
          <Link href="/points" className="btn-outline h-9 px-4">
            {tt('赚积分')}
          </Link>
          <Link href="/leaderboard" className="btn-outline h-9 px-4">
            {tt('排行榜')}
          </Link>
        </div>
      </section>

      <div className="mt-5 flex gap-1 border-b border-black/5 text-sm">
        {(
          [
            { key: 'quiz', label: '答题记录' },
            { key: 'contest', label: '竞赛记录' },
            { key: 'favorites', label: '收藏' },
            { key: 'badges', label: '徽章' },
            { key: 'settings', label: '设置' },
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

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}
      {notice ? (
        <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p>
      ) : null}

      {tab === 'favorites' ? (
        <div className="mt-4 space-y-3">
          {favorites.length === 0 ? (
            <div className="card py-12 text-center">
              <p className="text-sm text-[#667085]">{tt('还没有收藏题库')}</p>
              <Link href="/quizzes" className="btn-primary mt-4 h-9 px-4 text-[13px]">
                {tt('去题库逛逛')}
              </Link>
            </div>
          ) : (
            favorites.map((item) => (
              <Link
                key={String(item.id)}
                href={`/quizzes/${item.id}`}
                className="card flex items-center justify-between py-4 transition hover:border-brand/40"
              >
                <div>
                  <p className="text-sm font-medium">{String(item.title)}</p>
                  <p className="mt-1 text-xs text-[#98A2B3]">
                    {tt('{n} 关', { n: String(item.levelsCount) })} ·{' '}
                    {Number(item.enrollFee) > 0
                      ? tt('解锁 {n} 积分', { n: String(item.enrollFee) })
                      : tt('免费')}{' '}
                    · {tt('{n} 人参与', { n: String(item.playerCount) })}
                  </p>
                </div>
                <span className="text-[13px] text-brand">{tt('继续答题 →')}</span>
              </Link>
            ))
          )}
        </div>
      ) : null}

      {tab === 'badges' ? (
        <div className="mt-4">
          {newBadges.length > 0 ? (
            <p className="mb-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
              {tt('恭喜获得新徽章：{names}', { names: newBadges.join('、') })}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((b) => (
              <div key={b.code} className={`card text-center ${b.achieved ? '' : 'opacity-60'}`}>
                <div
                  className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl text-2xl ${
                    b.achieved ? 'bg-brand-soft' : 'bg-[#F2F4F7] grayscale'
                  }`}
                >
                  {b.icon}
                </div>
                <p className="mt-3 text-sm font-semibold">{b.name}</p>
                <p className="mt-1 text-xs leading-5 text-[#667085]">{b.desc}</p>
                <p className="mt-2 text-[11px] text-[#98A2B3]">
                  {b.achieved ? tt('已获得') : tt('进度 {n}/{total}', { n: b.progress, total: b.threshold })}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="mt-5 grid items-start gap-5 md:grid-cols-2">
          <div className="card">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
              <h2 className="text-[15px] font-semibold">{tt('个人资料')}</h2>
              <span className="text-xs text-[#98A2B3]">{tt('昵称会显示在排行榜')}</span>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">{tt('头像')}</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition ${
                      avatar === ''
                        ? 'border-brand bg-brand-soft text-brand ring-2 ring-brand/20'
                        : 'border-black/10 bg-white text-[#475467]'
                    }`}
                    title={tt('使用昵称首字母')}
                  >
                    {(me.nickname ?? me.username).slice(0, 1)}
                  </button>
                  {(avatarList.length ? avatarList.map((x) => x.emoji) : AVATAR_PRESETS).map((emoji) => {
                    const value = `${AVATAR_PREFIX}${emoji}`;
                    const active = avatar === value;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(value)}
                        className={`grid h-10 w-10 place-items-center rounded-full border text-xl transition ${
                          active
                            ? 'border-brand bg-brand-soft ring-2 ring-brand/20'
                            : 'border-black/10 bg-white hover:bg-black/[0.03]'
                        }`}
                        title={tt('选这个头像')}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-[#98A2B3]">
                  {tt('从固定列表中选择，保存资料后生效（约 2 秒刷新全站）')}
                </p>
              </div>

              {(
                [
                  { key: 'nickname', label: '昵称' },
                  { key: 'firstName', label: '名' },
                  { key: 'lastName', label: '姓' },
                  { key: 'address', label: '地址' },
                ] as const
              ).map((f) => (
                <div key={f.key}>
                  <label className="label">{tt(f.label)}</label>
                  <input
                    className="input"
                    value={profile[f.key]}
                    onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary mt-5 h-10 w-full"
              onClick={saveProfile}
              disabled={busy === 'profile'}
            >
              {busy === 'profile' ? <Loader2 size={14} className="animate-spin" /> : null}
              {tt('保存资料')}
            </button>
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
              <h2 className="text-[15px] font-semibold">{tt('修改密码')}</h2>
              <span className="text-xs text-[#98A2B3]">{tt('至少 8 位，含字母和数字')}</span>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">{tt('原密码（短信注册的账号可留空）')}</label>
                <input
                  type="password"
                  className="input"
                  value={pwd.oldPassword}
                  onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{tt('新密码（≥8 位，含字母和数字）')}</label>
                <input
                  type="password"
                  className="input"
                  value={pwd.newPassword}
                  onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-primary mt-5 h-10 w-full"
              onClick={savePassword}
              disabled={busy === 'pwd'}
            >
              {busy === 'pwd' ? <Loader2 size={14} className="animate-spin" /> : null}
              {tt('更新密码')}
            </button>
            <p className="mt-3 text-xs leading-5 text-[#98A2B3]">
              {tt('积分不可转让、不可兑现；账号问题可在客服工单中提交。')}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="py-10 text-center text-sm text-[#667085]">{tt('加载中…')}</p>
          ) : list.length === 0 ? (
            <div className="card py-12 text-center">
              <p className="text-sm text-[#667085]">
                {tab === 'quiz' ? tt('还没有答题记录') : tt('还没有竞赛记录')}
              </p>
              <Link
                href={tab === 'quiz' ? '/quizzes' : '/contests'}
                className="btn-primary mt-4 h-9 px-4 text-[13px]"
              >
                {tab === 'quiz' ? tt('去答题') : tt('去参赛')}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#98A2B3]">{tt('共 {n} 条', { n: total })}</p>
              {list.map((item) => (
                <div key={item.id} className="card flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium">
                      {item.title}
                      {item.levelNo ? (
                        <span className="ml-2 text-xs text-[#98A2B3]">
                          {tt('第 {n} 关', { n: item.levelNo })}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[#98A2B3]">
                      {item.time ? date(item.time, true) : '—'} · {tt('用时 {n}s', { n: item.durationSec })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium">
                      {item.score}
                      <span className="text-xs text-[#98A2B3]"> / {item.totalScore}</span>
                    </span>
                    {item.kind === 'contest' && item.rank ? (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                        {tt('第 {n} 名', { n: item.rank })}
                      </span>
                    ) : null}
                    <Link
                      href={item.kind === 'quiz' ? `/quizzes/${item.targetId}` : `/contests/${item.targetId}`}
                      className="text-[13px] text-brand"
                    >
                      {item.kind === 'quiz' ? tt('再练一次') : tt('查看竞赛')}
                    </Link>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </main>
  );
}
