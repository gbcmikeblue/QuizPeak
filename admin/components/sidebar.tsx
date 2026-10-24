'use client';

import { useEffect, useMemo, useState } from 'react';
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
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { BRAND } from '@quizpeak/shared';
import { useI18n } from '@/lib/i18n';
import { getAdminProfile } from '@/lib/api';

interface NavChild {
  href: string;
  label: string;
  perm?: string;
}

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  /** 需要的权限点，缺省表示所有角色可见 */
  perm?: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/dashboard/quizzes', label: '题库管理', icon: ClipboardList, perm: 'quizzes' },
  { href: '/dashboard/contests', label: '竞赛管理', icon: Trophy, perm: 'contests' },
  { href: '/dashboard/members', label: '用户管理', icon: Users, perm: 'users' },
  { href: '/dashboard/points', label: '积分流水', icon: Coins, perm: 'points' },
  { href: '/dashboard/tasks', label: '积分任务', icon: Megaphone, perm: 'tasks' },
  { href: '/dashboard/search-history', label: '搜索记录', icon: Search, perm: 'search' },
  { href: '/dashboard/audit-logs', label: '操作审计', icon: ShieldCheck, perm: 'audit' },
  { href: '/dashboard/sms', label: '短信记录', icon: MessageSquareText, perm: 'sms' },
  { href: '/dashboard/tickets', label: '客服工单', icon: LifeBuoy, perm: 'tickets' },
  { href: '/dashboard/articles', label: '内容管理', icon: BookOpen, perm: 'content' },
  {
    label: '系统设置',
    icon: Settings,
    perm: 'system',
    children: [
      { href: '/dashboard/settings', label: '站点与规则', perm: 'system' },
      { href: '/dashboard/settings/badges', label: '徽章阈值', perm: 'system' },
      { href: '/dashboard/settings/avatars', label: '头像库', perm: 'system' },
    ],
  },
  { href: '/dashboard/admins', label: '管理员账号', icon: UserCog, perm: 'admins' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tt } = useI18n();
  const [open, setOpen] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [roleLabel, setRoleLabel] = useState('');

  // 登录信息在客户端本地，挂载后读取，避免 SSR 与服务端不一致
  useEffect(() => {
    const profile = getAdminProfile();
    setPermissions(profile?.permissions ?? []);
    setRoleLabel(profile?.roleLabel ?? '');
  }, []);

  const visibleNav = useMemo(() => {
    if (permissions === null) return [];
    const allowed = (perm?: string) => !perm || permissions.includes(perm);
    return NAV.filter((item) => allowed(item.perm))
      .map((item) =>
        item.children ? { ...item, children: item.children.filter((c) => allowed(c.perm)) } : item,
      )
      .filter((item) => !item.children || item.children.length > 0);
  }, [permissions]);

  useEffect(() => {
    for (const item of visibleNav) {
      if (!item.children) continue;
      if (item.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))) {
        setOpen((prev) => (prev.includes(item.label) ? prev : [...prev, item.label]));
      }
    }
  }, [pathname, visibleNav]);

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
        {visibleNav.map((item) => {
          const Icon = item.icon;

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
                  <span className="flex-1 text-left">{tt(item.label)}</span>
                  <ChevronDown size={14} className={clsx('transition-transform', expanded ? 'rotate-180' : '')} />
                </button>

                {expanded ? (
                  <div className="mt-1 flex flex-col gap-0.5 border-l border-black/5 pl-3">
                    {item.children?.map((child) => {
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
                          {tt(child.label)}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition',
                active ? 'bg-brand text-white' : 'text-[#475467] hover:bg-black/[0.04] hover:text-[#101828]',
              )}
            >
              <Icon size={16} />
              {tt(item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg bg-brand-soft p-3 text-xs leading-5 text-[#4A6B5C]">
        <p className="font-medium text-[#0B3B27]">{tt('当前角色')}</p>
        <p className="mt-1">{roleLabel || tt('加载中…')}</p>
        <p className="mt-1 text-[11px]">{tt('只能看到有权限的菜单，接口侧同样校验')}</p>
      </div>
    </aside>
  );
}
