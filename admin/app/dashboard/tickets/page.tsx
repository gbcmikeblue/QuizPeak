'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Send } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { RevealPhone } from '@/components/reveal-phone';

interface Row {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  user: string;
  phone: string;
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
  user: { nickname: string | null; username: string; phone: string };
  replies: Array<{ id: string; authorType: string; content: string; createdAt: string }>;
}

const STATUS: Record<string, { text: string; cls: string }> = {
  OPEN: { text: '待处理', cls: 'bg-[#FFF7E6] text-[#B7791F]' },
  IN_PROGRESS: { text: '处理中', cls: 'bg-brand-soft text-brand' },
  CLOSED: { text: '已关闭', cls: 'bg-[#F2F4F7] text-[#667085]' },
};

export default function TicketsPage() {
  const [list, setList] = useState<Row[]>([]);
  const [status, setStatus] = useState('OPEN');
  const [active, setActive] = useState<Detail | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ page: '1', pageSize: '30' });
      if (status) q.set('status', status);
      const res = await apiFetch<{ list: Row[] }>(`/admin/tickets?${q}`);
      setList(res.list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(id: string) {
    setBusy(id);
    try {
      setActive(await apiFetch<Detail>(`/admin/tickets/${id}`));
      setReply('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setBusy('');
    }
  }

  async function send() {
    if (!active || !reply.trim()) return;
    setBusy('reply');
    try {
      await apiFetch(`/admin/tickets/${active.id}/replies`, { method: 'POST', body: JSON.stringify({ content: reply }) });
      setReply('');
      await open(active.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setBusy('');
    }
  }

  async function setTicketStatus(next: string) {
    if (!active) return;
    setBusy('status');
    try {
      await apiFetch(`/admin/tickets/${active.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await open(active.id);
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
          <h1 className="text-xl font-semibold">客服工单</h1>
          <p className="mt-1 text-sm text-[#667085]">处理用户反馈，回复会同步到用户端</p>
        </div>
        <div className="flex items-end gap-2">
          <select className="input w-[140px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="OPEN">待处理</option>
            <option value="IN_PROGRESS">处理中</option>
            <option value="CLOSED">已关闭</option>
          </select>
          <button type="button" className="btn-ghost h-10" onClick={() => void load()}>
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="card p-0">
          <div className="border-b border-black/5 px-4 py-3 text-sm font-medium">工单（{list.length}）</div>
          <div className="max-h-[560px] divide-y divide-black/5 overflow-auto">
            {list.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#98A2B3]">暂无工单</p>
            ) : (
              list.map((t) => {
                const s = STATUS[t.status] ?? STATUS.OPEN;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => open(t.id)}
                    className={`block w-full px-4 py-3 text-left transition hover:bg-black/[0.02] ${
                      active?.id === t.id ? 'bg-brand-soft/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.subject}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>{s.text}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#98A2B3]">
                      {t.user} · {t.phone} · {new Date(t.createdAt).toLocaleDateString('zh-CN')} · {t.replies} 条
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
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black/5 pb-3">
                <div>
                  <h2 className="text-[15px] font-semibold">{active.subject}</h2>
                  <p className="mt-1 text-xs text-[#98A2B3]">
                    {active.user.nickname ?? active.user.username} ·{' '}
                    <RevealPhone source="TICKET" id={active.id} masked={active.user.phone} /> ·{' '}
                    {new Date(active.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    className="input h-8 w-[120px] text-[13px]"
                    value={active.status}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    disabled={busy === 'status'}
                  >
                    <option value="OPEN">待处理</option>
                    <option value="IN_PROGRESS">处理中</option>
                    <option value="CLOSED">已关闭</option>
                  </select>
                </div>
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
                      {r.authorType === 'ADMIN' ? '客服' : '用户'} · {new Date(r.createdAt).toLocaleString('zh-CN')}
                    </p>
                    {r.content}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="输入回复内容…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void send();
                  }}
                />
                <button type="button" className="btn-primary h-10 px-4 text-[13px]" onClick={send} disabled={busy === 'reply' || !reply.trim()}>
                  {busy === 'reply' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  回复
                </button>
              </div>
            </>
          ) : (
            <div className="grid place-items-center py-16 text-center">
              <p className="text-sm text-[#98A2B3]">选择左侧工单查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
