'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CircleCheck,
  CircleDot,
  Clock3,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
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
  updatedAt: string;
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

interface StatusCounts {
  ALL: number;
  OPEN: number;
  IN_PROGRESS: number;
  CLOSED: number;
}

const STATUS_META: Record<string, { text: string; badge: string; dot: string; bar: string }> = {
  OPEN: {
    text: '待处理',
    badge: 'bg-[#FFF7E6] text-[#B7791F] ring-1 ring-[#F2D48A]',
    dot: 'bg-[#F0A020]',
    bar: 'bg-[#F0A020]',
  },
  IN_PROGRESS: {
    text: '处理中',
    badge: 'bg-brand-soft text-brand-deep ring-1 ring-brand/20',
    dot: 'bg-brand',
    bar: 'bg-brand',
  },
  CLOSED: {
    text: '已关闭',
    badge: 'bg-[#F2F4F7] text-[#667085] ring-1 ring-black/5',
    dot: 'bg-[#98A2B3]',
    bar: 'bg-[#98A2B3]',
  },
};

const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;

const CATEGORY_LABEL: Record<string, string> = {
  ACCOUNT: '账号',
  QUIZ: '题库',
  POINTS: '积分',
  CONTEST: '竞赛',
  OTHER: '其他',
};

const FILTERS = [
  { value: '', label: '全部' },
  { value: 'OPEN', label: '待处理' },
  { value: 'IN_PROGRESS', label: '处理中' },
  { value: 'CLOSED', label: '已关闭' },
];

/** 关闭工单的常用处理说明，点一下即可填入 */
const QUICK_NOTES = [
  '已解决用户问题，工单关闭',
  '重复提交，已合并处理',
  '信息不足，请补充截图或订单号后重新提交',
  '内容不符合社区规范，已按规则处理',
];

export default function TicketsPage() {
  const { tt, date } = useI18n();
  const [list, setList] = useState<Row[]>([]);
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState<Detail | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  /** 待确认的状态变更：{ status, note } */
  const [pending, setPending] = useState<{ status: string; note: string } | null>(null);

  const reqId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++reqId.current;
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: '1', pageSize: '30' });
      if (filter) q.set('status', filter);
      const res = await apiFetch<{ list: Row[]; statusCounts?: StatusCounts }>(
        `/admin/tickets?${q.toString()}`,
      );
      if (mine !== reqId.current) return; // 丢弃过期响应，避免快速切换筛选项时串数据
      setList(res.list);
      if (res.statusCounts) setCounts(res.statusCounts);
    } catch (e) {
      if (mine === reqId.current) setError(e instanceof Error ? e.message : tt('加载失败'));
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }, [filter, tt]);

  useEffect(() => {
    void load();
  }, [load]);

  // ESC 关闭确认弹窗
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPending(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  async function open(id: string) {
    setBusy(`open:${id}`);
    setError('');
    try {
      setActive(await apiFetch<Detail>(`/admin/tickets/${id}`));
      setReply('');
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    } finally {
      setBusy('');
    }
  }

  async function send() {
    if (!active || !reply.trim()) return;
    setBusy('reply');
    setError('');
    try {
      await apiFetch(`/admin/tickets/${active.id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content: reply }),
      });
      setReply('');
      await open(active.id);
      await load();
      setNotice(tt('回复已发送，用户会收到站内通知'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('发送失败'));
    } finally {
      setBusy('');
    }
  }

  function askStatus(next: string) {
    if (!active || active.status === next) return;
    setError('');
    setNotice('');
    setPending({ status: next, note: '' });
  }

  async function confirmStatus() {
    if (!active || !pending) return;
    const note = pending.note.trim();
    if (pending.status === 'CLOSED' && note.length < 2) {
      setError(tt('关闭工单需要填写处理说明（至少 2 个字），该说明会回复给用户'));
      return;
    }
    setBusy('status');
    setError('');
    try {
      await apiFetch(`/admin/tickets/${active.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: pending.status, note: note || undefined }),
      });
      const label = tt(STATUS_META[pending.status]?.text ?? pending.status);
      setPending(null);
      await open(active.id);
      await load();
      setNotice(
        `${tt('工单已变更为「{label}」', { label })}${note ? tt('，处理说明已回复给用户') : ''}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('操作失败'));
    } finally {
      setBusy('');
    }
  }

  const currentStatus = active ? (STATUS_META[active.status] ?? STATUS_META.OPEN) : null;
  const activeInList = Boolean(active && list.some((t) => t.id === active.id));
  const pendingMeta = pending ? STATUS_META[pending.status] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{tt('客服工单')}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {tt('处理用户反馈，回复会同步到用户端；变更状态需二次确认，关闭工单必须填写处理说明。')}
          </p>
        </div>
        <button type="button" className="btn-ghost h-10" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {tt('刷新')}
        </button>
      </div>

      {/* 状态筛选：标签 + 各状态数量，选中态高亮 */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const picked = filter === f.value;
          const n = counts ? (f.value ? counts[f.value as keyof StatusCounts] : counts.ALL) : undefined;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setNotice('');
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition ${
                picked
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-white text-[#475467] ring-1 ring-black/5 hover:bg-brand-soft/50'
              }`}
            >
              {tt(f.label)}
              <span
                className={`min-w-[20px] rounded-full px-1.5 text-[11px] leading-[18px] ${
                  picked ? 'bg-white/25 text-white' : 'bg-[#F2F4F7] text-[#667085]'
                }`}
              >
                {n ?? '—'}
              </span>
            </button>
          );
        })}
        <span className="ml-auto text-xs text-[#98A2B3]">
          {loading
            ? tt('加载中…')
            : tt('当前筛选 {n} 条 / 全部 {total} 条', {
                n: list.length,
                total: counts?.ALL ?? '—',
              })}
        </span>
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-deep">
          <CircleCheck size={15} className="mt-0.5 shrink-0" /> {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* 列表 */}
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <span className="text-sm font-medium">
              {tt(FILTERS.find((f) => f.value === filter)?.label ?? '全部')} {tt('工单')}
            </span>
            <span className="text-xs text-[#98A2B3]">{tt('{n} 条', { n: list.length })}</span>
          </div>

          <div className="max-h-[560px] divide-y divide-black/5 overflow-auto">
            {loading && list.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#98A2B3]">
                <Loader2 size={15} className="animate-spin" /> {tt('加载中…')}
              </div>
            ) : list.length === 0 ? (
              <div className="grid place-items-center gap-2 py-14 text-center">
                <Inbox size={22} className="text-[#D0D5DD]" />
                <p className="text-sm text-[#98A2B3]">{tt('该状态下暂无工单')}</p>
                {filter ? (
                  <button
                    type="button"
                    className="text-xs text-brand underline-offset-2 hover:underline"
                    onClick={() => setFilter('')}
                  >
                    {tt('查看全部工单')}
                  </button>
                ) : null}
              </div>
            ) : (
              list.map((t) => {
                const s = STATUS_META[t.status] ?? STATUS_META.OPEN;
                const picked = active?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void open(t.id)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition ${
                      picked ? 'bg-brand-soft/60' : 'hover:bg-black/[0.02]'
                    }`}
                  >
                    <span className={`mt-1.5 h-8 w-1 shrink-0 rounded-full ${s.bar}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{t.subject}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${s.badge}`}>
                          {tt(s.text)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-[#98A2B3]">
                        {tt(CATEGORY_LABEL[t.category] ?? t.category)} · {t.user} · {t.phone}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[#B4BCC8]">
                        {date(t.createdAt, true)}
                        <span>· {tt('{n} 条往来', { n: t.replies })}</span>
                        {busy === `open:${t.id}` ? <Loader2 size={11} className="animate-spin" /> : null}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 详情 */}
        <div className="card">
          {active ? (
            <>
              <div className="border-b border-black/5 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold">{active.subject}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#98A2B3]">
                      <span className="rounded bg-[#F2F4F7] px-1.5 py-0.5 text-[#667085]">
                        {tt(CATEGORY_LABEL[active.category] ?? active.category)}
                      </span>
                      <span>{active.user.nickname ?? active.user.username}</span>
                      <RevealPhone source="TICKET" id={active.id} masked={active.user.phone} />
                      <span>{date(active.createdAt, true)}</span>
                    </p>
                  </div>
                  {currentStatus ? (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${currentStatus.badge}`}
                    >
                      <CircleDot size={12} /> {tt(currentStatus.text)}
                    </span>
                  ) : null}
                </div>

                {/* 状态切换：当前态高亮不可点，其它为操作按钮 */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-[#98A2B3]">{tt('变更状态：')}</span>
                  {STATUS_ORDER.map((s) => {
                    const meta = STATUS_META[s];
                    const isCurrent = active.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={isCurrent || busy === 'status'}
                        onClick={() => askStatus(s)}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition ${
                          isCurrent
                            ? `${meta.badge} cursor-default`
                            : 'bg-white text-[#475467] ring-1 ring-black/10 hover:bg-brand-soft/50 hover:text-brand-deep'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {tt(meta.text)}
                        {isCurrent ? (
                          <span className="text-[10px] opacity-70">{tt('当前')}</span>
                        ) : null}
                      </button>
                    );
                  })}
                  {busy === 'status' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#98A2B3]">
                      <Loader2 size={12} className="animate-spin" /> {tt('提交中')}
                    </span>
                  ) : null}
                </div>

                {!activeInList && filter ? (
                  <p className="mt-2 rounded-md bg-[#FFF7E6] px-2.5 py-1.5 text-[11px] text-[#8A6A1F]">
                    {tt('该工单不在当前筛选结果内（可能刚被改到其它状态），列表已刷新。')}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-lg bg-[#F7F8F7] p-3 text-sm leading-6 text-[#475467]">
                  {active.content}
                </div>
                {active.replies.map((r) => {
                  const isAdmin = r.authorType === 'ADMIN';
                  return (
                    <div
                      key={r.id}
                      className={`rounded-lg p-3 text-sm leading-6 ${
                        isAdmin ? 'bg-brand-soft/70 text-[#0B3B27]' : 'bg-[#F7F8F7] text-[#475467]'
                      }`}
                    >
                      <p className="mb-1 flex items-center gap-1 text-[11px] text-[#98A2B3]">
                        <Clock3 size={11} />
                        {isAdmin ? tt('客服') : tt('用户')} · {date(r.createdAt, true)}
                      </p>
                      {r.content}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder={tt('输入回复内容…')}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void send();
                  }}
                />
                <button
                  type="button"
                  className="btn-primary h-10 px-4 text-[13px]"
                  onClick={() => void send()}
                  disabled={busy === 'reply' || !reply.trim()}
                >
                  {busy === 'reply' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {tt('回复')}
                </button>
              </div>
            </>
          ) : (
            <div className="grid place-items-center gap-2 py-16 text-center">
              <Inbox size={22} className="text-[#D0D5DD]" />
              <p className="text-sm text-[#98A2B3]">{tt('选择左侧工单查看详情')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 状态变更二次确认 */}
      {pending && active && pendingMeta ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-5">
          <div className="w-full max-w-[460px] rounded-card bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{tt('确认变更工单状态')}</h3>
                <p className="mt-1 text-sm text-[#667085]">
                  {tt('状态变更会通知用户，说明内容会作为客服回复展示在会话中。')}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[#98A2B3] hover:bg-black/5"
                onClick={() => setPending(null)}
                aria-label={tt('关闭')}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 rounded-lg bg-[#F7F8F7] px-3 py-3 text-sm">
              <span className={`rounded-full px-2.5 py-1 text-[12px] ${currentStatus?.badge ?? ''}`}>
                {currentStatus ? tt(currentStatus.text) : active.status}
              </span>
              <ArrowRight size={15} className="text-[#98A2B3]" />
              <span className={`rounded-full px-2.5 py-1 text-[12px] ${pendingMeta.badge}`}>
                {tt(pendingMeta.text)}
              </span>
            </div>

            {pending.status === 'CLOSED' ? (
              <div className="mt-4">
                <p className="text-xs text-[#667085]">{tt('常用说明')}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_NOTES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setPending({ ...pending, note: q })}
                      className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                        pending.note === q
                          ? 'bg-brand text-white'
                          : 'bg-white text-[#475467] ring-1 ring-black/10 hover:bg-brand-soft/50'
                      }`}
                    >
                      {tt(q)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              <label className="label">
                {tt('处理说明')}
                {pending.status === 'CLOSED' ? (
                  <span className="ml-1 text-red-500">{tt('*必填')}</span>
                ) : (
                  <span className="ml-1 text-[#98A2B3]">{tt('（选填，填写后会回复给用户）')}</span>
                )}
              </label>
              <textarea
                className="input min-h-[88px] resize-y py-2"
                placeholder={
                  pending.status === 'CLOSED'
                    ? tt('例如：已协助用户找回积分，问题闭环，工单关闭')
                    : tt('可补充处理进度，例如：已收到反馈，正在核查题库数据')
                }
                value={pending.note}
                maxLength={500}
                onChange={(e) => setPending({ ...pending, note: e.target.value })}
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-[#B4BCC8]">
                  {pending.status === 'CLOSED' && pending.note.trim().length < 2
                    ? tt('填写至少 2 个字后才能确认关闭')
                    : tt('说明会作为客服回复出现在会话中')}
                </span>
                <span className="text-[11px] text-[#B4BCC8]">{pending.note.length}/500</span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-ghost h-10 flex-1" onClick={() => setPending(null)}>
                {tt('取消')}
              </button>
              <button
                type="button"
                className="btn-primary h-10 flex-1"
                onClick={() => void confirmStatus()}
                disabled={
                  busy === 'status' ||
                  (pending.status === 'CLOSED' && pending.note.trim().length < 2)
                }
              >
                {busy === 'status' ? <Loader2 size={14} className="animate-spin" /> : null}
                {tt('确认变更')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
