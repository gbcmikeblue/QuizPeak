'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Row {
  id: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  REVEAL_PHONE: '查看完整手机号',
};

const TARGET_LABEL: Record<string, string> = {
  USER: '用户',
  TICKET: '工单',
  SMS: '短信记录',
};

export default function AuditLogsPage() {
  const { tt, date } = useI18n();
  const [list, setList] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ list: Row[]; total: number }>(
        '/admin/audit-logs?page=1&pageSize=50',
      );
      setList(res.list);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [tt]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{tt('敏感操作审计')}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {tt('记录后台查看完整手机号等敏感操作，用于事后追溯；日志不可修改、不可删除')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#667085]">{tt('共 {n} 条', { n: total })}</span>
          <button type="button" className="btn-ghost h-9" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {tt('刷新')}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>{tt('时间')}</th>
              <th>{tt('操作人')}</th>
              <th>{tt('操作')}</th>
              <th>{tt('对象')}</th>
              <th>{tt('详情')}</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {date(row.createdAt, true)}
                  </td>
                  <td className="text-sm font-medium">{row.adminName}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                      <ShieldCheck size={11} />
                      {tt(ACTION_LABEL[row.action] ?? row.action)}
                    </span>
                  </td>
                  <td className="text-xs text-[#667085]">
                    {tt(TARGET_LABEL[row.targetType] ?? row.targetType)} ·{' '}
                    {row.targetId.slice(0, 10)}
                  </td>
                  <td className="text-xs text-[#475467]">{row.detail ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? tt('加载中…') : tt('暂无审计记录')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#98A2B3]">
        {tt(
          '说明：手机号在用户管理、工单、短信记录中默认脱敏；需要完整号时点「查看完整」，每次都会写入本表。',
        )}
      </p>
    </div>
  );
}
