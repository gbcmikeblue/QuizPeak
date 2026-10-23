/**
 * 后台角色与权限矩阵
 *
 * 设计：按「接口路径前缀」映射到权限点，在 AdminAuthGuard 里统一校验，
 * 新增后台接口只要落在已有前缀下就自动受控，不需要逐个控制器加装饰器。
 */

export type Permission =
  | 'dashboard'
  | 'quizzes'
  | 'contests'
  | 'users'
  | 'points'
  | 'tasks'
  | 'tickets'
  | 'sms'
  | 'content'
  | 'search'
  | 'audit'
  | 'system'
  | 'admins';

export const PERMISSION_LABELS: Record<Permission, string> = {
  dashboard: '仪表盘',
  quizzes: '题库管理',
  contests: '竞赛管理',
  users: '用户管理',
  points: '积分流水',
  tasks: '积分任务与活动',
  tickets: '客服工单',
  sms: '短信记录',
  content: '内容管理',
  search: '搜索记录',
  audit: '操作审计',
  system: '系统设置',
  admins: '管理员账号',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  OPERATOR: '运营',
  SUPPORT: '客服',
  FINANCE: '积分运营',
};

const ALL: Permission[] = [
  'dashboard',
  'quizzes',
  'contests',
  'users',
  'points',
  'tasks',
  'tickets',
  'sms',
  'content',
  'search',
  'audit',
  'system',
  'admins',
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ALL,
  // 运营：内容 + 题库 + 竞赛 + 活动，不能改站点配置、不能管管理员
  OPERATOR: ['dashboard', 'quizzes', 'contests', 'tasks', 'content', 'search', 'sms', 'users'],
  // 客服：工单、用户查询、短信记录，不看积分与配置
  SUPPORT: ['dashboard', 'tickets', 'users', 'search', 'sms'],
  // 积分运营：流水、任务、用户积分调整
  FINANCE: ['dashboard', 'points', 'tasks', 'users', 'audit'],
};

export function permissionsOf(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.SUPPORT ?? [];
}

export function canAccess(role: string, permission: Permission): boolean {
  return permissionsOf(role).includes(permission);
}

interface PathRule {
  test: RegExp;
  /** 读操作允许的权限（满足任一即可） */
  permissions: Permission[];
  /** 写操作（POST/PUT/PATCH/DELETE）需要的权限，缺省同 permissions */
  writePermissions?: Permission[];
}

/** 路径 → 权限点（按顺序匹配，先匹配先生效） */
const PATH_RULES: PathRule[] = [
  { test: /^\/admin\/auth(\/|$)/, permissions: [] }, // 登录 / me / 改密：仅需登录
  { test: /^\/admin\/dashboard/, permissions: ['dashboard'] },
  { test: /^\/admin\/(quizzes|questions|categories|upload)(\/|$)/, permissions: ['quizzes'] },
  { test: /^\/admin\/contests(\/|$)/, permissions: ['contests'] },
  { test: /^\/admin\/users(\/|$)/, permissions: ['users'] },
  { test: /^\/admin\/reveal-phone/, permissions: ['users'] },
  { test: /^\/admin\/point-transactions/, permissions: ['points'] },
  { test: /^\/admin\/activities/, permissions: ['tasks'] },
  { test: /^\/admin\/tickets(\/|$)/, permissions: ['tickets'] },
  { test: /^\/admin\/sms(\/|$)/, permissions: ['sms'] },
  { test: /^\/admin\/articles(\/|$)/, permissions: ['content'] },
  { test: /^\/admin\/search-history/, permissions: ['search'] },
  { test: /^\/admin\/audit-logs/, permissions: ['audit'] },
  // 积分数值属于「积分任务」页的依赖，运营（有 tasks 无 system）需要能读；
  // 但修改站点配置/规则仍只允许系统设置权限
  { test: /^\/admin\/config(\/|$)/, permissions: ['system', 'tasks'], writePermissions: ['system'] },
  { test: /^\/admin\/(badges|avatars)(\/|$)/, permissions: ['system'] },
  { test: /^\/admin\/admins(\/|$)/, permissions: ['admins'] },
];

/**
 * 解析某个后台路径需要的权限（满足任一即可）。
 * 返回空数组表示只校验登录态，返回 null 表示不额外校验。
 */
export function permissionForPath(path: string, method = 'GET'): Permission[] {
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  for (const rule of PATH_RULES) {
    if (!rule.test.test(path)) continue;
    if (!isWrite) return rule.permissions;
    return rule.writePermissions ?? rule.permissions;
  }
  return [];
}

/** 权限点文案（用于 403 提示，多个用「/」连接） */
export function permissionLabel(permissions: Permission[]): string {
  return permissions.map((p) => PERMISSION_LABELS[p]).join(' 或 ');
}
