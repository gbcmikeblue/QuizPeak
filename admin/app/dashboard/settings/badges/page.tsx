'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Badge {
  id: string;
  code: string;
  name: string;
  desc: string;
  icon: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  awarded: number;
}

const TABS = [
  { href: '/dashboard/settings', label: '站点与规则' },
  { href: '/dashboard/settings/badges', label: '徽章阈值' },
  { href: '/dashboard/settings/avatars', label: '头像库' },
];

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setBadges(await apiFetch<Badge[]>('/admin/badges'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBadge(badge: Badge) {
    setBusy(badge.id);
    setError('');
    try {
      await apiFetch(`/admin/badges/${badge.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ threshold: badge.threshold, enabled: badge.enabled }),
      });
      setNotice(`徽章「${badge.name}」已更新`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">徽章阈值</h1>
        <p className="mt-1 text-sm text-[#667085]">调整达成条件与启停；徽章判定在用户进入「我的徽章」时惰性触发</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              tab.href === '/dashboard/settings/badges'
                ? 'rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white'
                : 'rounded-lg border border-black/10 px-3 py-1.5 text-[13px] text-[#475467] transition hover:border-brand/40 hover:text-brand'
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h2 className="text-[15px] font-semibold">徽章列表（{badges.length}）</h2>
          <button type="button" className="btn-ghost h-8 px-3 text-[12px]" onClick={() => void load()}>
            <RefreshCw size={13} /> 刷新
          </button>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>徽章</th>
              <th>条件</th>
              <th className="w-[120px]">阈值</th>
              <th className="w-[90px]">已发放</th>
              <th className="w-[80px]">启用</th>
              <th className="w-[80px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {badges.length ? (
              badges.map((b, index) => (
                <tr key={b.id}>
                  <td>
                    <span className="mr-1">{b.icon}</span>
                    <span className="font-medium">{b.name}</span>
                    <p className="mt-0.5 text-[11px] text-[#98A2B3]">{b.desc}</p>
                  </td>
                  <td className="text-xs text-[#667085]">{b.condition}</td>
                  <td>
                    <input
                      type="number"
                      className="input h-8"
                      value={b.threshold}
                      onChange={(e) => {
                        const next = [...badges];
                        next[index] = { ...b, threshold: Number(e.target.value) };
                        setBadges(next);
                      }}
                    />
                  </td>
                  <td className="text-sm tabular-nums">{b.awarded}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={b.enabled}
                      onChange={(e) => {
                        const next = [...badges];
                        next[index] = { ...b, enabled: e.target.checked };
                        setBadges(next);
                      }}
                    />
                  </td>
                  <td>
                    <button type="button" className="text-sm text-brand" onClick={() => saveBadge(b)} disabled={busy === b.id}>
                      保存
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[#98A2B3]">
                  暂无徽章数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
