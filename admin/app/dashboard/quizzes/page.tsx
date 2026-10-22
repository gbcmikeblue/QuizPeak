'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Row {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  difficulty: string;
  status: string;
  categoryName: string | null;
  questionCount: number;
  levelsCount: number;
  questionTotal: number;
  levelTotal: number;
  enrollFee: number;
  playerCount: number;
}

interface ListData {
  list: Row[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  DRAFT: { text: '草稿', cls: 'bg-[#F2F4F7] text-[#667085]' },
  PUBLISHED: { text: '上架', cls: 'bg-brand-soft text-brand' },
  ARCHIVED: { text: '下架', cls: 'bg-red-50 text-red-600' },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: '入门',
  INTERMEDIATE: '进阶',
  ADVANCED: '高阶',
};

export default function QuizzesPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (keyword) q.set('keyword', keyword);
      if (status) q.set('status', status);
      setData(await apiFetch<ListData>(`/admin/quizzes?${q.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">题库管理</h1>
          <p className="mt-1 text-sm text-[#667085]">题库、关卡与题目；上架后用户端可见</p>
        </div>
        <Link href="/dashboard/quizzes/new" className="btn-primary h-10">
          <Plus size={15} /> 新建题库
        </Link>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">关键词</label>
          <input
            className="input w-[220px]"
            value={keyword}
            placeholder="标题 / slug"
            onChange={(e) => {
              setKeyword(e.target.value.trim());
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="label">状态</label>
          <select
            className="input w-[140px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部</option>
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">上架</option>
            <option value="ARCHIVED">下架</option>
          </select>
        </div>
        <button type="button" className="btn-ghost h-10" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>难度</th>
              <th>关卡 / 题目</th>
              <th>解锁积分</th>
              <th>参与</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.length ? (
              data.list.map((row) => {
                const s = STATUS_LABEL[row.status] ?? STATUS_LABEL.DRAFT;
                return (
                  <tr key={row.id}>
                    <td>
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-[#98A2B3]">{row.titleEn || row.slug}</p>
                    </td>
                    <td className="text-sm">{row.categoryName ?? '—'}</td>
                    <td className="text-sm">{DIFFICULTY_LABEL[row.difficulty] ?? row.difficulty}</td>
                    <td className="text-sm">
                      {row.levelTotal}/{row.levelsCount} 关 · {row.questionTotal} 题
                    </td>
                    <td className="text-sm">{row.enrollFee > 0 ? `${row.enrollFee} 积分` : '免费'}</td>
                    <td className="text-sm">{row.playerCount}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.text}</span>
                    </td>
                    <td>
                      <Link href={`/dashboard/quizzes/${row.id}`} className="text-sm text-brand">
                        编辑
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? '加载中…' : '暂无题库，点右上角新建'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#667085]">
        <span>共 {data?.total ?? 0} 条</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost h-9 px-3 text-[13px]" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            上一页
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
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
