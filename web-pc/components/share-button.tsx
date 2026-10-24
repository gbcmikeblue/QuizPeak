'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  title: string;
  text?: string;
  /** 相对路径，默认当前地址 */
  path?: string;
  className?: string;
}

/** 分享：优先系统分享面板，不支持则复制链接 */
export function ShareButton({ title, text, path, className = '' }: Props) {
  const { tt } = useI18n();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path ?? window.location.pathname}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch {
        // 用户取消或不支持，走复制
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(tt('复制链接分享给朋友'), url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border border-black/10 px-3 text-[13px] text-[#475467] transition hover:bg-black/[0.03] ${className}`}
      title={tt('分享')}
    >
      {copied ? <Check size={14} className="text-brand" /> : <Share2 size={14} />}
      {copied ? tt('链接已复制') : tt('分享')}
    </button>
  );
}
