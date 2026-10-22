import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@quizpeak/shared';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: `${BRAND.nameZh} ${BRAND.nameEn} · 答题登顶`,
  description: '答题闯关、竞赛上榜，用积分赢取站内权益。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        {children}
        <footer className="mt-16 border-t border-black/5 bg-[#FAFBFA] py-10">
          <div className="container-page flex flex-col justify-between gap-4 text-sm text-[#667085] md:flex-row">
            <p>
              © {new Date().getFullYear()} {BRAND.nameZh} {BRAND.nameEn}. All rights reserved.
            </p>
            <div className="flex gap-5">
              <Link href="/about-us">关于我们</Link>
              <Link href="/contact">联系我们</Link>
              <Link href="/privacy-policy">隐私政策</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
