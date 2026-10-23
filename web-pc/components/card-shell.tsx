import Link from 'next/link';
import type { ReactNode } from 'react';
import { API_BASE } from '@/lib/api';

/** 上传接口返回的是 /api/uploads/xxx，需补全为可访问的绝对地址 */
function resolveCover(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//.test(src) || src.startsWith('data:')) return src;
  return `${API_BASE.replace(/\/api$/, '')}${src}`;
}

export interface CardShellProps {
  /** 详情页地址；为空则底部不渲染按钮 */
  href?: string;
  /** 底部右侧按钮文案 */
  actionLabel?: string;
  cover?: { src?: string | null; alt: string; fallback?: ReactNode };
  /** 封面左上角（状态/难度） */
  topLeft?: ReactNode;
  /** 封面右上角（分类） */
  topRight?: ReactNode;
  /** 封面底部（时长/人数等） */
  bottomLeft?: ReactNode;
  /** 标题上方的小字（文章分类等） */
  eyebrow?: ReactNode;
  title: string;
  description?: string | null;
  /** 一行元信息，超出省略 */
  meta?: ReactNode;
  /** 底部左侧信息（奖池 / 费用 / 时间） */
  footerLeft?: ReactNode;
}

/**
 * 列表卡片统一骨架：
 * 等高（h-full）+ 底部操作区贴底（mt-auto）+ 标题 1 行 / 描述 2 行固定高度，
 * 保证不同内容长度下按钮位置完全一致。
 */
export function CardShell({
  href,
  actionLabel = '查看详情',
  cover,
  topLeft,
  topRight,
  bottomLeft,
  eyebrow,
  title,
  description,
  meta,
  footerLeft,
}: CardShellProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-black/5 bg-white transition hover:border-brand/40 hover:shadow-[0_8px_24px_rgba(16,24,40,0.07)]">
      <div className="relative h-[140px] shrink-0 overflow-hidden bg-brand-soft">
        {resolveCover(cover?.src) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveCover(cover?.src)} alt={cover?.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-4xl">{cover?.fallback ?? '🧠'}</div>
        )}
        {topLeft ? <div className="absolute left-3 top-3">{topLeft}</div> : null}
        {topRight ? <div className="absolute right-3 top-3">{topRight}</div> : null}
        {bottomLeft ? <div className="absolute bottom-3 left-3 flex gap-2 text-[11px] text-white">{bottomLeft}</div> : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {eyebrow ? <div className="mb-1 min-h-[16px] truncate">{eyebrow}</div> : null}

        <h3 className="line-clamp-1 min-h-[22px] break-words text-[15px] font-semibold leading-[22px]">{title}</h3>

        <p className="mt-1 line-clamp-2 min-h-[40px] break-words text-xs leading-5 text-[#667085]">
          {description?.trim() || '暂无介绍'}
        </p>

        <div className="mt-2 min-h-[16px] truncate text-xs leading-4 text-[#98A2B3]">{meta}</div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/5 pt-3">
          <div className="min-w-0 flex-1 truncate text-xs text-[#475467] tabular-nums">{footerLeft}</div>
          {href ? (
            <Link
              href={href}
              className="flex h-8 shrink-0 items-center rounded-lg bg-brand px-3 text-[12px] font-medium text-white transition hover:bg-brand-deep"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
