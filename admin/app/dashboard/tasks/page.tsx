'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch, getAdminProfile } from '@/lib/api';

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
  claimCount: number;
  notifiedCount: number;
}

/** 状态按时间自动判断（禁用优先） */
function statusOf(a: Activity) {
  if (!a.enabled) return { text: '已下线', cls: 'bg-[#F2F4F7] text-[#667085]' };
  const now = Date.now();
  if (new Date(a.startAt).getTime() > now) return { text: '未开始', cls: 'bg-[#FFF7E6] text-[#B7791F]' };
  if (new Date(a.endAt).getTime() < now) return { text: '已结束', cls: 'bg-[#F2F4F7] text-[#667085]' };
  return { text: '进行中', cls: 'bg-brand-soft text-brand' };
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
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 二次确认（本版本不流转给他人，由操作人自行确认） */
  const [confirm, setConfirm] = useState<
    { kind: 'create' } | { kind: 'delete'; id: string; title: string } | null
  >(null);
  /** 积分数值的修改需要 system 权限；运营（仅 tasks）只能查看 */
  const [canEditRules, setCanEditRules] = useState(false);

  useEffect(() => {
    setCanEditRules((getAdminProfile()?.permissions ?? []).includes('system'));
  }, []);

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

  /** 点「创建/保存」先弹二次确认，确认后才落库 */
  function requestSave() {
    setError('');
    if (!form.title.trim()) {
      setError('请填写活动标题');
      return;
    }
    if (!form.startAt || !form.endAt) {
      setError('请选择活动起止时间');
      return;
    }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    setConfirm({ kind: 'create' });
  }

  async function doSave() {
    setBusy('activity');
    setError('');
    try {
      await apiFetch('/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          title: form.title,
          desc: form.desc || null,
          points: Number(form.points),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
        }),
      });
      setNotice(editingId ? '活动已更新' : '活动已创建，并已向用户推送通知');
      setConfirm(null);
      setEditingId(null);
      setForm({ title: '', desc: '', points: 50, startAt: '', endAt: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy('');
    }
  }

  function editActivity(a: Activity) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      desc: a.desc ?? '',
      points: a.points,
      startAt: new Date(a.startAt).toISOString().slice(0, 16),
      endAt: new Date(a.endAt).toISOString().slice(0, 16),
    });
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ title: '', desc: '', points: 50, startAt: '', endAt: '' });
  }

  async function doRemove() {
    if (!confirm || confirm.kind !== 'delete') return;
    setBusy(confirm.id);
    try {
      await apiFetch(`/admin/activities/${confirm.id}`, { method: 'DELETE' });
      setNotice('活动已下线（数据保留，已领取的积分不回收）');
      setConfirm(null);
      if (editingId === confirm.id) cancelEdit();
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
          <div>
            <h2 className="text-[15px] font-semibold">积分规则</h2>
            {!canEditRules ? (
              <p className="mt-1 text-[11px] text-[#B7791F]">当前角色仅可查看数值，修改需要「系统设置」权限</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-primary h-9 px-4 text-[13px]"
            onClick={saveConfig}
            disabled={busy === 'config' || !canEditRules}
            title={canEditRules ? '保存积分数值' : '需要系统设置权限'}
          >
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
                disabled={!canEditRules}
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
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold">活动送积分</h2>
            <p className="mt-1 text-xs text-[#667085]">活动期内用户可自行领取一次，领取后该活动置灰不可重复领取</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-black/5 bg-[#FAFBFA] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#344054]">{editingId ? '编辑活动' : '新建活动'}</p>
            {editingId ? (
              <button type="button" className="text-[12px] text-[#667085] hover:text-brand" onClick={cancelEdit}>
                取消编辑
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">
                活动标题 <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="例如：新赛季冲榜活动"
                maxLength={60}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                奖励积分 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="50"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
              />
              <p className="mt-1 text-[11px] text-[#98A2B3]">用户领取后直接进入积分余额</p>
            </div>

            <div className="md:col-span-2">
              <label className="label">活动说明</label>
              <input
                className="input"
                placeholder="展示给用户的一句话说明，例如：活动期间完成任意一场答题即可领取"
                maxLength={500}
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                开始时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="input"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                结束时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="input"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] leading-5 text-[#98A2B3]">
              创建后立即出现在用户端「赚积分 → 活动」；活动期间每个账号只能领取一次，下线不影响已发放积分。
            </p>
            <button
              type="button"
              className="btn-primary h-10 shrink-0 px-4 text-[13px]"
              onClick={requestSave}
              disabled={busy === 'activity' || !form.title || !form.startAt || !form.endAt}
            >
              {busy === 'activity' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editingId ? '保存修改' : '创建活动'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[13px] font-medium text-[#344054]">已有活动（{activities.length}）</p>
          <span className="text-[11px] text-[#98A2B3]">按创建时间倒序</span>
        </div>

        <div className="mt-2 divide-y divide-black/5">
          {activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#98A2B3]">还没有活动</p>
          ) : (
            activities.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-[12px] font-semibold text-brand">
                    +{a.points}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{a.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${statusOf(a).cls}`}>
                        {statusOf(a).text}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#98A2B3]">
                      {new Date(a.startAt).toLocaleDateString('zh-CN')} 至 {new Date(a.endAt).toLocaleDateString('zh-CN')}
                      {a.desc ? ` · ${a.desc}` : ''}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#667085] tabular-nums">
                      <span>
                        已领取 <span className="font-medium text-[#0B3B27]">{a.claimCount}</span> 人
                      </span>
                      <span className="text-[#D0D5DD]">|</span>
                      <span>
                        已通知 <span className="font-medium text-[#0B3B27]">{a.notifiedCount}</span> 人
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[12px]">
                  <button type="button" className="text-brand hover:underline" onClick={() => editActivity(a)}>
                    编辑
                  </button>
                  {a.enabled ? (
                    <button
                      type="button"
                      className="text-[#98A2B3] hover:text-red-600"
                      onClick={() => setConfirm({ kind: 'delete', id: a.id, title: a.title })}
                      disabled={busy === a.id}
                      title="下线活动（需二次确认）"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <span className="text-[#D0D5DD]">已下线</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <p className="mt-2 text-xs text-[#98A2B3]">
          提示：活动时间为本地时区；下线后已领取的积分不回收，数据保留可查。
        </p>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-5">
          <div className="w-full max-w-[420px] rounded-card bg-white p-5">
            <h3 className="text-lg font-semibold">
              {confirm.kind === 'create' ? (editingId ? '确认保存修改' : '确认创建活动') : '确认下线活动'}
            </h3>
            <p className="mt-1 text-sm text-[#667085]">
              {confirm.kind === 'create'
                ? '本版本由你二次确认后直接生效，不流转给其他审核人。'
                : '下线后用户端不再展示，已发放积分不回收。'}
            </p>

            {confirm.kind === 'create' ? (
              <div className="mt-4 space-y-2 rounded-lg bg-[#F7F8F7] p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[#667085]">活动标题</span>
                  <span className="truncate font-medium">{form.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">奖励积分</span>
                  <span className="font-medium">+{form.points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">开始时间</span>
                  <span>{form.startAt.replace('T', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">结束时间</span>
                  <span>{form.endAt.replace('T', ' ')}</span>
                </div>
                {!editingId ? (
                  <p className="pt-1 text-[11px] text-[#98A2B3]">创建后将立即向全站用户推送站内通知</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[#F7F8F7] p-3 text-sm font-medium">{confirm.title}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-ghost h-10 flex-1" onClick={() => setConfirm(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary h-10 flex-1"
                onClick={() => (confirm.kind === 'create' ? void doSave() : void doRemove())}
                disabled={busy === 'activity' || (confirm.kind === 'delete' && busy === confirm.id)}
              >
                {busy === 'activity' || (confirm.kind === 'delete' && busy === confirm.id) ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {confirm.kind === 'create' ? (editingId ? '确认保存' : '确认创建') : '确认下线'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
