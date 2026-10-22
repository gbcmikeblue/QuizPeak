import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, PointTxType, QuestionType } from '@prisma/client';
import { DEFAULT_RULES } from '@quizpeak/shared';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SubmitAnswerInput {
  questionId: string;
  answer: string[];
  usedSec?: number;
}

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
  ) {}

  /** 开始某一关：校验报名、解锁状态，返回不含答案的题目 */
  async start(quizId: string, levelNo: number, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { levels: { where: { levelNo }, include: { questions: { where: { enabled: true }, orderBy: { sort: 'asc' } } } } },
    });
    if (!quiz) throw new NotFoundException('题库不存在');

    const level = quiz.levels[0];
    if (!level) throw new NotFoundException('关卡不存在');
    if (level.questions.length === 0) throw new BadRequestException('该关卡还没有题目');

    // 报名 / 解锁校验
    const enrollment = await this.prisma.quizEnrollment.findUnique({
      where: { userId_quizId: { userId, quizId } },
    });
    if (quiz.enrollFee > 0 && (!enrollment || enrollment.expiresAt < new Date())) {
      throw new ForbiddenException('请先解锁该题库');
    }
    if (levelNo > 1) {
      const unlocked = await this.isLevelUnlocked(userId, quizId, levelNo, quiz.unlockThreshold);
      if (!unlocked) throw new ForbiddenException(`上一关正确率达到 ${quiz.unlockThreshold}% 才能解锁`);
    }

    // 未完成的 attempt 直接复用，避免重复开新局
    const running = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId, levelId: level.id, status: AttemptStatus.IN_PROGRESS },
      orderBy: { startedAt: 'desc' },
    });

    const attempt =
      running ??
      (await this.prisma.quizAttempt.create({
        data: {
          userId,
          quizId,
          levelId: level.id,
          totalScore: level.questions.reduce((sum, q) => sum + q.score, 0),
          questionIds: level.questions.map((q) => q.id),
        },
      }));

    const answered = await this.prisma.quizAnswer.findMany({ where: { attemptId: attempt.id } });

    return {
      attemptId: attempt.id,
      quiz: { id: quiz.id, title: quiz.title, levelNo },
      questionSeconds: DEFAULT_RULES.QUESTION_DURATION_SEC,
      questions: level.questions.map((q) => ({
        id: q.id,
        type: q.type,
        stem: q.stem,
        options: q.options,
        score: q.score,
      })),
      answered: answered.map((a) => ({
        questionId: a.questionId,
        answer: a.answer,
        isCorrect: a.isCorrect,
        skipped: a.skipped,
      })),
    };
  }

  /** 提交单题，服务端判分并返回解析 */
  async submitAnswer(attemptId: string, userId: string, input: SubmitAnswerInput) {
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) throw new NotFoundException('作答记录不存在');
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException('本次作答已结束');

    const question = await this.prisma.question.findUnique({ where: { id: input.questionId } });
    if (!question) throw new NotFoundException('题目不存在');

    const correctAnswer = (question.answer as string[]) ?? [];
    const isCorrect = this.compare(question.type, correctAnswer, input.answer ?? []);

    await this.prisma.quizAnswer.upsert({
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

    return {
      isCorrect,
      correctAnswer,
      analysis: question.analysis,
      score: isCorrect ? question.score : 0,
    };
  }

  /** 跳过：记为未答，继续下一题 */
  async skip(attemptId: string, userId: string, questionId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) throw new NotFoundException('作答记录不存在');

    const used = await this.prisma.quizAnswer.count({ where: { attemptId, skipped: true } });
    if (used >= DEFAULT_RULES.SKIP_PER_ATTEMPT) throw new BadRequestException('跳过次数已用完');

    await this.prisma.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, answer: [], isCorrect: false, skipped: true },
      update: { answer: [], isCorrect: false, skipped: true },
    });
    return { skipped: true, left: DEFAULT_RULES.SKIP_PER_ATTEMPT - used - 1 };
  }

  /** 交卷：结算分数、首次通关奖励积分与 XP、写入历史 */
  async finish(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true, quiz: true, level: true },
    });
    if (!attempt || attempt.userId !== userId) throw new NotFoundException('作答记录不存在');
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException('本次作答已结束');

    const questionIds = (attempt.questionIds as string[]) ?? [];
    const questions = await this.prisma.question.findMany({ where: { id: { in: questionIds } } });
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
    const correct = attempt.answers.filter((a) => a.isCorrect);
    const correctScore = questions
      .filter((q) => correct.some((a) => a.questionId === q.id))
      .reduce((sum, q) => sum + q.score, 0);
    const rate = questionIds.length > 0 ? Math.round((correct.length / questionIds.length) * 1000) / 10 : 0;
    const durationSec = Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000));

    const finished = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.FINISHED,
        score: correctScore,
        totalScore,
        correctCount: correct.length,
        wrongCount: questionIds.length - correct.length,
        durationSec,
        finishedAt: new Date(),
      },
    });

    // 首次通关该关才发奖励，避免重复刷分
    const previous = await this.prisma.quizAttempt.count({
      where: { userId, levelId: attempt.levelId, status: AttemptStatus.FINISHED, id: { not: attemptId } },
    });

    let pointsEarned = 0;
    let xpEarned = 0;
    if (previous === 0 && attempt.level) {
      const perCorrect = await this.points.rule('points.quiz_reward_per_correct', 2);
      pointsEarned = correct.length * perCorrect;
      xpEarned = correct.length * 10;
      if (pointsEarned > 0) {
        await this.points.change({
          userId,
          delta: pointsEarned,
          type: PointTxType.QUIZ_REWARD,
          refType: 'attempt',
          refId: attempt.id,
          remark: `答题奖励 · ${attempt.quiz.title} 第 ${attempt.level.levelNo} 关`,
        });
      }
      if (xpEarned > 0) {
        await this.prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpEarned } } });
      }
    }

    const nextLevelUnlocked =
      attempt.level && rate >= attempt.quiz.unlockThreshold && attempt.level.levelNo < attempt.quiz.levelsCount;

    return {
      attemptId: finished.id,
      score: correctScore,
      totalScore,
      correctCount: correct.length,
      wrongCount: questionIds.length - correct.length,
      rate,
      durationSec,
      pointsEarned,
      xpEarned,
      nextLevelUnlocked,
    };
  }

  /** 答案回顾 */
  async review(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) throw new NotFoundException('作答记录不存在');

    const questionIds = (attempt.questionIds as string[]) ?? [];
    const questions = await this.prisma.question.findMany({ where: { id: { in: questionIds } } });
    const answers = await this.prisma.quizAnswer.findMany({ where: { attemptId } });

    return {
      attempt: {
        id: attempt.id,
        score: attempt.score,
        totalScore: attempt.totalScore,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        durationSec: attempt.durationSec,
        finishedAt: attempt.finishedAt,
      },
      items: questionIds.map((qid, index) => {
        const question = questions.find((q) => q.id === qid);
        const answer = answers.find((a) => a.questionId === qid);
        return {
          index: index + 1,
          questionId: qid,
          stem: question?.stem ?? '',
          options: question?.options ?? [],
          correctAnswer: question?.answer ?? [],
          userAnswer: answer?.answer ?? [],
          isCorrect: answer?.isCorrect ?? false,
          skipped: answer?.skipped ?? false,
          analysis: question?.analysis ?? '',
        };
      }),
    };
  }

  /** 用户在该题库的进度：每关是否解锁、最好成绩 */
  async progress(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { levels: { orderBy: { levelNo: 'asc' } } } });
    if (!quiz) throw new NotFoundException('题库不存在');

    const [enrollment, attempts] = await Promise.all([
      this.prisma.quizEnrollment.findUnique({ where: { userId_quizId: { userId, quizId } } }),
      this.prisma.quizAttempt.findMany({
        where: { userId, quizId, status: AttemptStatus.FINISHED },
        orderBy: { finishedAt: 'desc' },
      }),
    ]);

    const levels = quiz.levels.map((level) => {
      const levelAttempts = attempts.filter((a) => a.levelId === level.id);
      const best = levelAttempts.reduce(
        (acc, a) => {
          const rate = a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 1000) / 10 : 0;
          return rate > acc.rate ? { rate, score: a.score, totalScore: a.totalScore, attemptId: a.id } : acc;
        },
        { rate: 0, score: 0, totalScore: 0, attemptId: '' },
      );
      const previousBest = attempts
        .filter((a) => {
          const prev = quiz.levels.find((l) => l.id === a.levelId);
          return prev ? prev.levelNo === level.levelNo - 1 : false;
        })
        .reduce((max, a) => {
          const rate = a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 1000) / 10 : 0;
          return Math.max(max, rate);
        }, 0);

      return {
        levelNo: level.levelNo,
        questionCount: level.questionCount,
        passThreshold: level.passThreshold,
        unlocked: level.levelNo === 1 || previousBest >= quiz.unlockThreshold,
        best,
      };
    });

    return {
      quiz: { id: quiz.id, title: quiz.title, enrollFee: quiz.enrollFee, levelsCount: quiz.levelsCount },
      enrolled: Boolean(enrollment && enrollment.expiresAt > new Date()),
      expiresAt: enrollment?.expiresAt ?? null,
      levels,
    };
  }

  private async isLevelUnlocked(userId: string, quizId: string, levelNo: number, threshold: number) {
    const prevLevel = await this.prisma.quizLevel.findUnique({
      where: { quizId_levelNo: { quizId, levelNo: levelNo - 1 } },
    });
    if (!prevLevel) return false;

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, levelId: prevLevel.id, status: AttemptStatus.FINISHED },
    });
    return attempts.some((a) => a.totalScore > 0 && (a.score / a.totalScore) * 100 >= threshold);
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
