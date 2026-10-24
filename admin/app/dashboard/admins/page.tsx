'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';
import { apiFetch, getAdminProfile } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface AdminRow {
  id: string;
  username: string;
  name: string;
  role: string;
  roleLabel: string;
  status: 'ACTIVE' | 'BANNED';
  lastLoginAt: string | null;
  createdAt: string;
  permissions: string[];
}

interface RoleMatrix {
  role: string;
  label: string;
  permissions: string[];
}

const PERMISSION_LABEL: Record<string, string> = {
  dashboard: '仪表盘',
  quizzes: '题库',
  contests: '竞赛',
  users: '用户',
  points: '积分流水',
  tasks: '积分任务',
  tickets: '工单',
  sms: '短信',
  content: '内容',
  search: '搜索记录',
  audit: '审计',
  system: '系统设置',
  admins: '管理员账号',
};

export default function AdminsPage() {
  const { tt, date } = useI18n();
  const [list, setList] = useState<AdminRow[]>([]);
  const [matrix, setMatrix] = useState<RoleMatrix[]>([]);
  const [me, setMe] = useState<{ id?: string; role?: string } | null>(null);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'OPERATOR' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [rows, mtx] = await Promise.all([
        apiFetch<AdminRow[]>('/admin/admins'),
        apiFetch<{ roles: RoleMatrix[] }>('/admin/admins/matrix'),
      ]);
      setList(rows);
      setMatrix(mtx.roles);
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('加载失败'));
    }
  }, [tt]);

  useEffect(() => {
    setMe(getAdminProfile());
    void load();
  }, [load]);

  async function create() {
    setBusy('create');
    setError('');
    try {
      await apiFetch('/admin/admins', { method: 'POST', body: JSON.stringify(form) });
      setNotice(tt('已创建账号 {username}（{role}）', { username: form.username, role: form.role }));
      setForm({ username: '', name: '', password: '', role: 'OPERATOR' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('创建失败'));
    } finally {
      setBusy('');
    }
  }

  async function patch(id: string, body: Record<string, unknown>, tip: string) {
    setBusy(id);
    setError('');
    try {
      await apiFetch(`/admin/admins/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setNotice(tip);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('操作失败'));
    } finally {
      setBusy('');
    }
  }

  async function resetPassword(row: AdminRow) {
    const pwd = window.prompt(
      tt('为 {username} 设置新密码（≥8 位，含字母和数字）', { username: row.username }),
    );
    if (!pwd) return;
    setBusy(row.id);
    setError('');
    try {
      await apiFetch(`/admin/admins/${row.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: pwd }),
      });
      setNotice(tt('已重置 {username} 的密码', { username: row.username }));
    } catch (e) {
      setError(e instanceof Error ? e.message : tt('重置失败'));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{tt('管理员账号')}</h1>
        <p className="mt-1 text-sm text-[#667085]">
          {tt('按角色分配权限，菜单与接口同时生效；只有超级管理员能管理账号')}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p>
      ) : null}

      <div className="card">
        <h2 className="text-[15px] font-semibold">{tt('新建管理员')}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <div>
            <label className="label">{tt('用户名')}</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.trim() })}
              placeholder="ops01"
            />
          </div>
          <div>
            <label className="label">{tt('显示名称')}</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{tt('初始密码')}</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={tt('≥8 位含字母数字')}
            />
          </div>
          <div>
            <label className="label">{tt('角色')}</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {matrix.map((r) => (
                <option key={r.role} value={r.role}>
                  {tt(r.label)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-primary h-10 w-full text-[13px]"
              onClick={create}
              disabled={busy === 'create' || !form.username || !form.name || form.password.length < 8}
            >
              {busy === 'create' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {tt('创建')}
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-black/5 px-4 py-3">
          <h2 className="text-[15px] font-semibold">
            {tt('账号列表（{n}）', { n: list.length })}
          </h2>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>{tt('用户名')}</th>
              <th>{tt('名称')}</th>
              <th className="w-[170px]">{tt('角色')}</th>
              <th className="w-[90px]">{tt('状态')}</th>
              <th className="w-[150px]">{tt('最后登录')}</th>
              <th className="w-[150px]">{tt('操作')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => {
              const isSelf = me?.id === row.id;
              return (
                <tr key={row.id}>
                  <td className="font-medium">
                    {row.username}
                    {isSelf ? (
                      <span className="ml-1 text-[11px] text-[#98A2B3]">{tt('（自己）')}</span>
                    ) : null}
                  </td>
                  <td className="text-sm">{row.name}</td>
                  <td>
                    {isSelf ? (
                      <span className="text-sm">{tt(row.roleLabel)}</span>
                    ) : (
                      <select
                        className="input h-8 text-[13px]"
                        value={row.role}
                        onChange={(e) =>
                          patch(
                            row.id,
                            { role: e.target.value },
                            tt('已将 {username} 的角色改为 {role}', {
                              username: row.username,
                              role: e.target.value,
                            }),
                          )
                        }
                        disabled={busy === row.id}
                      >
                        {matrix.map((r) => (
                          <option key={r.role} value={r.role}>
                            {tt(r.label)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.status === 'ACTIVE'
                          ? 'bg-brand-soft text-brand'
                          : 'bg-[#F2F4F7] text-[#667085]'
                      }`}
                    >
                      {row.status === 'ACTIVE' ? tt('启用') : tt('已停用')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {row.lastLoginAt ? date(row.lastLoginAt, true) : tt('从未登录')}
                  </td>
                  <td>
                    <div className="flex items-center gap-3 text-[13px]">
                      <button
                        type="button"
                        className="text-brand"
                        onClick={() => resetPassword(row)}
                        disabled={busy === row.id}
                      >
                        {tt('重置密码')}
                      </button>
                      {!isSelf ? (
                        <button
                          type="button"
                          className={row.status === 'ACTIVE' ? 'text-red-500' : 'text-[#667085]'}
                          onClick={() =>
                            patch(
                              row.id,
                              { status: row.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE' },
                              row.status === 'ACTIVE'
                                ? tt('已停用 {username}', { username: row.username })
                                : tt('已启用 {username}', { username: row.username }),
                            )
                          }
                          disabled={busy === row.id}
                        >
                          {row.status === 'ACTIVE' ? tt('停用') : tt('启用')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand" />
          <h2 className="text-[15px] font-semibold">{tt('角色权限矩阵')}</h2>
        </div>
        <p className="mt-1 text-xs text-[#667085]">
          {tt('只读；权限点与接口路径绑定，改动需调整代码中的映射表')}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {matrix.map((role) => (
            <div key={role.role} className="rounded-lg border border-black/5 bg-[#FAFBFA] p-3">
              <p className="text-sm font-medium">{tt(role.label)}</p>
              <p className="mt-0.5 text-[11px] text-[#98A2B3]">{role.role}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {role.permissions.map((p) => (
                  <span
                    key={p}
                    className="rounded bg-white px-1.5 py-0.5 text-[11px] text-[#475467] ring-1 ring-black/5"
                  >
                    {tt(PERMISSION_LABEL[p] ?? p)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
