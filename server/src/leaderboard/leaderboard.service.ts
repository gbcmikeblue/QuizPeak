import { Injectable } from '@nestjs/common';
import { AttemptStatus, PointTxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LeaderboardPeriod = 'all' | 'month';

interface Row {
  userId: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
  points: number;
  likesReceived: number;
  quizzes: number;
  avgRate: number;
  metric: number;
  rank: number;
}

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 总榜按累计 XP，月榜按本月获得积分 */
  async list(period: LeaderboardPeriod, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    if (period === 'month') {
      const grouped = await this.prisma.pointTransaction.groupBy({
        by: ['userId'],
        where: {
          change: { gt: 0 },
          createdAt: { gte: monthStart() },
          type: { notIn: [PointTxType.ADMIN_ADJUST] },
        },
        _sum: { change: true },
        orderBy: { _sum: { change: 'desc' } },
        skip,
        take: pageSize,
      });

      const metricMap = new Map(grouped.map((g) => [g.userId, g._sum.change ?? 0]));
      const totalGroups = await this.prisma.pointTransaction.groupBy({
        by: ['userId'],
        where: { change: { gt: 0 }, createdAt: { gte: monthStart() } },
      });

      const rows = await this.buildRows(
        grouped.map((g) => g.userId),
        metricMap,
        skip,
      );
      return { list: rows, total: totalGroups.length, page, pageSize, period };
    }

    const users = await this.prisma.user.findMany({
      where: { xp: { gt: 0 } },
      orderBy: [{ xp: 'desc' }, { points: 'desc' }],
      skip,
      take: pageSize,
      select: { id: true, xp: true },
    });
    const total = await this.prisma.user.count({ where: { xp: { gt: 0 } } });
    const rows = await this.buildRows(
      users.map((u) => u.id),
      new Map(users.map((u) => [u.id, u.xp])),
      skip,
    );
    return { list: rows, total, page, pageSize, period };
  }

  /** 我的排名（两个榜单都返回） */
  async myRank(userId: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });
    if (!me) return { all: null, month: null };

    const allAhead = await this.prisma.user.count({ where: { xp: { gt: me.xp } } });

    const monthAhead = await this.prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: { change: { gt: 0 }, createdAt: { gte: monthStart() } },
      _sum: { change: true },
      having: { change: { _sum: { gt: 0 } } },
    });
    const myMonth = await this.prisma.pointTransaction.aggregate({
      where: { userId, change: { gt: 0 }, createdAt: { gte: monthStart() } },
      _sum: { change: true },
    });
    const mine = myMonth._sum.change ?? 0;
    const monthRank = monthAhead.filter((g) => (g._sum.change ?? 0) > mine).length;

    return {
      all: { rank: allAhead + 1, metric: me.xp, total: await this.prisma.user.count({ where: { xp: { gt: 0 } } }) },
      month: { rank: mine > 0 ? monthRank + 1 : null, metric: mine, total: monthAhead.length },
    };
  }

  private async buildRows(
    userIds: string[],
    metricMap: Map<string, number>,
    offset: number,
  ): Promise<Row[]> {
    if (userIds.length === 0) return [];

    const [users, attemptStats] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
          xp: true,
          points: true,
          likesReceived: true,
        },
      }),
      this.prisma.quizAttempt.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, status: AttemptStatus.FINISHED },
        _count: { _all: true },
        _sum: { score: true, totalScore: true },
      }),
    ]);

    return userIds
      .map((id, index) => {
        const user = users.find((u) => u.id === id);
        if (!user) return null;
        const stat = attemptStats.find((s) => s.userId === id);
        const totalScore = stat?._sum.totalScore ?? 0;
        const score = stat?._sum.score ?? 0;
        return {
          userId: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          xp: user.xp,
          points: user.points,
          likesReceived: user.likesReceived,
          quizzes: stat?._count._all ?? 0,
          avgRate: totalScore > 0 ? Math.round((score / totalScore) * 10000) / 100 : 0,
          metric: metricMap.get(id) ?? 0,
          rank: offset + index + 1,
        } satisfies Row;
      })
      .filter((row): row is Row => row !== null);
  }
}
