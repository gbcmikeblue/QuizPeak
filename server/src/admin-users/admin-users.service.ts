import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, PointTxType, Prisma, UserStatus } from '@prisma/client';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../prisma/prisma.service';

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
  ) {}

  async list(params: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 10), 1), 50);
    const where: Prisma.UserWhereInput = {
      ...(params.status ? { status: params.status as UserStatus } : {}),
      ...(params.keyword
        ? {
            OR: [
              { phone: { contains: params.keyword } },
              { username: { contains: params.keyword, mode: 'insensitive' } },
              { nickname: { contains: params.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          phone: true,
          username: true,
          nickname: true,
          points: true,
          totalEarned: true,
          xp: true,
          level: true,
          streakDays: true,
          likesReceived: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { quizAttempts: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      list: rows.map((u) => ({
        id: u.id,
        phone: maskPhone(u.phone),
        username: u.username,
        nickname: u.nickname,
        points: u.points,
        totalEarned: u.totalEarned,
        xp: u.xp,
        level: u.level,
        streakDays: u.streakDays,
        likesReceived: u.likesReceived,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        attempts: u._count.quizAttempts,
      })),
      total,
      page,
      pageSize,
    };
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        inviter: { select: { id: true, nickname: true, username: true } },
        _count: { select: { invitees: true, quizAttempts: true } },
      },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const [transactions, attempts] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId: id, status: AttemptStatus.FINISHED },
        orderBy: { finishedAt: 'desc' },
        take: 10,
        include: { quiz: { select: { title: true } }, level: { select: { levelNo: true } } },
      }),
    ]);

    return {
      id: user.id,
      phone: maskPhone(user.phone),
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      points: user.points,
      totalEarned: user.totalEarned,
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      likesReceived: user.likesReceived,
      inviteCode: user.inviteCode,
      inviter: user.inviter,
      inviteeCount: user._count.invitees,
      attemptCount: user._count.quizAttempts,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      transactions,
      attempts: attempts.map((a) => ({
        id: a.id,
        quizTitle: a.quiz.title,
        levelNo: a.level?.levelNo ?? null,
        score: a.score,
        totalScore: a.totalScore,
        finishedAt: a.finishedAt,
      })),
    };
  }

  async setStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.prisma.user.update({ where: { id }, data: { status } });
    return { id, status };
  }

  /** 人工调积分：必填理由，写 ADMIN_ADJUST 流水 */
  async adjustPoints(id: string, delta: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('请填写调整理由');
    if (!Number.isFinite(delta) || delta === 0) throw new BadRequestException('调整值不能为 0');

    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('用户不存在');

    const record = await this.points.change({
      userId: id,
      delta,
      type: PointTxType.ADMIN_ADJUST,
      remark: reason.trim(),
    });
    return { balance: record.balanceAfter, change: record.change };
  }

  /** 全站积分流水 */
  async transactions(params: {
    type?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const where: Prisma.PointTransactionWhereInput = {
      ...(params.type ? { type: params.type as PointTxType } : {}),
      ...(params.keyword
        ? {
            user: {
              OR: [
                { phone: { contains: params.keyword } },
                { nickname: { contains: params.keyword, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [rows, total, sum] = await this.prisma.$transaction([
      this.prisma.pointTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true, username: true, phone: true } } },
      }),
      this.prisma.pointTransaction.count({ where }),
      this.prisma.pointTransaction.aggregate({ where, _sum: { change: true } }),
    ]);

    return {
      list: rows.map((r) => ({
        id: r.id,
        type: r.type,
        change: r.change,
        balanceAfter: r.balanceAfter,
        remark: r.remark,
        createdAt: r.createdAt,
        user: {
          nickname: r.user.nickname,
          username: r.user.username,
          phone: maskPhone(r.user.phone),
        },
      })),
      total,
      page,
      pageSize,
      sum: sum._sum.change ?? 0,
    };
  }
}
