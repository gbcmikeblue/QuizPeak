import { BadRequestException, Injectable } from '@nestjs/common';
import { AttemptStatus } from '@prisma/client';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** 我的答题 / 竞赛记录 */
  async history(userId: string, type: 'quiz' | 'contest', page = 1, pageSize = 10) {
    if (type === 'contest') {
      const where = { userId, status: AttemptStatus.FINISHED };
      const [rows, total] = await this.prisma.$transaction([
        this.prisma.contestAttempt.findMany({
          where,
          include: { contest: { select: { id: true, title: true, startAt: true } } },
          orderBy: { finishedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.contestAttempt.count({ where }),
      ]);
      return {
        list: rows.map((r) => ({
          id: r.id,
          title: r.contest.title,
          targetId: r.contest.id,
          score: r.score,
          totalScore: r.totalScore,
          correctCount: r.correctCount,
          durationSec: r.totalTimeSec,
          rank: r.rank,
          time: r.finishedAt,
          kind: 'contest' as const,
        })),
        total,
        page,
        pageSize,
      };
    }

    const where = { userId, status: AttemptStatus.FINISHED };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quizAttempt.findMany({
        where,
        include: { quiz: { select: { id: true, title: true } }, level: { select: { levelNo: true } } },
        orderBy: { finishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quizAttempt.count({ where }),
    ]);
    return {
      list: rows.map((r) => ({
        id: r.id,
        title: r.quiz.title,
        targetId: r.quiz.id,
        levelNo: r.level?.levelNo ?? null,
        score: r.score,
        totalScore: r.totalScore,
        correctCount: r.correctCount,
        durationSec: r.durationSec,
        time: r.finishedAt,
        kind: 'quiz' as const,
      })),
      total,
      page,
      pageSize,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');
    if (user.passwordHash) {
      const ok = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!ok) throw new BadRequestException('原密码不正确');
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      throw new BadRequestException('新密码至少 8 位且包含字母和数字');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    return { success: true };
  }

  toProfile(user: User) {
    return {
      id: user.id,
      phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      address: user.address,
      points: user.points,
      totalEarned: user.totalEarned,
      likesReceived: user.likesReceived,
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      inviteCode: user.inviteCode,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    body: Partial<Pick<User, 'nickname' | 'firstName' | 'lastName' | 'avatar' | 'address'>>,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: body.nickname,
        firstName: body.firstName,
        lastName: body.lastName,
        avatar: body.avatar,
        address: body.address,
      },
    });
    return this.toProfile(user);
  }
}
