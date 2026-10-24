/** 全局枚举：数据库以字符串存储，前后端共用 */

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
}

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum QuizStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum QuestionType {
  SINGLE = 'SINGLE',
  MULTI = 'MULTI',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL = 'FILL',
}

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  ABANDONED = 'ABANDONED',
}

export enum ContestStatus {
  DRAFT = 'DRAFT',
  UPCOMING = 'UPCOMING',
  RUNNING = 'RUNNING',
  ENDED = 'ENDED',
  SETTLED = 'SETTLED',
}

/** 积分变动类型：全部为站内积分，不涉及任何货币 */
export enum PointTxType {
  /** 新用户注册赠送 */
  REGISTER_BONUS = 'REGISTER_BONUS',
  /** 每日签到 */
  CHECKIN = 'CHECKIN',
  /** 活动奖励 */
  ACTIVITY = 'ACTIVITY',
  /** 给上榜选手点赞 */
  LIKE_GIVEN = 'LIKE_GIVEN',
  /** 观看广告 */
  AD_REWARD = 'AD_REWARD',
  /** 邀请好友 */
  INVITE_REWARD = 'INVITE_REWARD',
  /** 答题奖励 */
  QUIZ_REWARD = 'QUIZ_REWARD',
  /** 报名 / 进入关卡消耗 */
  QUIZ_ENROLL = 'QUIZ_ENROLL',
  /** 竞赛报名消耗 */
  CONTEST_ENROLL = 'CONTEST_ENROLL',
  /** 竞赛名次奖励 */
  CONTEST_REWARD = 'CONTEST_REWARD',
  /** 提示消耗 */
  HINT_COST = 'HINT_COST',
  /** 后台调整 */
  ADMIN_ADJUST = 'ADMIN_ADJUST',
}

/** 积分获取任务类型（用于每日次数限制与幂等） */
export enum PointTaskType {
  CHECKIN = 'CHECKIN',
  AD = 'AD',
  LIKE = 'LIKE',
  ACTIVITY = 'ACTIVITY',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum GameCode {
  WORDLING = 'WORDLING',
  WORDLING_MIN = 'WORDLING_MIN',
  WORDLING_MAX = 'WORDLING_MAX',
  HEXLING = 'HEXLING',
}

export enum AdminRoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATOR = 'OPERATOR',
  SUPPORT = 'SUPPORT',
  FINANCE = 'FINANCE',
  EDITOR = 'EDITOR',
}

/**
 * 登录端标识：多端可同时在线，短信验证码的频控与记录按端隔离
 * （PC 网页 / H5 / 小程序 / App）
 */
export enum ClientCode {
  PC = 'PC',
  H5 = 'H5',
  MP = 'MP',
  APP = 'APP',
}

export const CLIENT_LABELS: Record<ClientCode, string> = {
  [ClientCode.PC]: 'PC 网页',
  [ClientCode.H5]: 'H5',
  [ClientCode.MP]: '小程序',
  [ClientCode.APP]: 'App',
};

/** 业务规则默认值（正式值存 site_config，后台可改） */
export const DEFAULT_RULES = {
  /** 单题答题时长（秒） */
  QUESTION_DURATION_SEC: 120,
  /** 关卡解锁所需的上一关正确率（0-100） */
  LEVEL_UNLOCK_PERCENT: 90,
  /** 每关题数 */
  QUESTIONS_PER_LEVEL: 8,
  /** Hint：每场免费次数 */
  HINT_FREE_PER_ATTEMPT: 1,
  /** Hint：超出后的积分单价 */
  HINT_POINT_COST: 10,
  /** Skip：每场最大次数 */
  SKIP_PER_ATTEMPT: 3,
  /** 报名后多少天内可免费重玩（天） */
  ENROLL_VALID_DAYS: 7,
  /** 切屏多少次作废成绩 */
  ANTI_CHEAT_SWITCH_LIMIT: 3,
  /** 积分流水每页条数 */
  PAGE_SIZE_DEFAULT: 10,

  /* ===== 积分获取（全部可在后台「积分任务」中调整） ===== */
  /** 每日签到基础积分 */
  CHECKIN_BASE_POINTS: 10,
  /** 连续签到每日递增积分（封顶见 MAX） */
  CHECKIN_STREAK_STEP: 2,
  /** 连续签到递增封顶 */
  CHECKIN_STREAK_MAX_BONUS: 20,
  /** 观看广告单次积分 */
  AD_REWARD_POINTS: 10,
  /** 观看广告每日次数 */
  AD_DAILY_LIMIT: 5,
  /** 给上榜选手点赞单次积分（给点赞者） */
  LIKE_REWARD_POINTS: 5,
  /** 点赞每日次数（防刷） */
  LIKE_DAILY_LIMIT: 5,
  /** 邀请好友通过首个关卡后，邀请人获得的积分 */
  INVITE_REWARD_POINTS: 100,
  /** 新用户注册赠送积分 */
  REGISTER_BONUS_POINTS: 100,
} as const;
