'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Row {
  id: string;
  type: string;
  change: number;
  balanceAfter: number;
  remark: string | null;
  createdAt: string;
  user: { nickname: string | null; username: string; phone: string };
}

interface ListData {
  list: Row[];
  total: number;
  page: number;
  pageSize: number;
  sum: number;
}

const TYPES = [
  { value: '', label: '全部类型' },
  { value: 'REGISTER_BONUS', label: '新人礼' },
  { value: 'CHECKIN', label: '每日签到' },
  { value: 'AD_REWARD', label: '观看广告' },
  { value: 'LIKE_GIVEN', label: '点赞奖励' },
  { value: 'ACTIVITY', label: '活动奖励' },
  { value: 'QUIZ_REWARD', label: '答题奖励' },
  { value: 'QUIZ_ENROLL', label: '解锁题库' },
  { value: 'CONTEST_ENROLL', label: '竞赛报名' },
  { value: 'CONTEST_REWARD', label: '竞赛奖励' },
  { value: 'HINT_COST', label: '使用提示' },
  { value: 'INVITE_REWARD', label: '邀请好友' },
  { value: 'ADMIN_ADJUST', label: '后台调整' },
];

const LABEL = new Map(TYPES.filter((t) => t.value).map((t) => [t.value, t.label]));

export default function PointsLedgerPage() {
  const { tt, date } = useI18n();
  const [data, setData] = useState<ListData | null>(null);
  const [type, setType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (type) q.set('type', type);
      if (keyword) q.set('keyword', keyword);
      setData(await apiFetch<ListData>(`/admin/point-transactions?${q}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [page, type, keyword, tt]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{tt('积分流水')}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {tt('全站积分发放与消耗（不涉及任何货币充值或提现）')}
          </p>
        </div>
        <span className="text-sm text-[#667085]">
          {tt('共 {n} 条', { n: data?.total ?? 0 })} · {tt('净变动')}{' '}
          <span
            className={
              (data?.sum ?? 0) >= 0 ? 'font-semibold text-brand' : 'font-semibold text-red-600'
            }
          >
            {data?.sum ?? 0}
          </span>
        </span>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{tt('类型')}</label>
          <select
            className="input w-[160px]"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {tt(t.label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{tt('用户')}</label>
          <input
            className="input w-[220px]"
            placeholder={tt('手机号 / 昵称')}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value.trim());
              setPage(1);
            }}
          />
        </div>
        <button type="button" className="btn-ghost h-10" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {tt('刷新')}
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>{tt('时间')}</th>
              <th>{tt('用户')}</th>
              <th>{tt('类型')}</th>
              <th>{tt('变动')}</th>
              <th>{tt('变动后余额')}</th>
              <th>{tt('备注')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.length ? (
              data.list.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {date(row.createdAt, true)}
                  </td>
                  <td className="text-sm">
                    <p className="font-medium">{row.user.nickname ?? row.user.username}</p>
                    <p className="text-xs text-[#98A2B3]">{row.user.phone}</p>
                  </td>
                  <td className="text-sm">{tt(LABEL.get(row.type) ?? row.type)}</td>
                  <td className={`text-sm font-medium ${row.change > 0 ? 'text-brand' : 'text-red-600'}`}>
                    {row.change > 0 ? `+${row.change}` : row.change}
                  </td>
                  <td className="text-sm">{row.balanceAfter}</td>
                  <td className="text-xs text-[#667085]">{row.remark ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? tt('加载中…') : tt('暂无流水')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#667085]">
        <span>{tt('第 {n} 页', { n: page })}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost h-9 px-3 text-[13px]"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
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
    </div>
  );
}
