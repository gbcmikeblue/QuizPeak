'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { authFetch, getToken } from '@/lib/auth';

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
  const [list, setList] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await authFetch<{ list: Item[]; unread: number }>('/notifications?page=1');
      setList(res.list);
      setUnread(res.unread);
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
    await authFetch('/notifications/read-all', { method: 'POST', body: '{}' });
    await load();
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
          <h1 className="text-2xl font-bold">通知</h1>
          <p className="mt-1 text-sm text-[#667085]">未读 {unread} 条</p>
        </div>
        {unread > 0 ? (
          <button type="button" className="btn-outline h-9 px-4 text-[13px]" onClick={readAll}>
            <CheckCheck size={14} /> 全部已读
          </button>
        ) : null}
      </div>

      <div className="card mt-5 p-0">
        {loading ? (
          <p className="py-16 text-center text-sm text-[#667085]">加载中…</p>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={22} className="mx-auto text-[#D0D5DD]" />
            <p className="mt-3 text-sm text-[#98A2B3]">还没有通知</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-black/[0.02]"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-brand'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${item.isRead ? 'text-[#475467]' : 'font-medium'}`}>{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#667085]">{item.content}</p>
                  <p className="mt-1 text-[11px] text-[#98A2B3]">{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-[#98A2B3]">
        通知会在客服回复工单、竞赛结算发奖时产生 ·{' '}
        <Link href="/support" className="text-brand">
          我要反馈问题
        </Link>
      </p>
    </main>
  );
}
