/**
 * 后台页面 → 所需权限（与 server/src/common/admin-permissions.ts 的路径映射保持一致）
 * 仅用于前端路由守卫与菜单过滤；真正的拦截在服务端 AdminAuthGuard。
 */

export const PERMISSION_LABELS: Record<string, string> = {
  dashboard: '仪表盘',
  quizzes: '题库管理',
  contests: '竞赛管理',
  users: '用户管理',
  points: '积分流水',
  tasks: '积分任务',
  tickets: '客服工单',
  sms: '短信记录',
  content: '内容管理',
  search: '搜索记录',
  audit: '操作审计',
  system: '系统设置',
  admins: '管理员账号',
};

const RULES: Array<{ test: RegExp; perm: string }> = [
  { test: /^\/dashboard\/quizzes/, perm: 'quizzes' },
  { test: /^\/dashboard\/contests/, perm: 'contests' },
  { test: /^\/dashboard\/members/, perm: 'users' },
  { test: /^\/dashboard\/points/, perm: 'points' },
  { test: /^\/dashboard\/tasks/, perm: 'tasks' },
  { test: /^\/dashboard\/tickets/, perm: 'tickets' },
  { test: /^\/dashboard\/sms/, perm: 'sms' },
  { test: /^\/dashboard\/articles/, perm: 'content' },
  { test: /^\/dashboard\/search-history/, perm: 'search' },
  { test: /^\/dashboard\/audit-logs/, perm: 'audit' },
  { test: /^\/dashboard\/settings/, perm: 'system' },
  { test: /^\/dashboard\/admins/, perm: 'admins' },
];

/** 当前路径需要的权限；null 表示所有登录角色都可访问 */
export function requiredPermission(pathname: string): string | null {
  for (const rule of RULES) {
    if (rule.test.test(pathname)) return rule.perm;
  }
  return null;
}

/** 该角色第一个可访问的页面，用于「无权限」时给出返回入口 */
export function firstAllowedPath(permissions: string[]): string {
  const order = RULES.filter((r) => permissions.includes(r.perm)).map((r) => r.test.source);
  const hrefs = [
    { test: /quizzes/, href: '/dashboard/quizzes' },
    { test: /contests/, href: '/dashboard/contests' },
    { test: /members/, href: '/dashboard/members' },
    { test: /points/, href: '/dashboard/points' },
    { test: /tasks/, href: '/dashboard/tasks' },
    { test: /tickets/, href: '/dashboard/tickets' },
    { test: /sms/, href: '/dashboard/sms' },
    { test: /articles/, href: '/dashboard/articles' },
    { test: /search-history/, href: '/dashboard/search-history' },
    { test: /audit-logs/, href: '/dashboard/audit-logs' },
    { test: /settings/, href: '/dashboard/settings' },
    { test: /admins/, href: '/dashboard/admins' },
  ];
  for (const item of hrefs) {
    if (order.some((src) => src.includes(item.test.source.replace(/\\\//g, '/')))) return item.href;
  }
  return '/dashboard';
}
