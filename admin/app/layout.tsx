import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '知巅 管理后台',
  description: '知巅 答题竞赛平台运营后台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
