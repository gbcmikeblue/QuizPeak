'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Send } from 'lucide-react';
import { authFetch, getToken } from '@/lib/auth';

interface Row {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  replies: number;
  createdAt: string;
}

interface Detail {
  id: string;
  subject: string;
  content: string;
  category: string;
  status: string;
  createdAt: string;
  replies: Array<{ id: string; authorType: string; content: string; createdAt: string }>;
}

const STATUS: Record<string, { text: string; cls: string }> = {
  OPEN: { text: '待处理', cls: 'bg-[#FFF7E6] text-[#B7791F]' },
  IN_PROGRESS: { text: '处理中', cls: 'bg-brand-soft text-brand' },
  CLOSED: { text: '已关闭', cls: 'bg-[#F2F4F7] text-[#667085]' },
};

const CATEGORY: Record<string, string> = {
  ACCOUNT: '账号',
  QUIZ: '答题',
  POINTS: '积分',
  CONTEST: '竞赛',
  OTHER: '其他',
};

export default function SupportPage() {
  const router = useRouter();
  const [list, setList] = useState<Row[]>([]);
  const [active, setActive] = useState<Detail | null>(null);
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'OTHER', content: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await authFetch<{ list: Row[] }>('/tickets?page=1');
      setList(res.list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?redirect=%2Fsupport');
      return;
    }
    void load();
  }, [load, router]);

  async function openTicket(id: string) {
    setBusy(id);
    try {
      setActive(await authFetch<Detail>(`/tickets/${id}`));
      setReply('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setBusy('');
    }
  }

  async function create() {
    setBusy('create');
    setError('');
    try {
      const res = await authFetch<{ id: string }>('/tickets', { method: 'POST', body: JSON.stringify(form) });
      setOpen(false);
      setForm({ subject: '', category: 'OTHER', content: '' });
      setNotice('工单已提交，客服会尽快回复');
      await load();
      await openTicket(res.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy('');
    }
  }

  async function send() {
    if (!active || !reply.trim()) return;
    setBusy('reply');
    try {
      await authFetch(`/tickets/${active.id}/replies`, { method: 'POST', body: JSON.stringify({ content: reply }) });
      setReply('');
      await openTicket(active.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">客服工单</h1>
          <p className="mt-1 text-sm text-[#667085]">提交问题后可在下方查看处理进度与客服回复</p>
        </div>
        <button type="button" className="btn-primary h-10 px-4 text-[13px]" onClick={() => setOpen((v) => !v)}>
          <Plus size={15} /> 新建工单
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      {open ? (
        <div className="card mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">标题 *</label>
              <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">分类</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">问题描述 *</label>
            <textarea
              className="input min-h-[110px] py-2"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="btn-primary h-10 px-5 text-[13px]"
            onClick={create}
            disabled={busy === 'create' || form.subject.length < 2 || form.content.length < 5}
          >
            {busy === 'create' ? <Loader2 size={14} className="animate-spin" /> : null}
            提交工单
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="card p-0">
          <div className="border-b border-black/5 px-4 py-3 text-sm font-medium">我的工单（{list.length}）</div>
          <div className="max-h-[520px] divide-y divide-black/5 overflow-auto">
            {list.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#98A2B3]">还没有提交过工单</p>
            ) : (
              list.map((t) => {
                const s = STATUS[t.status] ?? STATUS.OPEN;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTicket(t.id)}
                    className={`block w-full px-4 py-3 text-left transition hover:bg-black/[0.02] ${
                      active?.id === t.id ? 'bg-brand-soft/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.subject}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>{s.text}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#98A2B3]">
                      {CATEGORY[t.category] ?? t.category} · {new Date(t.createdAt).toLocaleDateString('zh-CN')} · {t.replies} 条回复
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          {active ? (
            <>
              <div className="border-b border-black/5 pb-3">
                <h2 className="text-[15px] font-semibold">{active.subject}</h2>
                <p className="mt-1 text-xs text-[#98A2B3]">
                  {CATEGORY[active.category] ?? active.category} · {new Date(active.createdAt).toLocaleString('zh-CN')} ·{' '}
                  {(STATUS[active.status] ?? STATUS.OPEN).text}
                </p>
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-lg bg-[#F7F8F7] p-3 text-sm leading-6 text-[#475467]">{active.content}</div>
                {active.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-lg p-3 text-sm leading-6 ${
                      r.authorType === 'ADMIN' ? 'bg-brand-soft/70 text-[#0B3B27]' : 'bg-[#F7F8F7] text-[#475467]'
                    }`}
                  >
                    <p className="mb-1 text-[11px] text-[#98A2B3]">
                      {r.authorType === 'ADMIN' ? '客服' : '我'} · {new Date(r.createdAt).toLocaleString('zh-CN')}
                    </p>
                    {r.content}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="补充说明…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void send();
                  }}
                />
                <button type="button" className="btn-primary h-10 px-4 text-[13px]" onClick={send} disabled={busy === 'reply' || !reply.trim()}>
                  {busy === 'reply' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  发送
                </button>
              </div>
            </>
          ) : (
            <div className="grid place-items-center py-16 text-center">
              <p className="text-sm text-[#98A2B3]">选择左侧工单查看对话</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
