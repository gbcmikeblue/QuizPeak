'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
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
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { BRAND } from '@quizpeak/shared';

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  /** 二级菜单 */
  children?: Array<{ href: string; label: string }>;
}

const NAV: NavItem[] = [
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
  {
    label: '系统设置',
    icon: Settings,
    children: [
      { href: '/dashboard/settings', label: '站点与规则' },
      { href: '/dashboard/settings/badges', label: '徽章阈值' },
      { href: '/dashboard/settings/avatars', label: '头像库' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string[]>([]);

  // 当前路由所属分组自动展开
  useEffect(() => {
    for (const item of NAV) {
      if (!item.children) continue;
      if (item.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))) {
        setOpen((prev) => (prev.includes(item.label) ? prev : [...prev, item.label]));
      }
    }
  }, [pathname]);

  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-black/5 bg-white px-3 py-5 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5C518] text-sm font-black text-white">
          知
        </span>
        <span className="text-[17px] font-bold">{BRAND.nameZh}</span>
        <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand">Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;

          // 一级：普通菜单
          if (!item.href) {
            const expanded = open.includes(item.label);
            const groupActive = item.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));

            return (
              <div key={item.label} className="flex flex-col">
                <button
                  type="button"
                  onClick={() =>
                    setOpen((prev) => (prev.includes(item.label) ? prev.filter((x) => x !== item.label) : [...prev, item.label]))
                  }
                  className={clsx(
                    'flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition',
                    groupActive ? 'bg-brand-soft font-medium text-brand' : 'text-[#475467] hover:bg-black/[0.04] hover:text-[#101828]',
                  )}
                  aria-expanded={expanded}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown size={14} className={clsx('transition-transform', expanded ? 'rotate-180' : '')} />
                </button>

                {expanded ? (
                  <div className="mt-1 flex flex-col gap-0.5 border-l border-black/5 pl-3">
                    {item.children?.map((child) => {
                      // 子页路径是扁平的，用精确匹配避免父级同时高亮
                      const active = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={clsx(
                            'flex h-9 items-center rounded-lg px-3 text-[13px] transition',
                            active ? 'bg-brand text-white' : 'text-[#667085] hover:bg-black/[0.04] hover:text-[#101828]',
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          // 一级：普通链接
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition',
                active ? 'bg-brand text-white' : 'text-[#475467] hover:bg-black/[0.04] hover:text-[#101816]',
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg bg-brand-soft p-3 text-xs leading-5 text-[#4A6B5C]">
        <p className="font-medium text-[#0B3B27]">运营提示</p>
        <p className="mt-1">手机号默认脱敏，查看完整号码会记入「操作审计」。</p>
      </div>
    </aside>
  );
}
