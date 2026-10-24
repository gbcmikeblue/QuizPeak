'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search, UserRound } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { RevealPhone } from '@/components/reveal-phone';

interface Row {
  id: string;
  phone: string;
  username: string;
  nickname: string | null;
  points: number;
  totalEarned: number;
  xp: number;
  level: number;
  streakDays: number;
  likesReceived: number;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  attempts: number;
}

interface ListData {
  list: Row[];
  total: number;
  page: number;
  pageSize: number;
}

interface Detail extends Omit<Row, 'attempts'> {
  email: string | null;
  inviteCode: string;
  inviter: { nickname: string | null; username: string } | null;
  inviteeCount: number;
  attemptCount: number;
  transactions: Array<{ id: string; type: string; change: number; balanceAfter: number; remark: string | null; createdAt: string }>;
  attempts: Array<{
    id: string;
    quizTitle: string;
    levelNo: number | null;
    score: number;
    totalScore: number;
    finishedAt: string | null;
  }>;
}

export default function MembersPage() {
  const { tt, date } = useI18n();
  const [data, setData] = useState<ListData | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [adjust, setAdjust] = useState({ delta: '', reason: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (keyword) q.set('keyword', keyword);
      if (status) q.set('status', status);
      setData(await apiFetch<ListData>(`/admin/users?${q}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status, tt]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    setBusy(id);
    setError('');
    try {
      setDetail(await apiFetch<Detail>(`/admin/users/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    } finally {
      setBusy('');
    }
  }

  async function toggleStatus(row: Row) {
    setBusy(row.id);
    try {
      const next = row.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
      await apiFetch(`/admin/users/${row.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      setNotice(next === 'BANNED' ? tt('已封禁') : tt('已解封'));
      await load();
      if (detail?.id === row.id) setDetail({ ...detail, status: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('操作失败'));
    } finally {
      setBusy('');
    }
  }

  async function submitAdjust() {
    if (!detail) return;
    setBusy('adjust');
    setError('');
    try {
      const res = await apiFetch<{ balance: number }>(`/admin/users/${detail.id}/points`, {
        method: 'POST',
        body: JSON.stringify({ delta: Number(adjust.delta), reason: adjust.reason }),
      });
      setNotice(tt('已调整，当前余额 {n}', { n: res.balance }));
      setAdjust({ delta: '', reason: '' });
      const fresh = await apiFetch<Detail>(`/admin/users/${detail.id}`);
      setDetail(fresh);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('调整失败'));
    } finally {
      setBusy('');
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{tt('用户管理')}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {tt('查询用户、调整积分、封禁解封；手机号已脱敏')}
          </p>
        </div>
        <span className="text-sm text-[#667085]">
          {tt('共 {n} 位用户', { n: data?.total ?? 0 })}
        </span>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{tt('关键词')}</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              className="input w-[240px] pl-8"
              value={keyword}
              placeholder={tt('手机号 / 昵称 / 用户名')}
              onChange={(e) => {
                setKeyword(e.target.value.trim());
                setPage(1);
              }}
            />
          </div>
        </div>
        <div>
          <label className="label">{tt('状态')}</label>
          <select
            className="input w-[140px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{tt('全部')}</option>
            <option value="ACTIVE">{tt('正常')}</option>
            <option value="BANNED">{tt('已封禁')}</option>
          </select>
        </div>
        <button type="button" className="btn-ghost h-10" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {tt('刷新')}
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>{tt('用户')}</th>
              <th>{tt('手机号')}</th>
              <th>{tt('积分 / 累计')}</th>
              <th>{tt('XP / 等级')}</th>
              <th>{tt('答题数')}</th>
              <th>{tt('状态')}</th>
              <th>{tt('注册时间')}</th>
              <th>{tt('操作')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.length ? (
              data.list.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-[11px] text-[#0B3B27]">
                        {(row.nickname ?? row.username).slice(0, 1)}
                      </span>
                      <div>
                        <p className="font-medium">{row.nickname ?? row.username}</p>
                        <p className="text-xs text-[#98A2B3]">{row.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm">{row.phone}</td>
                  <td className="text-sm">
                    <span className="font-medium">{row.points}</span>
                    <span className="text-xs text-[#98A2B3]"> / {row.totalEarned}</span>
                  </td>
                  <td className="text-sm">
                    {row.xp} <span className="text-xs text-[#98A2B3]">Lv.{row.level}</span>
                  </td>
                  <td className="text-sm">{row.attempts}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.status === 'BANNED' ? 'bg-red-50 text-red-600' : 'bg-brand-soft text-brand'
                      }`}
                    >
                      {row.status === 'BANNED' ? tt('已封禁') : tt('正常')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {date(row.createdAt)}
                  </td>
                  <td>
                    <div className="flex gap-3 text-sm">
                      <button type="button" className="text-brand" onClick={() => openDetail(row.id)} disabled={busy === row.id}>
                        {tt('详情')}
                      </button>
                      <button
                        type="button"
                        className={row.status === 'BANNED' ? 'text-[#475467]' : 'text-red-600'}
                        onClick={() => toggleStatus(row)}
                        disabled={busy === row.id}
                      >
                        {row.status === 'BANNED' ? tt('解封') : tt('封禁')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? tt('加载中…') : tt('没有符合条件的用户')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#667085]">
        <span>{tt('第 {n} 页', { n: page })}</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost h-9 px-3 text-[13px]" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {tt('上一页')}
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost h-9 px-3 text-[13px]"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {tt('下一页')}
          </button>
        </div>
      </div>

      {detail ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/30 p-6">
          <div className="w-full max-w-[720px] rounded-card bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-[#0B3B27]">
                  <UserRound size={18} />
                </span>
                <div>
                  <p className="font-semibold">{detail.nickname ?? detail.username}</p>
                  <p className="text-xs text-[#667085]">
                    <RevealPhone source="USER" id={detail.id} masked={detail.phone} /> · {detail.username} · Lv.{detail.level}
                  </p>
                </div>
              </div>
              <button type="button" className="text-sm text-[#667085]" onClick={() => setDetail(null)}>
                {tt('关闭')}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                { label: '当前积分', value: detail.points },
                { label: '累计获得', value: detail.totalEarned },
                { label: 'XP', value: detail.xp },
                { label: '答题数', value: detail.attemptCount },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-[#F7F8F7] px-3 py-2">
                  <p className="text-xs text-[#667085]">{tt(s.label)}</p>
                  <p className="mt-0.5 font-semibold">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-black/5 p-3">
              <p className="text-sm font-medium">{tt('调整积分')}</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div>
                  <label className="label">{tt('变动值')}</label>
                  <input
                    className="input w-[120px]"
                    placeholder={tt('正负整数')}
                    value={adjust.delta}
                    onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="label">{tt('理由（必填）')}</label>
                  <input
                    className="input"
                    placeholder={tt('例如：活动奖励补发')}
                    value={adjust.reason}
                    onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}
                  />
                </div>
                <button type="button" className="btn-primary h-10" onClick={submitAdjust} disabled={busy === 'adjust'}>
                  {busy === 'adjust' ? <Loader2 size={14} className="animate-spin" /> : null}
                  {tt('提交')}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium">{tt('最近积分流水')}</p>
              <div className="mt-2 max-h-[200px] divide-y divide-black/5 overflow-auto text-sm">
                {detail.transactions.length ? (
                  detail.transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2">
                      <span className="text-xs text-[#667085]">
                        {date(t.createdAt, true)} · {t.type}
                        {t.remark ? ` · ${t.remark}` : ''}
                      </span>
                      <span className={t.change > 0 ? 'text-brand' : 'text-red-600'}>
                        {t.change > 0 ? `+${t.change}` : t.change}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-[#98A2B3]">{tt('暂无记录')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
