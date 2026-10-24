'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Row {
  id: string;
  keyword: string;
  deletedByUser: boolean;
  updatedAt: string;
  user: string;
  phone: string;
}

export default function SearchHistoryPage() {
  const { tt, date } = useI18n();
  const [list, setList] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ page: '1', pageSize: '50' });
      if (keyword) q.set('keyword', keyword);
      const res = await apiFetch<{ list: Row[]; total: number }>(`/admin/search-history?${q}`);
      setList(res.list);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [keyword, tt]);

  useEffect(() => {
    void load();
  }, [load]);

  const deletedCount = list.filter((x) => x.deletedByUser).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{tt('搜索记录')}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {tt('用户在前台删除后仅自己不可见，这里完整保留；可用于分析搜索需求与内容缺口')}
          </p>
        </div>
        <span className="text-sm text-[#667085]">
          {tt('共 {n} 条（本页用户已删 {m} 条）', { n: total, m: deletedCount })}
        </span>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{tt('关键词')}</label>
          <input
            className="input w-[240px]"
            placeholder={tt('搜索关键词')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value.trim())}
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
              <th>{tt('关键词')}</th>
              <th>{tt('用户')}</th>
              <th>{tt('手机号')}</th>
              <th>{tt('状态')}</th>
              <th>{tt('最后搜索时间')}</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.keyword}</td>
                  <td className="text-sm">{row.user}</td>
                  <td className="text-sm text-[#667085]">{row.phone}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.deletedByUser
                          ? 'bg-[#F2F4F7] text-[#667085]'
                          : 'bg-brand-soft text-brand'
                      }`}
                    >
                      {row.deletedByUser ? tt('用户已删除') : tt('正常')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {date(row.updatedAt, true)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? tt('加载中…') : tt('暂无搜索记录')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#98A2B3]">
        {tt('提示：同一用户重复搜索同一关键词只保留一条记录（更新时间为最后一次搜索）。')}
      </p>
    </div>
  );
}
