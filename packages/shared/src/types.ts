export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JwtPayload {
  sub: string;
  scope: 'user' | 'admin';
  roles?: string[];
  /** 登录端（PC / H5 / MP / APP），多端同时在线时用于区分令牌来源 */
  client?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CurrentUser {
  id: string;
  username: string;
  /** 站内积分，不可兑换任何货币 */
  points: number;
  xp: number;
  level: number;
}

/** 积分任务进度（签到 / 看广告 / 点赞 / 活动） */
export interface PointTaskProgress {
  type: 'CHECKIN' | 'AD' | 'LIKE' | 'ACTIVITY';
  titleZh: string;
  titleEn: string;
  points: number;
  dailyLimit: number;
  usedToday: number;
  claimable: boolean;
}

export interface PointsSummary {
  balance: number;
  earnedToday: number;
  checkedInToday: boolean;
  streakDays: number;
  tasks: PointTaskProgress[];
}

/** 难度 -> 展示色值（前端与后台共用） */
export const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: '#2E9E5B',
  INTERMEDIATE: '#2F6FE0',
  ADVANCED: '#E5484D',
};

/** 主色（与设计稿一致） */
export const BRAND_COLORS = {
  primary: '#0E8A52',
  primaryDeep: '#0B6E42',
  bgSoft: '#EAF4EE',
  cream: '#FDF8E7',
  danger: '#E5484D',
  warning: '#F5A623',
} as const;
