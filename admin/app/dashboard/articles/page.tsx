'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Row {
  id: string;
  title: string;
  slug: string;
  status: string;
  categoryName: string | null;
  tags: string[];
  views: number;
  readMinutes: number;
  publishedAt: string | null;
  updatedAt: string;
}

interface Detail extends Row {
  summary: string | null;
  cover: string | null;
  content: string;
  categoryId: string | null;
}

const EMPTY = {
  title: '',
  slug: '',
  summary: '',
  cover: '',
  content: '',
  tags: '',
  readMinutes: 3,
  status: 'DRAFT',
};

export default function ArticlesPage() {
  const [data, setData] = useState<{ list: Row[]; total: number } | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ page: '1', pageSize: '20' });
      if (keyword) q.set('keyword', keyword);
      if (status) q.set('status', status);
      setData(await apiFetch<{ list: Row[]; total: number }>(`/admin/articles?${q}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEdit(id?: string) {
    setNotice('');
    if (!id) {
      setEditing(null);
      setForm({ ...EMPTY });
      setOpen(true);
      return;
    }
    setBusy(id);
    try {
      const d = await apiFetch<Detail>(`/admin/articles/${id}`);
      setEditing(id);
      setForm({
        title: d.title,
        slug: d.slug,
        summary: d.summary ?? '',
        cover: d.cover ?? '',
        content: d.content,
        tags: (d.tags ?? []).join(','),
        readMinutes: d.readMinutes,
        status: d.status,
      });
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setBusy('');
    }
  }

  async function save(nextStatus?: string) {
    setBusy('save');
    setError('');
    try {
      const payload = {
        title: form.title,
        slug: form.slug || null,
        summary: form.summary || null,
        cover: form.cover || null,
        content: form.content,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        readMinutes: Number(form.readMinutes) || 3,
        status: nextStatus ?? form.status,
      };
      if (editing) {
        await apiFetch(`/admin/articles/${editing}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice(nextStatus === 'PUBLISHED' ? '已发布' : '已保存');
      } else {
        const res = await apiFetch<{ id: string }>('/admin/articles', { method: 'POST', body: JSON.stringify(payload) });
        setEditing(res.id);
        setNotice('已创建');
      }
      setForm((f) => ({ ...f, status: nextStatus ?? f.status }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy('');
    }
  }

  async function archive(id: string) {
    setBusy(id);
    try {
      await apiFetch(`/admin/articles/${id}`, { method: 'DELETE' });
      setNotice('已下线');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">内容管理</h1>
          <p className="mt-1 text-sm text-[#667085]">文章发布与下线；正文按纯文本展示，空行分段</p>
        </div>
        <button type="button" className="btn-primary h-10" onClick={() => openEdit()}>
          <Plus size={15} /> 新建文章
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">关键词</label>
          <input
            className="input w-[220px]"
            placeholder="标题 / slug"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value.trim())}
          />
        </div>
        <div>
          <label className="label">状态</label>
          <select className="input w-[140px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">已发布</option>
          </select>
        </div>
        <button type="button" className="btn-ghost h-10" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>标题</th>
              <th>slug</th>
              <th>标签</th>
              <th>浏览</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.length ? (
              data.list.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.title}</td>
                  <td className="text-xs text-[#667085]">{row.slug}</td>
                  <td className="text-xs">{row.tags.join('、') || '—'}</td>
                  <td className="text-sm">{row.views}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.status === 'PUBLISHED' ? 'bg-brand-soft text-brand' : 'bg-[#F2F4F7] text-[#667085]'
                      }`}
                    >
                      {row.status === 'PUBLISHED' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {new Date(row.updatedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td>
                    <div className="flex gap-3 text-sm">
                      <button type="button" className="text-brand" onClick={() => openEdit(row.id)} disabled={busy === row.id}>
                        编辑
                      </button>
                      {row.status === 'PUBLISHED' ? (
                        <button type="button" className="text-[#667085]" onClick={() => archive(row.id)} disabled={busy === row.id}>
                          下线
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? '加载中…' : '暂无文章'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{editing ? '编辑文章' : '新建文章'}</h2>
            <button type="button" className="btn-ghost h-9 px-3 text-[13px]" onClick={() => setOpen(false)}>
              收起
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">标题 *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">slug（留空自动生成）</label>
              <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="label">标签（逗号分隔）</label>
              <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">摘要</label>
              <input className="input" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div>
              <label className="label">封面 URL</label>
              <input className="input" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
            </div>
            <div>
              <label className="label">阅读时长（分钟）</label>
              <input
                type="number"
                className="input"
                value={form.readMinutes}
                onChange={(e) => setForm({ ...form, readMinutes: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">正文 *（空行分段）</label>
              <textarea
                className="input min-h-[220px] py-2 leading-6"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn-ghost h-10" onClick={() => save('DRAFT')} disabled={busy === 'save'}>
              {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              存为草稿
            </button>
            <button type="button" className="btn-primary h-10" onClick={() => save('PUBLISHED')} disabled={busy === 'save'}>
              发布
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
