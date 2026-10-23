'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ConfigItem {
  key: string;
  value: number | string | boolean;
  remark: string | null;
}

interface Activity {
  id: string;
  title: string;
  desc: string | null;
  points: number;
  startAt: string;
  endAt: string;
  enabled: boolean;
}

const LABELS: Record<string, string> = {
  'points.checkin_base': '签到基础积分',
  'points.checkin_streak_step': '连续签到每日递增',
  'points.checkin_streak_max_bonus': '连续签到递增封顶',
  'points.ad_reward': '看广告单次积分',
  'points.ad_daily_limit': '看广告每日次数',
  'points.like_reward': '点赞单次积分',
  'points.like_daily_limit': '点赞每日次数',
  'points.register_bonus': '新人注册赠送',
  'points.invite_reward': '邀请好友奖励',
  'points.quiz_reward_per_correct': '答题每题奖励积分',
};

function toLocal(dt: string) {
  return new Date(dt).toISOString().slice(0, 16);
}

export default function TasksPage() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', desc: '', points: 50, startAt: '', endAt: '' });

  const load = useCallback(async () => {
    try {
      const [cfg, acts] = await Promise.all([
        apiFetch<ConfigItem[]>('/admin/config?prefix=points.'),
        apiFetch<Activity[]>('/admin/activities'),
      ]);
      setItems(cfg);
      setActivities(acts);
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
          items: items.map((i) => ({ key: i.key, value: Number(i.value), remark: LABELS[i.key] ?? '' })),
        }),
      });
      setNotice('积分规则已保存（60 秒内生效）');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy('');
    }
  }

  async function saveActivity() {
    setBusy('activity');
    setError('');
    try {
      await apiFetch('/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          desc: form.desc || null,
          points: Number(form.points),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
        }),
      });
      setNotice('活动已创建');
      setForm({ title: '', desc: '', points: 50, startAt: '', endAt: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setBusy('');
    }
  }

  async function removeActivity(id: string) {
    setBusy(id);
    try {
      await apiFetch(`/admin/activities/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">积分任务</h1>
        <p className="mt-1 text-sm text-[#667085]">配置积分获取数值与运营活动；保存后 60 秒内生效</p>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">积分规则</h2>
          <button type="button" className="btn-primary h-9 px-4 text-[13px]" onClick={saveConfig} disabled={busy === 'config'}>
            {busy === 'config' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.key}>
              <label className="label">{LABELS[item.key] ?? item.key}</label>
              <input
                type="number"
                className="input"
                value={String(item.value)}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, value: Number(e.target.value) };
                  setItems(next);
                }}
              />
              <p className="mt-1 text-[11px] text-[#98A2B3]">{item.key}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-[15px] font-semibold">活动送积分</h2>

        <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_1fr_110px_150px_150px_auto]">
          <input className="input" placeholder="活动标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="说明（可选）" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          <input
            type="number"
            className="input"
            placeholder="积分"
            value={form.points}
            onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
          />
          <input
            type="datetime-local"
            className="input"
            value={form.startAt}
            onChange={(e) => setForm({ ...form, startAt: e.target.value })}
          />
          <input
            type="datetime-local"
            className="input"
            value={form.endAt}
            onChange={(e) => setForm({ ...form, endAt: e.target.value })}
          />
          <button
            type="button"
            className="btn-primary h-10 px-3 text-[13px]"
            onClick={saveActivity}
            disabled={busy === 'activity' || !form.title || !form.startAt || !form.endAt}
          >
            <Plus size={14} /> 新建
          </button>
        </div>

        <div className="mt-4 divide-y divide-black/5">
          {activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#98A2B3]">还没有活动</p>
          ) : (
            activities.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium">
                    {a.title}
                    {!a.enabled ? <span className="ml-2 text-xs text-red-500">已下线</span> : null}
                  </p>
                  <p className="text-xs text-[#98A2B3]">
                    +{a.points} 积分 · {new Date(a.startAt).toLocaleDateString('zh-CN')} 至{' '}
                    {new Date(a.endAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                {a.enabled ? (
                  <button
                    type="button"
                    className="text-[#98A2B3] hover:text-red-600"
                    onClick={() => removeActivity(a.id)}
                    disabled={busy === a.id}
                    title="下线活动"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
        <p className="mt-2 text-xs text-[#98A2B3]">
          提示：活动时间为本地时区；已领取的用户不会因下线而退回积分。
        </p>
      </div>
    </div>
  );
}
