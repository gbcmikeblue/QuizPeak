'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { RevealPhone } from '@/components/reveal-phone';

interface SmsRow {
  id: string;
  phone: string;
  scene: string;
  code: string;
  used: boolean;
  expired: boolean;
  expiresAt: string;
  createdAt: string;
}

interface SmsList {
  list: SmsRow[];
  total: number;
  page: number;
  pageSize: number;
  todayCount: number;
  devMode: boolean;
}

const SCENES = [
  { value: '', label: '全部场景' },
  { value: 'LOGIN', label: '登录' },
  { value: 'REGISTER', label: '注册' },
  { value: 'RESET_PASSWORD', label: '重置密码' },
  { value: 'BIND_PHONE', label: '绑定手机' },
];

export default function SmsPage() {
  const [data, setData] = useState<SmsList | null>(null);
  const [phone, setPhone] = useState('');
  const [scene, setScene] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (phone) query.set('phone', phone);
      if (scene) query.set('scene', scene);
      setData(await apiFetch<SmsList>(`/admin/sms?${query.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, phone, scene]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('复制失败，请手动选中复制');
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">短信记录</h1>
          <p className="mt-1 text-sm text-[#667085]">
            本地联调时在这里查看验证码；正式环境接入短信服务商后验证码自动脱敏。
          </p>
        </div>
        <div className="text-sm text-[#667085]">
          今日发送 <span className="font-semibold text-[#101828]">{data?.todayCount ?? '—'}</span> 条
        </div>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">手机号</label>
          <input
            className="input w-[180px]"
            value={phone}
            placeholder="模糊搜索"
            onChange={(e) => {
              setPhone(e.target.value.trim());
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="label">场景</label>
          <select
            className="input w-[150px]"
            value={scene}
            onChange={(e) => {
              setScene(e.target.value);
              setPage(1);
            }}
          >
            {SCENES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-ghost h-10" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
        {data && !data.devMode ? (
          <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <ShieldAlert size={14} /> 当前为生产模式，验证码已脱敏
          </span>
        ) : null}
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>发送时间</th>
              <th>手机号</th>
              <th>场景</th>
              <th>验证码</th>
              <th>有效期</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.length ? (
              data.list.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {new Date(row.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="font-medium">
                    <RevealPhone source="SMS" id={row.id} masked={row.phone} />
                  </td>
                  <td className="text-xs">{row.scene}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => copy(row.code)}
                      className="inline-flex items-center gap-2 rounded-md bg-brand-soft px-2.5 py-1 font-mono text-[15px] tracking-widest text-[#0B3B27] hover:bg-brand/15"
                      title="点击复制"
                    >
                      {row.code}
                      <Copy size={13} />
                      {copied === row.code ? <span className="text-[11px]">已复制</span> : null}
                    </button>
                  </td>
                  <td className="whitespace-nowrap text-xs text-[#667085]">
                    {new Date(row.expiresAt).toLocaleTimeString('zh-CN')}
                  </td>
                  <td>
                    {row.used ? (
                      <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-xs text-[#667085]">已使用</span>
                    ) : row.expired ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">已过期</span>
                    ) : (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">可立即使用</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? '加载中…' : '还没有短信记录，去用户端点一次「获取验证码」'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#667085]">
        <span>共 {data?.total ?? 0} 条</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost h-9 px-3 text-[13px]"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost h-9 px-3 text-[13px]"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
