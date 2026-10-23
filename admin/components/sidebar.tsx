'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ClipboardList,
  Coins,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquareText,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { BRAND } from '@quizpeak/shared';

const NAV = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/dashboard/quizzes', label: '题库管理', icon: ClipboardList },
  { href: '/dashboard/contests', label: '竞赛管理', icon: Trophy },
  { href: '/dashboard/members', label: '用户管理', icon: Users },
  { href: '/dashboard/points', label: '积分流水', icon: Coins },
  { href: '/dashboard/tasks', label: '积分任务', icon: Megaphone },
  { href: '/dashboard/search-history', label: '搜索记录', icon: Search },
  { href: '/dashboard/audit-logs', label: '操作审计', icon: ShieldCheck },
  { href: '/dashboard/sms', label: '短信记录', icon: MessageSquareText },
  { href: '/dashboard/tickets', label: '客服工单', icon: LifeBuoy },
  { href: '/dashboard/articles', label: '内容管理', icon: BookOpen },
  { href: '/dashboard/settings', label: '系统设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-black/5 bg-white px-3 py-5 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5C518] text-sm font-black text-white">
          知
        </span>
        <span className="text-[17px] font-bold">{BRAND.nameZh}</span>
        <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand">Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition',
                active
                  ? 'bg-brand text-white'
                  : 'text-[#475467] hover:bg-black/[0.04] hover:text-[#101828]',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg bg-brand-soft p-3 text-xs leading-5 text-[#4A6B5C]">
        <p className="font-medium text-[#0B3B27]">M1 骨架版本</p>
        <p className="mt-1">积分体系已替换原金币模式，充值/提现相关模块不再存在。</p>
      </div>
    </aside>
  );
}
