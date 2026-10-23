import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 后台可配置项：积分规则、站点信息、运营活动、徽章 */
@Injectable()
export class AdminConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** 按前缀读取配置（points. / site. / rule.） */
  async config(prefix?: string) {
    const rows = await this.prisma.siteConfig.findMany({
      where: prefix ? { key: { startsWith: prefix } } : {},
      orderBy: { key: 'asc' },
    });
    return rows.map((r) => ({ key: r.key, value: r.value, remark: r.remark }));
  }

  /** 批量写入（不存在则创建） */
  async saveConfig(items: Array<{ key: string; value: unknown; remark?: string }>) {
    for (const item of items) {
      await this.prisma.siteConfig.upsert({
        where: { key: item.key },
        create: { key: item.key, value: item.value as object, remark: item.remark ?? '' },
        update: { value: item.value as object, ...(item.remark ? { remark: item.remark } : {}) },
      });
    }
    return { saved: items.length };
  }

  async activities() {
    const [rows, claimed] = await Promise.all([
      this.prisma.activity.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.activityReward.groupBy({ by: ['activityId'], _count: { _all: true } }),
    ]);
    const claimMap = new Map(claimed.map((c) => [c.activityId, c._count._all]));

    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      titleEn: a.titleEn,
      desc: a.desc,
      points: a.points,
      startAt: a.startAt,
      endAt: a.endAt,
      enabled: a.enabled,
      /** 已领取人数 */
      claimCount: claimMap.get(a.id) ?? 0,
      /** 创建时推送通知覆盖的用户数 */
      notifiedCount: a.notifiedCount,
    }));
  }

  async saveActivity(input: {
    id?: string;
    title: string;
    titleEn?: string | null;
    desc?: string | null;
    points: number;
    startAt: string;
    endAt: string;
    enabled?: boolean;
  }) {
    const data = {
      title: input.title,
      titleEn: input.titleEn ?? null,
      desc: input.desc ?? null,
      points: input.points,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      enabled: input.enabled ?? true,
    };
    if (input.id) {
      const exists = await this.prisma.activity.findUnique({ where: { id: input.id } });
      if (!exists) throw new NotFoundException('活动不存在');
      await this.prisma.activity.update({ where: { id: input.id }, data });
      return { id: input.id };
    }
    const created = await this.prisma.activity.create({ data });

    // 新建活动后给全站正常用户推一条站内通知（下线/编辑不重复推）
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
      take: 5000,
    });
    if (users.length > 0) {
      await this.prisma.activity.update({
        where: { id: created.id },
        data: { notifiedCount: users.length },
      });
      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: 'ACTIVITY',
          title: `新活动：${created.title}`,
          content: created.desc ?? `领取可得 ${created.points} 积分，活动期内每人限领一次`,
          link: '/points',
        })),
      });
    }

    return { id: created.id, notified: users.length };
  }

  async removeActivity(id: string) {
    const exists = await this.prisma.activity.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('活动不存在');
    await this.prisma.activity.update({ where: { id }, data: { enabled: false } });
    return { disabled: true };
  }

  async badges() {
    const rows = await this.prisma.badge.findMany({ orderBy: { sort: 'asc' } });
    const counts = await this.prisma.userBadge.groupBy({ by: ['badgeId'], _count: { _all: true } });
    return rows.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      desc: b.desc,
      icon: b.icon,
      condition: b.condition,
      threshold: b.threshold,
      enabled: b.enabled,
      awarded: counts.find((c) => c.badgeId === b.id)?._count._all ?? 0,
    }));
  }

  async saveBadge(id: string, input: { threshold?: number; enabled?: boolean; desc?: string }) {
    const exists = await this.prisma.badge.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('徽章不存在');
    await this.prisma.badge.update({
      where: { id },
      data: {
        ...(typeof input.threshold === 'number' ? { threshold: input.threshold } : {}),
        ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
        ...(input.desc ? { desc: input.desc } : {}),
      },
    });
    return { id };
  }

  /** 概览统计（仪表盘用） */
  async dashboard() {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [users, todayUsers, attempts, todayAttempts, pointsToday, contests, quizzes, openTickets, pendingSettle] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: dayStart } } }),
        this.prisma.quizAttempt.count({ where: { status: 'FINISHED' } }),
        this.prisma.quizAttempt.count({ where: { status: 'FINISHED', finishedAt: { gte: dayStart } } }),
        this.prisma.pointTransaction.aggregate({
          where: { createdAt: { gte: dayStart }, change: { gt: 0 } },
          _sum: { change: true },
        }),
        this.prisma.contest.count(),
        this.prisma.quiz.count({ where: { status: 'PUBLISHED' } }),
        // 工单表尚未建（P1 做），先返回 0
        Promise.resolve(0),
        this.prisma.contest.count({ where: { status: { in: ['RUNNING', 'ENDED'] }, endAt: { lt: new Date() } } }),
      ]);

    return {
      users,
      todayUsers,
      attempts,
      todayAttempts,
      pointsToday: pointsToday._sum.change ?? 0,
      contests,
      quizzes,
      openTickets,
      pendingSettle,
    };
  }
}
