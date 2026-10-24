'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2, Trash2, X } from 'lucide-react';
import { authFetch, getToken } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

interface Item {
  id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { tt } = useI18n();
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await authFetch<{ list: Item[]; total: number; unread: number }>('/notifications?page=1');
      setList(res.list);
      setTotal(res.total ?? res.list.length);
      setUnread(res.unread);
      // 同步顶部铃铛未读数
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?redirect=%2Fnotifications');
      return;
    }
    void load();
  }, [load, router]);

  async function readAll() {
    setBusy('read');
    try {
      await authFetch('/notifications/read-all', { method: 'POST', body: '{}' });
      await load();
      setNotice('已全部标为已读');
    } finally {
      setBusy('');
    }
  }

  /** 一键清理：删除全部通知（含未读） */
  async function clearAll() {
    setBusy('clear');
    try {
      const res = await authFetch<{ deleted: number }>('/notifications', { method: 'DELETE' });
      setConfirmClear(false);
      await load();
      setNotice(`已清理 ${res?.deleted ?? 0} 条通知`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '清理失败');
    } finally {
      setBusy('');
    }
  }

  async function removeOne(id: string) {
    setBusy(id);
    try {
      await authFetch(`/notifications/${id}`, { method: 'DELETE' });
      await load();
    } catch {
      /* 忽略：失败时保持原列表 */
    } finally {
      setBusy('');
    }
  }

  async function open(item: Item) {
    if (!item.isRead) {
      await authFetch(`/notifications/${item.id}/read`, { method: 'POST', body: '{}' });
    }
    if (item.link) {
      router.push(item.link);
      return;
    }
    await load();
  }

  return (
    <main className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tt('通知')}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {tt('共 {n} 条', { n: total })} · {tt('未读 {n} 条', { n: unread })}
          </p>
        </div>
        <div className="flex gap-2">
          {unread > 0 ? (
            <button
              type="button"
              className="btn-outline h-9 px-4 text-[13px]"
              onClick={() => void readAll()}
              disabled={busy === 'read'}
            >
              {busy === 'read' ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              {tt('全部已读')}
            </button>
          ) : null}
          {total > 0 ? (
            <button
              type="button"
              className="btn-outline h-9 px-4 text-[13px] text-[#B42318] hover:bg-red-50"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 size={14} /> {tt('一键清理')}
            </button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-[#0B3B27]">{notice}</p>
      ) : null}

      <div className="card mt-5 p-0">
        {loading ? (
          <p className="py-16 text-center text-sm text-[#667085]">加载中…</p>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={22} className="mx-auto text-[#D0D5DD]" />
            <p className="mt-3 text-sm text-[#98A2B3]">{tt('还没有通知')}</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {list.map((item) => (
              <div
                key={item.id}
                onClick={() => void open(item)}
                className="group flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition hover:bg-black/[0.02]"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-brand'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${item.isRead ? 'text-[#475467]' : 'font-medium'}`}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#667085]">{item.content}</p>
                  <p className="mt-1 text-[11px] text-[#98A2B3]">
                    {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <button
                  type="button"
                  title="删除这条通知"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeOne(item.id);
                  }}
                  className="mt-0.5 shrink-0 rounded-md p-1.5 text-[#B4BCC8] opacity-0 transition hover:bg-red-50 hover:text-[#B42318] group-hover:opacity-100"
                >
                  {busy === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-[#98A2B3]">
        {tt('通知会在客服回复工单、竞赛结算发奖时产生')} ·{' '}
        <Link href="/support" className="text-brand">
          {tt('我要反馈问题')}
        </Link>
      </p>

      {confirmClear ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-5">
          <div className="w-full max-w-[400px] rounded-card bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">{tt('确认清理全部通知？')}</h3>
              <button
                type="button"
                className="rounded-md p-1 text-[#98A2B3] hover:bg-black/5"
                onClick={() => setConfirmClear(false)}
                aria-label={tt('关闭')}
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              {tt('将删除全部 {n} 条通知（含 {m} 条未读），删除后不可恢复。', { n: total, m: unread })}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-outline h-10 flex-1"
                onClick={() => setConfirmClear(false)}
              >
                {tt('取消')}
              </button>
              <button
                type="button"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#B42318] text-sm font-medium text-white transition hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void clearAll()}
                disabled={busy === 'clear'}
              >
                {busy === 'clear' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {tt('确认清理')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
