'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ConfigItem {
  key: string;
  value: number | string | boolean;
  remark: string | null;
}

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

export default function SettingsPage() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [site, rule, badgeList] = await Promise.all([
        apiFetch<ConfigItem[]>('/admin/config?prefix=site.'),
        apiFetch<ConfigItem[]>('/admin/config?prefix=rule.'),
        apiFetch<Badge[]>('/admin/badges'),
      ]);
      setItems([...site, ...rule]);
      setBadges(badgeList);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

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
            remark: LABEL[i.key] ?? i.remark ?? '',
          })),
        }),
      });
      setNotice('站点配置已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy('');
    }
  }

  async function saveBadge(badge: Badge) {
    setBusy(badge.id);
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

  async function changePassword() {
    setBusy('pwd');
    setError('');
    try {
      await apiFetch('/admin/auth/password', { method: 'POST', body: JSON.stringify(pwd) });
      setNotice('密码已更新，下次登录请使用新密码');
      setPwd({ oldPassword: '', newPassword: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '修改失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">系统设置</h1>
        <p className="mt-1 text-sm text-[#667085]">站点信息、答题规则、徽章阈值与管理员密码</p>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">站点与规则</h2>
          <button type="button" className="btn-primary h-9 px-4 text-[13px]" onClick={saveConfig} disabled={busy === 'config'}>
            {busy === 'config' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.key}>
              <label className="label">{LABEL[item.key] ?? item.key}</label>
              <input
                className="input"
                type={TEXT_KEYS.has(item.key) ? 'text' : 'number'}
                value={String(item.value)}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, value: TEXT_KEYS.has(item.key) ? e.target.value : Number(e.target.value) };
                  setItems(next);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-black/5 px-4 py-3">
          <h2 className="text-[15px] font-semibold">徽章阈值</h2>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>徽章</th>
              <th>条件</th>
              <th className="w-[120px]">阈值</th>
              <th className="w-[90px]">已发放</th>
              <th className="w-[110px]">启用</th>
              <th className="w-[80px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {badges.map((b, index) => (
              <tr key={b.id}>
                <td>
                  <span className="mr-1">{b.icon}</span>
                  <span className="font-medium">{b.name}</span>
                </td>
                <td className="text-xs text-[#667085]">
                  {b.condition} ≥ {b.threshold}
                </td>
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
                <td className="text-sm">{b.awarded}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="text-[15px] font-semibold">修改管理员密码</h2>
        <p className="mt-1 text-xs text-[#98A2B3]">默认账号 admin / Admin@123456，上线前务必修改</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label className="label">原密码</label>
            <input
              type="password"
              className="input"
              value={pwd.oldPassword}
              onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">新密码（≥8 位，含字母和数字）</label>
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
              更新密码
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
