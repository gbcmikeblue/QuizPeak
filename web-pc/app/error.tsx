'use client';

import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-black tracking-tight text-red-500/15">500</p>
      <h1 className="mt-4 text-xl font-bold">页面出了点问题</h1>
      <p className="mt-2 max-w-[420px] text-sm leading-6 text-[#667085]">
        我们已记录这次异常。你可以重试，如果反复出现，请通过客服工单反馈。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary h-10 px-5 text-[13px]">
          <RotateCcw size={14} /> 重试
        </button>
        <Link href="/" className="btn-outline h-10 px-5 text-[13px]">
          返回首页
        </Link>
        <Link href="/support" className="btn-outline h-10 px-5 text-[13px]">
          提交工单
        </Link>
      </div>
    </main>
  );
}
