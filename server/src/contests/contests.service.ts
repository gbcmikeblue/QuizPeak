import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, ContestStatus, PointTxType, QuestionType } from '@prisma/client';
import { DEFAULT_RULES } from '@quizpeak/shared';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ContestAnswerInput {
  questionId: string;
  answer: string[];
  usedSec?: number;
}

type EffectiveStatus = 'UPCOMING' | 'RUNNING' | 'ENDED';

@Injectable()
export class ContestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
  ) {}

  async list(params: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 9), 1), 50);
    const rows = await this.prisma.contest.findMany({
      where: { status: { not: ContestStatus.DRAFT } },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { enrollments: true, questions: true, prizes: true } },
      },
      orderBy: [{ startAt: 'asc' }],
    });

    const mapped = rows
      .map((c) => this.toCard(c))
      .filter((c) => (params.status ? c.effectiveStatus === params.status : true));

    return {
      list: mapped.slice((page - 1) * pageSize, page * pageSize),
      total: mapped.length,
      page,
      pageSize,
    };
  }

  async detail(id: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        prizes: { orderBy: { rank: 'asc' } },
        _count: { select: { enrollments: true, questions: true } },
      },
    });
    if (!contest) throw new NotFoundException('竞赛不存在');

    return {
      ...this.toCard(contest),
      description: contest.description,
      questionsCount: contest._count.questions,
      prizes: contest.prizes.map((p) => ({ rank: p.rank, points: p.points, xp: p.xp })),
    };
  }

  /** 我的报名/作答状态 */
  async myState(id: string, userId: string) {
    const [enrollment, attempt] = await Promise.all([
      this.prisma.contestEnrollment.findUnique({ where: { userId_contestId: { userId, contestId: id } } }),
      this.prisma.contestAttempt.findUnique({ where: { userId_contestId: { userId, contestId: id } } }),
    ]);
    return {
      enrolled: Boolean(enrollment),
      enrolledAt: enrollment?.createdAt ?? null,
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            score: attempt.score,
            totalScore: attempt.totalScore,
            correctCount: attempt.correctCount,
            totalTimeSec: attempt.totalTimeSec,
            rank: attempt.rank,
            finishedAt: attempt.finishedAt,
          }
        : null,
    };
  }

  async leaderboard(id: string, page = 1, pageSize = 10) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contestAttempt.findMany({
        where: { contestId: id, status: AttemptStatus.FINISHED },
        orderBy: [{ score: 'desc' }, { totalTimeSec: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true, username: true, avatar: true } } },
      }),
      this.prisma.contestAttempt.count({ where: { contestId: id, status: AttemptStatus.FINISHED } }),
    ]);

    return {
      list: rows.map((r, i) => ({
        rank: (page - 1) * pageSize + i + 1,
        userId: r.userId,
        nickname: r.user.nickname ?? r.user.username,
        avatar: r.user.avatar,
        score: r.score,
        totalScore: r.totalScore,
        timeSec: r.totalTimeSec,
      })),
      total,
      page,
      pageSize,
    };
  }

  async enroll(id: string, userId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!contest) throw new NotFoundException('竞赛不存在');

    const effective = this.effectiveStatus(contest.startAt, contest.endAt, contest.status);
    if (effective === 'ENDED') throw new BadRequestException('竞赛已结束');
    if (contest.status === ContestStatus.SETTLED) throw new BadRequestException('竞赛已结束');

    const existing = await this.prisma.contestEnrollment.findUnique({
      where: { userId_contestId: { userId, contestId: id } },
    });
    if (existing) return { enrolled: true, replayed: true };

    if (contest._count.enrollments >= contest.capacity) throw new BadRequestException('名额已满');

    return this.prisma.$transaction(async (tx) => {
      if (contest.entryFee > 0) {
        await this.points.applyChange(tx, {
          userId,
          delta: -contest.entryFee,
          type: PointTxType.CONTEST_ENROLL,
          refType: 'contest',
          refId: contest.id,
          remark: `报名 ${contest.title}`,
        });
      }
      await tx.contestEnrollment.create({ data: { userId, contestId: id, feePaid: contest.entryFee } });
      return { enrolled: true, replayed: false, entryFee: contest.entryFee };
    });
  }

  /** 开始作答：需已报名、竞赛进行中，返回不含答案的题目 */
  async start(id: string, userId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: {
        questions: { include: { question: true }, orderBy: { sort: 'asc' } },
      },
    });
    if (!contest) throw new NotFoundException('竞赛不存在');

    const effective = this.effectiveStatus(contest.startAt, contest.endAt, contest.status);
    if (effective === 'UPCOMING') throw new ForbiddenException('竞赛还未开始');
    if (effective === 'ENDED') throw new ForbiddenException('竞赛已结束');

    const enrolled = await this.prisma.contestEnrollment.findUnique({
      where: { userId_contestId: { userId, contestId: id } },
    });
    if (!enrolled) throw new ForbiddenException('请先报名');

    if (contest.questions.length === 0) throw new BadRequestException('竞赛还没有题目');

    const running = await this.prisma.contestAttempt.findUnique({
      where: { userId_contestId: { userId, contestId: id } },
    });
    if (running?.status === AttemptStatus.FINISHED) {
      throw new BadRequestException('你已经完成本场竞赛');
    }

    const questions = contest.questions.map((cq) => cq.question);
    const attempt =
      running ??
      (await this.prisma.contestAttempt.create({
        data: {
          userId,
          contestId: id,
          totalScore: questions.reduce((s, q) => s + q.score, 0),
          questionIds: questions.map((q) => q.id),
        },
      }));

    const answered = await this.prisma.contestAnswer.findMany({ where: { attemptId: attempt.id } });

    return {
      attemptId: attempt.id,
      contest: { id: contest.id, title: contest.title },
      questionSeconds: DEFAULT_RULES.QUESTION_DURATION_SEC,
      endAt: contest.endAt,
      questions: questions.map((q) => ({ id: q.id, type: q.type, stem: q.stem, options: q.options, score: q.score })),
      answered: answered.map((a) => ({ questionId: a.questionId, answer: a.answer, isCorrect: a.isCorrect })),
    };
  }

  async answer(attemptId: string, userId: string, input: ContestAnswerInput) {
    const attempt = await this.prisma.contestAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) throw new NotFoundException('作答记录不存在');
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException('本场已结束');

    const question = await this.prisma.question.findUnique({ where: { id: input.questionId } });
    if (!question) throw new NotFoundException('题目不存在');

    const correctAnswer = (question.answer as string[]) ?? [];
    const isCorrect = this.compare(question.type, correctAnswer, input.answer ?? []);

    await this.prisma.contestAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: question.id } },
      create: {
        attemptId,
        questionId: question.id,
        answer: input.answer ?? [],
        isCorrect,
        usedSec: Math.min(input.usedSec ?? 0, DEFAULT_RULES.QUESTION_DURATION_SEC + 30),
      },
      update: { answer: input.answer ?? [], isCorrect },
    });

    return { isCorrect, correctAnswer, analysis: question.analysis, score: isCorrect ? question.score : 0 };
  }

  /** 交卷：计分、算排名、按名次发奖（同一 attempt 只发一次） */
  async finish(attemptId: string, userId: string) {
    const attempt = await this.prisma.contestAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true, contest: { include: { prizes: { orderBy: { rank: 'asc' } } } } },
    });
    if (!attempt || attempt.userId !== userId) throw new NotFoundException('作答记录不存在');
    if (attempt.status === AttemptStatus.FINISHED) throw new BadRequestException('本场已结束');

    const questionIds = (attempt.questionIds as string[]) ?? [];
    const questions = await this.prisma.question.findMany({ where: { id: { in: questionIds } } });
    const correct = attempt.answers.filter((a) => a.isCorrect);
    const score = questions
      .filter((q) => correct.some((a) => a.questionId === q.id))
      .reduce((s, q) => s + q.score, 0);
    const totalTimeSec = Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000));

    await this.prisma.contestAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.FINISHED,
        score,
        correctCount: correct.length,
        totalTimeSec,
        finishedAt: new Date(),
      },
    });

    const ahead = await this.prisma.contestAttempt.count({
      where: {
        contestId: attempt.contestId,
        status: AttemptStatus.FINISHED,
        id: { not: attemptId },
        OR: [{ score: { gt: score } }, { score, totalTimeSec: { lt: totalTimeSec } }],
      },
    });
    const rank = ahead + 1;
    await this.prisma.contestAttempt.update({ where: { id: attemptId }, data: { rank } });

    const prize = attempt.contest.prizes.find((p) => p.rank === rank);
    let pointsEarned = 0;
    let xpEarned = 0;
    if (prize) {
      pointsEarned = prize.points;
      xpEarned = prize.xp;
      if (pointsEarned > 0) {
        await this.points.change({
          userId,
          delta: pointsEarned,
          type: PointTxType.CONTEST_REWARD,
          refType: 'contest-attempt',
          refId: attemptId,
          remark: `${attempt.contest.title} 第 ${rank} 名奖励`,
        });
      }
      if (xpEarned > 0) {
        await this.prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpEarned } } });
      }
    }

    return {
      attemptId,
      score,
      totalScore: attempt.totalScore,
      correctCount: correct.length,
      total: questionIds.length,
      totalTimeSec,
      rank,
      pointsEarned,
      xpEarned,
    };
  }

  private effectiveStatus(startAt: Date, endAt: Date, status: ContestStatus): EffectiveStatus {
    const now = Date.now();
    if (status === ContestStatus.SETTLED || status === ContestStatus.ENDED || endAt.getTime() < now) return 'ENDED';
    if (startAt.getTime() > now) return 'UPCOMING';
    return 'RUNNING';
  }

  private toCard(contest: {
    id: string;
    title: string;
    cover: string | null;
    description: string | null;
    startAt: Date;
    endAt: Date;
    capacity: number;
    entryFee: number;
    prizePool: number;
    questionCount: number;
    durationSec: number;
    status: ContestStatus;
    category?: { id: string; name: string } | null;
    _count: { enrollments: number; questions?: number };
  }) {
    const effective = this.effectiveStatus(contest.startAt, contest.endAt, contest.status);
    return {
      id: contest.id,
      title: contest.title,
      cover: contest.cover,
      description: contest.description,
      category: contest.category ?? null,
      startAt: contest.startAt,
      endAt: contest.endAt,
      capacity: contest.capacity,
      entryFee: contest.entryFee,
      prizePool: contest.prizePool,
      questionCount: contest.questionCount,
      durationSec: contest.durationSec,
      enrolledCount: contest._count.enrollments,
      effectiveStatus: effective,
    };
  }

  private compare(type: QuestionType, correct: string[], user: string[]): boolean {
    const norm = (arr: string[]) => [...arr].map((v) => String(v).trim()).sort();
    if (type === QuestionType.MULTI) {
      const a = norm(correct);
      const b = norm(user);
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    return norm(correct)[0] === norm(user)[0];
  }
}
