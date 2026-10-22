import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuizStatus } from '@prisma/client';
import type {
  AdminLevelGenerateInput,
  AdminQuestionInput,
  AdminQuizUpsertInput,
} from '@quizpeak/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminQuizService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({
      where: { type: 'QUIZ', enabled: true },
      orderBy: { sort: 'asc' },
      select: { id: true, name: true, nameEn: true, icon: true },
    });
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
    categoryId?: string;
  }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 10), 1), 50);
    const where: Prisma.QuizWhereInput = {
      ...(params.status ? { status: params.status as QuizStatus } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.keyword
        ? {
            OR: [
              { title: { contains: params.keyword, mode: 'insensitive' } },
              { titleEn: { contains: params.keyword, mode: 'insensitive' } },
              { slug: { contains: params.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quiz.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { questions: true, levels: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      list: rows.map((q) => ({
        id: q.id,
        title: q.title,
        titleEn: q.titleEn,
        slug: q.slug,
        cover: q.cover,
        difficulty: q.difficulty,
        status: q.status,
        categoryName: q.category?.name ?? null,
        questionCount: q.questionCount,
        levelsCount: q.levelsCount,
        questionTotal: q._count.questions,
        levelTotal: q._count.levels,
        enrollFee: q.enrollFee,
        playerCount: q.playerCount,
        updatedAt: q.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async detail(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        levels: { orderBy: { levelNo: 'asc' }, include: { _count: { select: { questions: true } } } },
        _count: { select: { questions: true } },
      },
    });
    if (!quiz) throw new NotFoundException('题库不存在');

    return {
      id: quiz.id,
      title: quiz.title,
      titleEn: quiz.titleEn,
      slug: quiz.slug,
      cover: quiz.cover,
      description: quiz.description,
      categoryId: quiz.categoryId,
      categoryName: quiz.category?.name ?? null,
      difficulty: quiz.difficulty,
      status: quiz.status,
      enrollFee: quiz.enrollFee,
      levelsCount: quiz.levelsCount,
      questionCount: quiz.questionCount,
      unlockThreshold: quiz.unlockThreshold,
      playerCount: quiz.playerCount,
      questionTotal: quiz._count.questions,
      levels: quiz.levels.map((l) => ({
        id: l.id,
        levelNo: l.levelNo,
        questionCount: l.questionCount,
        passThreshold: l.passThreshold,
        questionTotal: l._count.questions,
      })),
    };
  }

  async create(input: AdminQuizUpsertInput) {
    const slug = input.slug ? await this.ensureSlug(input.slug) : await this.generateSlug();
    const quiz = await this.prisma.quiz.create({
      data: {
        title: input.title,
        titleEn: input.titleEn ?? null,
        slug,
        cover: input.cover ?? null,
        description: input.description ?? null,
        categoryId: input.categoryId ?? null,
        difficulty: input.difficulty,
        enrollFee: input.enrollFee,
        levelsCount: input.levelsCount,
        questionCount: input.questionCount,
        unlockThreshold: input.unlockThreshold,
        durationSec: input.questionCount * 120,
        status: input.status,
      },
    });
    return { id: quiz.id, slug: quiz.slug };
  }

  async update(id: string, input: AdminQuizUpsertInput) {
    await this.mustExist(id);
    const quiz = await this.prisma.quiz.update({
      where: { id },
      data: {
        title: input.title,
        titleEn: input.titleEn ?? null,
        cover: input.cover ?? null,
        description: input.description ?? null,
        categoryId: input.categoryId ?? null,
        difficulty: input.difficulty,
        enrollFee: input.enrollFee,
        levelsCount: input.levelsCount,
        questionCount: input.questionCount,
        unlockThreshold: input.unlockThreshold,
        durationSec: input.questionCount * 120,
        status: input.status,
      },
    });
    return { id: quiz.id };
  }

  /** 下架（软删除）：保留答题记录，前台不再展示 */
  async archive(id: string) {
    await this.mustExist(id);
    await this.prisma.quiz.update({ where: { id }, data: { status: QuizStatus.ARCHIVED } });
    return { archived: true };
  }

  /** 批量生成关卡 */
  async generateLevels(id: string, input: AdminLevelGenerateInput) {
    const quiz = await this.mustExist(id);
    for (let levelNo = 1; levelNo <= input.levels; levelNo += 1) {
      await this.prisma.quizLevel.upsert({
        where: { quizId_levelNo: { quizId: id, levelNo } },
        create: {
          quizId: id,
          levelNo,
          questionCount: input.questionCount,
          passThreshold: input.passThreshold,
        },
        update: input.overwrite
          ? { questionCount: input.questionCount, passThreshold: input.passThreshold }
          : {},
      });
    }
    await this.prisma.quiz.update({
      where: { id },
      data: {
        levelsCount: input.levels,
        questionCount: input.questionCount,
        unlockThreshold: input.passThreshold,
        durationSec: input.questionCount * 120,
      },
    });
    return { levels: input.levels, questionCount: input.questionCount, threshold: input.passThreshold, quizTitle: quiz.title };
  }

  async questions(quizId: string, levelId?: string, page = 1, pageSize = 20) {
    const where: Prisma.QuestionWhereInput = { quizId, ...(levelId ? { levelId } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: { level: { select: { levelNo: true } } },
        orderBy: [{ levelId: 'asc' }, { sort: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      list: rows.map((q) => ({
        id: q.id,
        levelId: q.levelId,
        levelNo: q.level?.levelNo ?? null,
        type: q.type,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        score: q.score,
        sort: q.sort,
        enabled: q.enabled,
      })),
      total,
      page,
      pageSize,
    };
  }

  async createQuestion(quizId: string, input: AdminQuestionInput) {
    await this.mustExist(quizId);
    if (input.levelId) await this.mustLevelBelong(quizId, input.levelId);

    const last = await this.prisma.question.findFirst({
      where: { quizId, levelId: input.levelId ?? null },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });

    const question = await this.prisma.question.create({
      data: {
        quizId,
        levelId: input.levelId ?? null,
        type: input.type,
        stem: input.stem,
        options: input.options,
        answer: input.answer,
        analysis: input.analysis ?? null,
        score: input.score,
        sort: (last?.sort ?? 0) + 1,
        enabled: input.enabled,
      },
    });
    return { id: question.id };
  }

  async updateQuestion(questionId: string, input: AdminQuestionInput) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('题目不存在');

    await this.prisma.question.update({
      where: { id: questionId },
      data: {
        type: input.type,
        stem: input.stem,
        options: input.options,
        answer: input.answer,
        analysis: input.analysis ?? null,
        score: input.score,
        enabled: input.enabled,
      },
    });
    return { id: questionId };
  }

  async removeQuestion(questionId: string) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('题目不存在');
    const used = await this.prisma.quizAnswer.count({ where: { questionId } });
    if (used > 0) {
      // 有作答记录时只下架，保证历史成绩可回顾
      await this.prisma.question.update({ where: { id: questionId }, data: { enabled: false } });
      return { removed: false, disabled: true };
    }
    await this.prisma.question.delete({ where: { id: questionId } });
    return { removed: true, disabled: false };
  }

  private async mustExist(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!quiz) throw new NotFoundException('题库不存在');
    return quiz;
  }

  private async mustLevelBelong(quizId: string, levelId: string) {
    const level = await this.prisma.quizLevel.findUnique({ where: { id: levelId } });
    if (!level || level.quizId !== quizId) throw new BadRequestException('关卡不属于该题库');
    return level;
  }

  private async ensureSlug(slug: string) {
    const exists = await this.prisma.quiz.findUnique({ where: { slug } });
    if (exists) throw new BadRequestException('slug 已被占用');
    return slug;
  }

  private async generateSlug() {
    for (let i = 0; i < 5; i += 1) {
      const candidate = `quiz-${Math.random().toString(36).slice(2, 8)}`;
      const exists = await this.prisma.quiz.findUnique({ where: { slug: candidate } });
      if (!exists) return candidate;
    }
    throw new BadRequestException('slug 生成失败，请手动填写');
  }
}
