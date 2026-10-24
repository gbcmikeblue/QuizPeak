'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface ConfigItem {
  key: string;
  value: number | string | boolean;
  remark: string | null;
}

const TEXT_KEYS = new Set(['site.name', 'site.name_en', 'site.contact_phone', 'site.contact_email']);

const LABEL: Record<string, string> = {
  'site.name': '站点名称（中文）',
  'site.name_en': '站点名称（英文）',
  'site.contact_phone': '客服电话',
  'site.contact_email': '客服邮箱',
  'rule.question_duration_sec': '单题时长（秒）',
  'rule.level_unlock_percent': '关卡解锁正确率（%）',
  'rule.questions_per_level': '每关题数',
  'rule.hint_free_per_attempt': '每场免费提示次数',
  'rule.hint_point_cost': '提示消耗积分',
  'rule.skip_per_attempt': '每场跳过次数',
};

const TABS = [
  { href: '/dashboard/settings', label: '站点与规则' },
  { href: '/dashboard/settings/badges', label: '徽章阈值' },
  { href: '/dashboard/settings/avatars', label: '头像库' },
];

export default function SettingsPage() {
  const { tt } = useI18n();
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [site, rule] = await Promise.all([
        apiFetch<ConfigItem[]>('/admin/config?prefix=site.'),
        apiFetch<ConfigItem[]>('/admin/config?prefix=rule.'),
      ]);
      setItems([...site, ...rule]);
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    }
  }, [tt]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig() {
    setBusy('config');
    setError('');
    try {
      await apiFetch('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          items: items.map((i) => ({
            key: i.key,
            value: TEXT_KEYS.has(i.key) ? String(i.value) : Number(i.value),
            // remark 存中文原文，便于后台检索；展示层再走 tt()
            remark: LABEL[i.key] ?? i.remark ?? '',
          })),
        }),
      });
      setNotice(tt('站点配置已保存'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('保存失败'));
    } finally {
      setBusy('');
    }
  }

  async function changePassword() {
    setBusy('pwd');
    setError('');
    try {
      await apiFetch('/admin/auth/password', { method: 'POST', body: JSON.stringify(pwd) });
      setNotice(tt('密码已更新，下次登录请使用新密码'));
      setPwd({ oldPassword: '', newPassword: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('修改失败'));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{tt('系统设置')}</h1>
        <p className="mt-1 text-sm text-[#667085]">{tt('按模块拆分为三个子页，左侧菜单可展开切换')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              tab.href === '/dashboard/settings'
                ? 'rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white'
                : 'rounded-lg border border-black/10 px-3 py-1.5 text-[13px] text-[#475467] transition hover:border-brand/40 hover:text-brand'
            }
          >
            {tt(tab.label)}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p>
      ) : null}

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">{tt('站点与规则')}</h2>
            <p className="mt-1 text-xs text-[#667085]">
              {tt('保存后 60 秒内生效（规则带服务端缓存）')}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary h-9 px-4 text-[13px]"
            onClick={saveConfig}
            disabled={busy === 'config'}
          >
            {busy === 'config' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {tt('保存')}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.key}>
              <label className="label">{tt(LABEL[item.key] ?? item.key)}</label>
              <input
                className="input"
                type={TEXT_KEYS.has(item.key) ? 'text' : 'number'}
                value={String(item.value)}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = {
                    ...item,
                    value: TEXT_KEYS.has(item.key) ? e.target.value : Number(e.target.value),
                  };
                  setItems(next);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-[15px] font-semibold">{tt('修改管理员密码')}</h2>
        <p className="mt-1 text-xs text-[#98A2B3]">
          {tt('默认账号 admin / Admin@123456，上线前务必修改')}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label className="label">{tt('原密码')}</label>
            <input
              type="password"
              className="input"
              value={pwd.oldPassword}
              onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{tt('新密码（≥8 位，含字母和数字）')}</label>
            <input
              type="password"
              className="input"
              value={pwd.newPassword}
              onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-primary h-10 w-full"
              onClick={changePassword}
              disabled={busy === 'pwd' || !pwd.oldPassword || !pwd.newPassword}
            >
              {busy === 'pwd' ? <Loader2 size={14} className="animate-spin" /> : null}
              {tt('更新密码')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
