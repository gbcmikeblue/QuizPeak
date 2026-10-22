import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PointTxType, QuizStatus } from '@prisma/client';
import { DEFAULT_RULES, type QuizListQuery } from '@quizpeak/shared';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
  ) {}

  async list(query: QuizListQuery) {
    const { page = 1, pageSize = 9, categoryId, keyword, difficulty } = query;
    const where = {
      status: QuizStatus.PUBLISHED,
      ...(categoryId ? { categoryId } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' as const } },
              { titleEn: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quiz.findMany({
        where,
        include: { category: { select: { id: true, name: true, nameEn: true } } },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return { list: rows.map((q) => this.toCard(q)), total, page, pageSize };
  }

  async detail(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, nameEn: true } },
        levels: { orderBy: { levelNo: 'asc' } },
        _count: { select: { questions: true } },
      },
    });
    if (!quiz || quiz.status !== QuizStatus.PUBLISHED) {
      throw new NotFoundException('Quiz 不存在或已下架');
    }

    return {
      ...this.toCard(quiz),
      description: quiz.description,
      unlockThreshold: quiz.unlockThreshold,
      questionTotal: quiz._count.questions,
      levels: quiz.levels.map((l) => ({
        id: l.id,
        levelNo: l.levelNo,
        questionCount: l.questionCount,
        passThreshold: l.passThreshold,
      })),
    };
  }

  /** 报名（付费 Quiz 扣金币）；已报名且未过期则直接返回 */
  async enroll(quizId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({ where: { id: quizId } });
      if (!quiz || quiz.status !== QuizStatus.PUBLISHED) {
        throw new NotFoundException('Quiz 不存在或已下架');
      }

      const now = new Date();
      const existing = await tx.quizEnrollment.findUnique({
        where: { userId_quizId: { userId, quizId } },
      });
      if (existing && existing.expiresAt > now) {
        return { enrolled: true, replayed: true, expiresAt: existing.expiresAt };
      }

      const fee = existing ? 0 : quiz.enrollFee;
      if (fee > 0) {
        await this.points.applyChange(tx, {
          userId,
          delta: -fee,
          type: PointTxType.QUIZ_ENROLL,
          refType: 'quiz',
          refId: quiz.id,
          remark: `解锁 ${quiz.title}`,
        });
      }

      const expiresAt = new Date(
        now.getTime() + DEFAULT_RULES.ENROLL_VALID_DAYS * 24 * 60 * 60 * 1000,
      );
      const enrollment = await tx.quizEnrollment.upsert({
        where: { userId_quizId: { userId, quizId } },
        create: { userId, quizId, feePaid: fee, expiresAt },
        update: { expiresAt, feePaid: fee },
      });

      if (!existing) {
        await tx.quiz.update({
          where: { id: quizId },
          data: { playerCount: { increment: 1 } },
        });
      }

      return { enrolled: true, replayed: false, expiresAt: enrollment.expiresAt };
    });
  }

  private toCard(quiz: {
    id: string;
    title: string;
    titleEn: string | null;
    slug: string;
    cover: string | null;
    difficulty: string;
    durationSec: number;
    questionCount: number;
    levelsCount: number;
    enrollFee: number;
    playerCount: number;
    category?: { id: string; name: string; nameEn: string | null } | null;
  }) {
    return {
      id: quiz.id,
      title: quiz.title,
      titleEn: quiz.titleEn,
      slug: quiz.slug,
      cover: quiz.cover,
      difficulty: quiz.difficulty,
      durationSec: quiz.durationSec,
      questionCount: quiz.questionCount,
      levelsCount: quiz.levelsCount,
      enrollFee: quiz.enrollFee,
      playerCount: quiz.playerCount,
      category: quiz.category ?? null,
    };
  }
}
