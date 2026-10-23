'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Lock, LogOut, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { clearToken, getAdminProfile, getToken } from '@/lib/api';
import { PERMISSION_LABELS, requiredPermission } from '@/lib/permissions';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<{ name?: string; role?: string; roleLabel?: string; permissions?: string[] } | null>(
    null,
  );

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

  // 路由级权限守卫：无权限时直接给出说明，不让页面去请求接口再抛 403
  const need = requiredPermission(pathname);
  const allowed = !need || !admin?.permissions || admin.permissions.includes(need);

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
        <main className="min-w-0 flex-1 p-6">
          {allowed ? (
            children
          ) : (
            <div className="card mx-auto mt-16 max-w-[460px] text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F2F4F7] text-[#667085]">
                <Lock size={20} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">当前角色无权访问</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                你当前是「{admin?.roleLabel ?? admin?.role ?? '未知角色'}」，访问该页面需要「
                {need ? PERMISSION_LABELS[need] ?? need : '对应'}」权限。
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Link href="/dashboard" className="btn-primary h-10 px-4 text-[13px]">
                  返回仪表盘
                </Link>
                <button
                  type="button"
                  className="btn-ghost h-10 px-4 text-[13px]"
                  onClick={() => {
                    clearToken();
                    router.replace('/login');
                  }}
                >
                  <LogOut size={14} /> 换个账号
                </button>
              </div>
              <p className="mt-4 text-[11px] text-[#98A2B3]">如需该权限，请联系超级管理员在「管理员账号」里调整角色</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
