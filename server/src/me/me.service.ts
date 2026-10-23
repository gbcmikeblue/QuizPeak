import { BadRequestException, Injectable } from '@nestjs/common';
import { AttemptStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';

const TYPES: Record<string, string> = { quiz: 'QUIZ', contest: 'CONTEST', article: 'ARTICLE' };

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** 收藏列表：按类型聚合真实内容 */
  async favorites(userId: string, type = 'quiz') {
    const targetType = TYPES[type] ?? 'QUIZ';
    const rows = await this.prisma.favorite.findMany({
      where: { userId, targetType },
      orderBy: { createdAt: 'desc' },
    });
    const ids = rows.map((r) => r.targetId);

    if (targetType === 'QUIZ') {
      const quizzes = await this.prisma.quiz.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          title: true,
          cover: true,
          difficulty: true,
          levelsCount: true,
          enrollFee: true,
          playerCount: true,
        },
      });
      return rows
        .map((r) => {
          const quiz = quizzes.find((q) => q.id === r.targetId);
          return quiz ? { ...quiz, targetType, favoritedAt: r.createdAt } : null;
        })
        .filter(Boolean);
    }

    if (targetType === 'CONTEST') {
      const contests = await this.prisma.contest.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, cover: true, startAt: true, endAt: true, entryFee: true, prizePool: true },
      });
      return rows
        .map((r) => {
          const c = contests.find((x) => x.id === r.targetId);
          return c ? { ...c, targetType, favoritedAt: r.createdAt } : null;
        })
        .filter(Boolean);
    }

    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, slug: true, summary: true, readMinutes: true },
    });
    return rows
      .map((r) => {
        const a = articles.find((x) => x.id === r.targetId);
        return a ? { ...a, targetType, favoritedAt: r.createdAt } : null;
      })
      .filter(Boolean);
  }

  /** 收藏 / 取消收藏（幂等切换） */
  async toggleFavorite(userId: string, targetType: string, targetId: string) {
    const type = (targetType ?? '').toUpperCase();
    if (!['QUIZ', 'CONTEST', 'ARTICLE'].includes(type)) throw new BadRequestException('不支持的收藏类型');

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: type, targetId } },
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.favorite.create({ data: { userId, targetType: type, targetId } });
    return { favorited: true };
  }

  async isFavorited(userId: string, targetType: string, targetId: string) {
    const hit = await this.prisma.favorite.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType: targetType.toUpperCase(), targetId },
      },
    });
    return { favorited: Boolean(hit) };
  }

  /** 徽章：惰性判定，达成即入库 */
  async badges(userId: string) {
    const [defs, user, quizFinished, perfect, top3] = await Promise.all([
      this.prisma.badge.findMany({ where: { enabled: true }, orderBy: { sort: 'asc' } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { streakDays: true, totalEarned: true, likesReceived: true } }),
      this.prisma.quizAttempt.count({ where: { userId, status: AttemptStatus.FINISHED } }),
      this.prisma.quizAttempt.count({
        where: { userId, status: AttemptStatus.FINISHED, score: { gt: 0 }, totalScore: { gt: 0 } },
      }),
      this.prisma.contestAttempt.count({ where: { userId, status: AttemptStatus.FINISHED, rank: { lte: 3 } } }),
    ]);

    // perfect 需要 score = totalScore，Prisma 不支持字段比较，单独查一次
    const perfectRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "QuizAttempt"
      WHERE "userId" = ${userId} AND status = 'FINISHED' AND score = "totalScore" AND "totalScore" > 0
    `;
    const perfectCount = Number(perfectRows[0]?.count ?? 0);

    const metrics: Record<string, number> = {
      QUIZ_COUNT: quizFinished,
      PERFECT_COUNT: perfectCount || perfect,
      STREAK_DAYS: user?.streakDays ?? 0,
      POINTS_EARNED: user?.totalEarned ?? 0,
      CONTEST_TOP3: top3,
      LIKES_RECEIVED: user?.likesReceived ?? 0,
    };

    const achieved = await this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } });
    const achievedSet = new Set(achieved.map((a) => a.badgeId));
    const newly: string[] = [];

    for (const def of defs) {
      const value = metrics[def.condition] ?? 0;
      if (value >= def.threshold && !achievedSet.has(def.id)) {
        await this.prisma.userBadge.create({ data: { userId, badgeId: def.id } }).catch(() => undefined);
        achievedSet.add(def.id);
        newly.push(def.code);
      }
    }

    for (const code of newly) {
      const def = defs.find((d) => d.code === code);
      if (!def) continue;
      await this.notifications.push(userId, 'BADGE', `获得新徽章：${def.name}`, def.desc, '/me?tab=badges', def.id);
    }

    return {
      newly,
      list: defs.map((def) => {
        const value = metrics[def.condition] ?? 0;
        return {
          code: def.code,
          name: def.name,
          nameEn: def.nameEn,
          desc: def.desc,
          icon: def.icon,
          threshold: def.threshold,
          progress: Math.min(value, def.threshold),
          achieved: achievedSet.has(def.id),
        };
      }),
    };
  }
}
