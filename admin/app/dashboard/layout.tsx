'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { clearToken, getAdminProfile, getToken } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setAdmin(getAdminProfile());
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[#667085]">
        <RefreshCw size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-black/5 bg-white px-6">
          <div className="text-sm text-[#667085]">知巅 运营后台</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#344054]">
              {admin?.name ?? '管理员'}
              <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                {admin?.role ?? 'OPERATOR'}
              </span>
            </span>
            <button
              type="button"
              className="btn-ghost h-9 px-3 text-[13px]"
              onClick={() => {
                clearToken();
                router.replace('/login');
              }}
            >
              <LogOut size={14} />
              退出
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
