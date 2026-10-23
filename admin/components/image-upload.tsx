'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { apiFetch, API_BASE } from '@/lib/api';

interface Props {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  /** 建议尺寸提示，例如 1200×400 */
  hint?: string;
}

/** 封面 / Banner 上传：选图 → base64 → /admin/upload → 回填 URL */
export function ImageUpload({ label = '封面 / Banner', value, onChange, hint = '建议 1200×400，PNG/JPG，≤2MB' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /** 大图先在前端缩到 1200px 宽，避免 base64 撑爆请求体 */
  async function shrink(file: File): Promise<string> {
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return raw;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('图片解析失败'));
      el.src = raw;
    });

    const maxW = 1200;
    const scale = Math.min(1, maxW / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async function pick(file: File) {
    setError('');
    if (file.size > 8 * 1024 * 1024) {
      setError('原图不能超过 8MB');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await shrink(file);
      if (dataUrl.length > 2.7 * 1024 * 1024) {
        throw new Error('压缩后仍超过 2MB，请换一张更小的图片');
      }
      const res = await apiFetch<{ url: string }>('/admin/upload', {
        method: 'POST',
        body: JSON.stringify({ dataUrl, name: file.name }),
      });
      onChange(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const preview = value ? (value.startsWith('http') ? value : `${API_BASE.replace(/\/api$/, '')}${value}`) : '';

  return (
    <div>
      <label className="label">{label}</label>

      {preview ? (
        <div className="mb-2 mt-1">
          <div className="relative inline-block max-w-full align-top">
            <div className="overflow-hidden rounded-lg border border-black/5 bg-[#F7F8F7]">
              {/* 按原始宽高比缩放展示，不拉伸不变形 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="封面预览" className="block max-h-[160px] w-auto max-w-[360px] object-contain" />
            </div>
            {/* X 外挂在图片右上角，不遮挡图内容 */}
            <button
              type="button"
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-black/10 bg-white text-[#475467] shadow-md transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => onChange('')}
              title="移除图片"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
          }}
        />
        <button type="button" className="btn-ghost h-9 px-3 text-[13px]" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {busy ? '上传中…' : value ? '更换图片' : '上传图片'}
        </button>
        <input
          className="input h-9 flex-1 text-[13px]"
          placeholder="或直接粘贴图片地址"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="mt-1 text-xs text-[#98A2B3]">
        {error || `${hint}；卡片按 3:1 比例裁切显示，非 3:1 的图会自动居中裁切`}
      </p>
    </div>
  );
}
