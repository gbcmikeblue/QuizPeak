import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ContestUpsert {
  title: string;
  description?: string | null;
  cover?: string | null;
  categoryId?: string | null;
  startAt: string;
  endAt: string;
  capacity: number;
  entryFee: number;
  questionCount: number;
  prizePool: number;
  status?: ContestStatus;
  prizes?: Array<{ rank: number; points: number; xp: number }>;
}

@Injectable()
export class AdminContestService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { keyword?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 10), 1), 50);
    const where: Prisma.ContestWhereInput = params.keyword
      ? { title: { contains: params.keyword, mode: 'insensitive' } }
      : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contest.findMany({
        where,
        include: {
          _count: { select: { enrollments: true, attempts: true, questions: true } },
          prizes: { orderBy: { rank: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contest.count({ where }),
    ]);

    return {
      list: rows.map((c) => ({
        id: c.id,
        title: c.title,
        startAt: c.startAt,
        endAt: c.endAt,
        status: this.effectiveStatus(c.startAt, c.endAt, c.status),
        capacity: c.capacity,
        entryFee: c.entryFee,
        questionCount: c.questionCount,
        questionTotal: c._count.questions,
        enrolled: c._count.enrollments,
        attempts: c._count.attempts,
        prizePool: c.prizePool,
        prizeCount: c.prizes.length,
      })),
      total,
      page,
      pageSize,
    };
  }

  async detail(id: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: {
        prizes: { orderBy: { rank: 'asc' } },
        questions: { include: { question: { select: { id: true, stem: true, type: true } } }, orderBy: { sort: 'asc' } },
        _count: { select: { enrollments: true, attempts: true } },
      },
    });
    if (!contest) throw new NotFoundException('竞赛不存在');

    return {
      id: contest.id,
      title: contest.title,
      description: contest.description,
      cover: contest.cover,
      categoryId: contest.categoryId,
      startAt: contest.startAt,
      endAt: contest.endAt,
      capacity: contest.capacity,
      entryFee: contest.entryFee,
      prizePool: contest.prizePool,
      questionCount: contest.questionCount,
      status: this.effectiveStatus(contest.startAt, contest.endAt, contest.status),
      enrolled: contest._count.enrollments,
      attempts: contest._count.attempts,
      prizes: contest.prizes.map((p) => ({ rank: p.rank, points: p.points, xp: p.xp })),
      questions: contest.questions.map((q) => ({ id: q.questionId, stem: q.question.stem, type: q.question.type })),
    };
  }

  async create(input: ContestUpsert) {
    this.validate(input);
    const prizes = input.prizes?.length
      ? input.prizes
      : [
          { rank: 1, points: 1000, xp: 10000 },
          { rank: 2, points: 500, xp: 5000 },
          { rank: 3, points: 100, xp: 1000 },
        ];

    const contest = await this.prisma.contest.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        cover: input.cover ?? null,
        categoryId: input.categoryId ?? null,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        capacity: input.capacity,
        entryFee: input.entryFee,
        questionCount: input.questionCount,
        durationSec: input.questionCount * 120,
        prizePool: prizes.reduce((s, p) => s + p.points, 0),
        status: input.status ?? ContestStatus.UPCOMING,
        prizes: { create: prizes },
      },
    });
    return { id: contest.id };
  }

  async update(id: string, input: ContestUpsert) {
    this.validate(input);
    await this.mustExist(id);
    const prizes = input.prizes ?? [];

    await this.prisma.$transaction(async (tx) => {
      await tx.contest.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description ?? null,
          cover: input.cover ?? null,
          categoryId: input.categoryId ?? null,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          capacity: input.capacity,
          entryFee: input.entryFee,
          questionCount: input.questionCount,
          durationSec: input.questionCount * 120,
          ...(prizes.length ? { prizePool: prizes.reduce((s, p) => s + p.points, 0) } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });
      if (prizes.length) {
        await tx.contestPrize.deleteMany({ where: { contestId: id } });
        await tx.contestPrize.createMany({
          data: prizes.map((p) => ({ contestId: id, rank: p.rank, points: p.points, xp: p.xp })),
        });
      }
    });
    return { id };
  }

  /** 从题库按关卡抽题（随机 count 道） */
  async pickQuestions(id: string, params: { quizId: string; levelId?: string; count: number }) {
    await this.mustExist(id);
    const questions = await this.prisma.question.findMany({
      where: { quizId: params.quizId, enabled: true, ...(params.levelId ? { levelId: params.levelId } : {}) },
      select: { id: true },
    });
    if (questions.length === 0) throw new BadRequestException('该题库/关卡没有可用题目');

    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, Math.min(params.count, questions.length));

    await this.prisma.$transaction(async (tx) => {
      await tx.contestQuestion.deleteMany({ where: { contestId: id } });
      await tx.contestQuestion.createMany({
        data: shuffled.map((q, i) => ({ contestId: id, questionId: q.id, sort: i })),
      });
      await tx.contest.update({
        where: { id },
        data: { questionCount: shuffled.length, durationSec: shuffled.length * 120 },
      });
    });

    return { picked: shuffled.length, available: questions.length };
  }

  async leaderboard(id: string) {
    const rows = await this.prisma.contestAttempt.findMany({
      where: { contestId: id, status: 'FINISHED' },
      orderBy: [{ score: 'desc' }, { totalTimeSec: 'asc' }],
      take: 50,
      include: { user: { select: { nickname: true, username: true } } },
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      nickname: r.user.nickname ?? r.user.username,
      score: r.score,
      totalScore: r.totalScore,
      timeSec: r.totalTimeSec,
    }));
  }

  /** 关闭竞赛（不再接受答案） */
  async close(id: string) {
    await this.mustExist(id);
    await this.prisma.contest.update({ where: { id }, data: { status: ContestStatus.ENDED } });
    return { closed: true };
  }

  private validate(input: ContestUpsert) {
    const start = new Date(input.startAt).getTime();
    const end = new Date(input.endAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) throw new BadRequestException('时间格式不正确');
    if (end <= start) throw new BadRequestException('结束时间必须晚于开始时间');
    if (input.capacity < 1) throw new BadRequestException('名额必须大于 0');
  }

  private effectiveStatus(startAt: Date, endAt: Date, status: ContestStatus) {
    const now = Date.now();
    if (status === ContestStatus.SETTLED || status === ContestStatus.ENDED || endAt.getTime() < now) return 'ENDED';
    if (startAt.getTime() > now) return 'UPCOMING';
    return 'RUNNING';
  }

  private async mustExist(id: string) {
    const contest = await this.prisma.contest.findUnique({ where: { id }, select: { id: true } });
    if (!contest) throw new NotFoundException('竞赛不存在');
    return contest;
  }
}
