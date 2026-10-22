import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PointTxType, Prisma } from '@prisma/client';
import {
  DEFAULT_RULES,
  type PointsSummary,
  type PointTaskProgress,
} from '@quizpeak/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface ChangePointsParams {
  userId: string;
  /** 正数为获得，负数为消耗 */
  delta: number;
  type: PointTxType;
  refType?: string;
  refId?: string;
  remark?: string;
}

const TZ = 'Asia/Shanghai';

function dateKey(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

@Injectable()
export class PointsService {
  private readonly configCache = new Map<string, { value: unknown; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /** 后台 site_config 中读取积分规则，60 秒缓存，缺省回落常量 */
  async rule(key: string, fallback: number): Promise<number> {
    const hit = this.configCache.get(key);
    if (hit && Date.now() - hit.at < 60_000) return Number(hit.value ?? fallback);
    const row = await this.prisma.siteConfig.findUnique({ where: { key } });
    const value = row ? Number(row.value as unknown) : fallback;
    this.configCache.set(key, { value, at: Date.now() });
    return Number.isFinite(value) ? value : fallback;
  }

  /** 积分变动的唯一入口：余额、流水、余额快照、累计获得保持强一致 */
  async change(params: ChangePointsParams) {
    return this.prisma.$transaction((tx) => this.applyChange(tx, params));
  }

  async applyChange(tx: Prisma.TransactionClient, params: ChangePointsParams) {
    const user = await tx.user.findUnique({
      where: { id: params.userId },
      select: { points: true },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const next = user.points + params.delta;
    if (next < 0) throw new BadRequestException('积分不足');

    const updated = await tx.user.updateMany({
      where: { id: params.userId, points: user.points },
      data: {
        points: next,
        ...(params.delta > 0 ? { totalEarned: { increment: params.delta } } : {}),
      },
    });
    if (updated.count === 0) throw new BadRequestException('操作过于频繁，请重试');

    return tx.pointTransaction.create({
      data: {
        userId: params.userId,
        change: params.delta,
        balanceAfter: next,
        type: params.type,
        refType: params.refType,
        refId: params.refId,
        remark: params.remark,
      },
    });
  }

  /** 每日签到：基础积分 + 连续签到递增（封顶） */
  async checkin(userId: string) {
    const today = dateKey();
    const base = await this.rule('points.checkin_base', DEFAULT_RULES.CHECKIN_BASE_POINTS);
    const step = await this.rule('points.checkin_streak_step', DEFAULT_RULES.CHECKIN_STREAK_STEP);
    const maxBonus = await this.rule(
      'points.checkin_streak_max_bonus',
      DEFAULT_RULES.CHECKIN_STREAK_MAX_BONUS,
    );

    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.dailyCheckin.findUnique({
        where: { userId_checkinDate: { userId, checkinDate: today } },
      });
      if (exists) throw new BadRequestException('今天已经签到过了');

      const last = await tx.dailyCheckin.findFirst({
        where: { userId },
        orderBy: { checkinDate: 'desc' },
      });
      const streakDay = last?.checkinDate === dateKey(-1) ? last.streakDay + 1 : 1;
      const points = base + Math.min((streakDay - 1) * step, maxBonus);

      await tx.dailyCheckin.create({
        data: { userId, checkinDate: today, streakDay, points },
      });
      const txRecord = await this.applyChange(tx, {
        userId,
        delta: points,
        type: PointTxType.CHECKIN,
        refType: 'checkin',
        refId: today,
        remark: `第 ${streakDay} 天签到`,
      });
      await tx.user.update({
        where: { id: userId },
        data: { streakDays: streakDay, lastCheckinAt: new Date() },
      });

      return { points, streakDay, balance: txRecord.balanceAfter };
    });
  }

  /** 观看广告领积分，按日限次 */
  async watchAd(userId: string) {
    const today = dateKey();
    const points = await this.rule('points.ad_reward', DEFAULT_RULES.AD_REWARD_POINTS);
    const limit = await this.rule('points.ad_daily_limit', DEFAULT_RULES.AD_DAILY_LIMIT);

    return this.prisma.$transaction(async (tx) => {
      const used = await tx.adView.count({ where: { userId, viewDate: today } });
      if (used >= limit) throw new BadRequestException('今日广告奖励次数已用完');

      const seq = used + 1;
      await tx.adView.create({ data: { userId, viewDate: today, seq, points } });
      const record = await this.applyChange(tx, {
        userId,
        delta: points,
        type: PointTxType.AD_REWARD,
        refType: 'ad',
        refId: `${today}#${seq}`,
        remark: '观看广告奖励',
      });

      return { points, used: seq, limit, balance: record.balanceAfter };
    });
  }

  /** 给上榜选手点赞：点赞者得积分，被点赞者人气 +1，按日限次且同一人每日一次 */
  async like(fromUserId: string, toUserId: string, targetType = 'LEADERBOARD_ALL', targetId?: string) {
    if (fromUserId === toUserId) throw new BadRequestException('不能给自己点赞');
    const today = dateKey();
    const points = await this.rule('points.like_reward', DEFAULT_RULES.LIKE_REWARD_POINTS);
    const limit = await this.rule('points.like_daily_limit', DEFAULT_RULES.LIKE_DAILY_LIMIT);

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: toUserId }, select: { id: true } });
      if (!target) throw new NotFoundException('选手不存在');

      const used = await tx.pointLike.count({ where: { fromUserId, likeDate: today } });
      if (used >= limit) throw new BadRequestException('今日点赞次数已用完');

      const dup = await tx.pointLike.findUnique({
        where: { fromUserId_toUserId_likeDate: { fromUserId, toUserId, likeDate: today } },
      });
      if (dup) throw new BadRequestException('今天已经给这位选手点过赞了');

      await tx.pointLike.create({
        data: { fromUserId, toUserId, targetType, targetId, points, likeDate: today },
      });
      await tx.user.update({
        where: { id: toUserId },
        data: { likesReceived: { increment: 1 } },
      });
      const record = await this.applyChange(tx, {
        userId: fromUserId,
        delta: points,
        type: PointTxType.LIKE_GIVEN,
        refType: 'like',
        refId: `${toUserId}#${today}`,
        remark: '为榜单选手点赞',
      });

      return { points, used: used + 1, limit, balance: record.balanceAfter };
    });
  }

  /** 活动领积分（每个活动每人一次） */
  async claimActivity(userId: string, activityId: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({ where: { id: activityId } });
      if (!activity || !activity.enabled) throw new NotFoundException('活动不存在或已下线');
      if (activity.startAt > now || activity.endAt < now) {
        throw new BadRequestException('活动不在进行中');
      }
      const claimed = await tx.activityReward.findUnique({
        where: { activityId_userId: { activityId, userId } },
      });
      if (claimed) throw new BadRequestException('该活动奖励已领取');

      await tx.activityReward.create({ data: { activityId, userId, points: activity.points } });
      const record = await this.applyChange(tx, {
        userId,
        delta: activity.points,
        type: PointTxType.ACTIVITY,
        refType: 'activity',
        refId: activityId,
        remark: activity.title,
      });
      return { points: activity.points, balance: record.balanceAfter };
    });
  }

  listActivities() {
    const now = new Date();
    return this.prisma.activity.findMany({
      where: { enabled: true, startAt: { lte: now }, endAt: { gte: now } },
      orderBy: { endAt: 'asc' },
      take: 10,
    });
  }

  /** 积分总览：余额、今日获得、任务进度 */
  async summary(userId: string): Promise<PointsSummary> {
    const today = dateKey();
    const startOfDay = new Date(`${today}T00:00:00+08:00`);
    const [user, adUsed, likeUsed, checkin, todayEarnedAgg, likePoints, adPoints, checkinBase] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.adView.count({ where: { userId, viewDate: today } }),
        this.prisma.pointLike.count({ where: { fromUserId: userId, likeDate: today } }),
        this.prisma.dailyCheckin.findUnique({
          where: { userId_checkinDate: { userId, checkinDate: today } },
        }),
        this.prisma.pointTransaction.aggregate({
          where: { userId, createdAt: { gte: startOfDay }, change: { gt: 0 } },
          _sum: { change: true },
        }),
        this.rule('points.like_reward', DEFAULT_RULES.LIKE_REWARD_POINTS),
        this.rule('points.ad_reward', DEFAULT_RULES.AD_REWARD_POINTS),
        this.rule('points.checkin_base', DEFAULT_RULES.CHECKIN_BASE_POINTS),
      ]);

    if (!user) throw new NotFoundException('用户不存在');

    const adLimit = await this.rule('points.ad_daily_limit', DEFAULT_RULES.AD_DAILY_LIMIT);
    const likeLimit = await this.rule('points.like_daily_limit', DEFAULT_RULES.LIKE_DAILY_LIMIT);

    const tasks: PointTaskProgress[] = [
      {
        type: 'CHECKIN',
        titleZh: '每日签到',
        titleEn: 'Daily check-in',
        points: checkinBase,
        dailyLimit: 1,
        usedToday: checkin ? 1 : 0,
        claimable: !checkin,
      },
      {
        type: 'AD',
        titleZh: '看广告得积分',
        titleEn: 'Watch an ad',
        points: adPoints,
        dailyLimit: adLimit,
        usedToday: adUsed,
        claimable: adUsed < adLimit,
      },
      {
        type: 'LIKE',
        titleZh: '给上榜选手点赞',
        titleEn: 'Like a top player',
        points: likePoints,
        dailyLimit: likeLimit,
        usedToday: likeUsed,
        claimable: likeUsed < likeLimit,
      },
    ];

    return {
      balance: user.points,
      earnedToday: todayEarnedAgg._sum.change ?? 0,
      checkedInToday: Boolean(checkin),
      streakDays: user.streakDays,
      tasks,
    };
  }

  async listTransactions(userId: string, page = 1, pageSize = 10) {
    const [list, total] = await this.prisma.$transaction([
      this.prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.pointTransaction.count({ where: { userId } }),
    ]);
    return { list, total, page, pageSize };
  }
}
