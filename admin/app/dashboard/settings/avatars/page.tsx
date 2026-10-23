'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface AvatarItem {
  id: string;
  emoji: string;
  isDefault: boolean;
  enabled: boolean;
  usageCount: number;
}

const TABS = [
  { href: '/dashboard/settings', label: '站点与规则' },
  { href: '/dashboard/settings/badges', label: '徽章阈值' },
  { href: '/dashboard/settings/avatars', label: '头像库' },
];

export default function AvatarsPage() {
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const [newEmoji, setNewEmoji] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setAvatars(await apiFetch<AvatarItem[]>('/admin/avatars'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addAvatar() {
    const emoji = newEmoji.trim();
    if (!emoji) return;
    setError('');
    try {
      await apiFetch('/admin/avatars', { method: 'POST', body: JSON.stringify({ emoji }) });
      setNewEmoji('');
      setNotice('已新增头像');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失败');
    }
  }

  async function editAvatar(item: AvatarItem) {
    const next = window.prompt('修改头像 emoji（已使用该头像的用户会同步更新）', item.emoji);
    if (!next || next === item.emoji) return;
    setError('');
    try {
      const res = await apiFetch<{ migrated: number }>(`/admin/avatars/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ emoji: next }),
      });
      setNotice(res.migrated > 0 ? `已修改，${res.migrated} 位用户的头像同步更新` : '已修改');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '修改失败');
    }
  }

  async function removeAvatar(item: AvatarItem) {
    if (!window.confirm(`确认删除头像 ${item.emoji}？被用户使用的头像无法删除。`)) return;
    setError('');
    try {
      await apiFetch(`/admin/avatars/${item.id}`, { method: 'DELETE' });
      setNotice('已删除');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  }

  async function setDefaultAvatar(item: AvatarItem) {
    setError('');
    try {
      await apiFetch(`/admin/avatars/${item.id}`, { method: 'PATCH', body: JSON.stringify({ isDefault: true }) });
      setNotice(`已将 ${item.emoji} 设为默认头像，新注册用户会自动使用`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '设置失败');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">头像库</h1>
        <p className="mt-1 text-sm text-[#667085]">
          被用户使用的头像只能修改（改后引用者同步更新），不能删除；默认头像不可删除
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              tab.href === '/dashboard/settings/avatars'
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

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
          <h2 className="text-[15px] font-semibold">全部头像（{avatars.length}）</h2>
          <p className="mt-1 text-[11px] text-[#98A2B3]">
            粘贴一个 emoji 字符即可（不是图片，也不要填 <code>U+1F43C</code> 这类代码）
          </p>
        </div>
          <div className="flex items-center gap-2">
            <input
              className="input h-9 w-[120px] text-center text-lg"
              placeholder="🐲"
              maxLength={8}
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              title="直接粘贴一个 emoji 字符，例如 🐲"
            />
            <button type="button" className="btn-primary h-9 px-4 text-[13px]" onClick={addAvatar} disabled={!newEmoji.trim()}>
              <Plus size={14} /> 新增 emoji
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {avatars.map((item) => (
            <div
              key={item.id}
              className={`flex w-[132px] flex-col items-center gap-1 rounded-lg border p-2 ${
                item.isDefault ? 'border-brand bg-brand-soft' : 'border-black/5 bg-white'
              }`}
            >
              <span className="text-2xl leading-none">{item.emoji}</span>
              <span className="text-[11px] text-[#667085]">
                {item.isDefault ? '默认' : '可选'} · 用了 {item.usageCount} 人
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button type="button" className="text-brand" onClick={() => editAvatar(item)}>
                  修改
                </button>
                {!item.isDefault ? (
                  <>
                    <button type="button" className="text-[#667085]" onClick={() => setDefaultAvatar(item)}>
                      设默认
                    </button>
                    <button type="button" className="text-red-500" onClick={() => removeAvatar(item)}>
                      删除
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
