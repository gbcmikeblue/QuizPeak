'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * 后台手机号展示：默认显示脱敏值，点「查看完整」需二次确认，
 * 服务端会写审计日志（谁、何时、查看了哪条记录）。
 */
export function RevealPhone({
  source,
  id,
  masked,
  className = '',
}: {
  source: 'USER' | 'TICKET' | 'SMS';
  id: string;
  masked: string;
  className?: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function reveal() {
    const ok = window.confirm('查看完整手机号属于敏感操作，系统会记录操作日志。确认查看？');
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ phone: string }>('/admin/reveal-phone', {
        method: 'POST',
        body: JSON.stringify({ source, id }),
      });
      setValue(res.phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : '查看失败');
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
        {value}
        <button type="button" onClick={() => setValue(null)} className="text-[11px] text-[#98A2B3] hover:text-[#475467]">
          隐藏
        </button>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="tabular-nums text-[#667085]">{masked}</span>
      <button
        type="button"
        onClick={reveal}
        disabled={busy}
        className="shrink-0 text-[11px] text-brand hover:underline disabled:text-[#98A2B3]"
        title="查看完整号码（会记录审计日志）"
      >
        {busy ? '…' : '查看完整'}
      </button>
      {error ? <span className="text-[11px] text-red-500">{error}</span> : null}
    </span>
  );
}
