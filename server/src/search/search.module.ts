import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AdminUser, User } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

const keywordSchema = z.object({ keyword: z.string().trim().min(1, '请输入关键词').max(50) });

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /** 搜索结果：题库 / 竞赛 / 文章 */
  async search(q: string) {
    const keyword = (q ?? '').trim();
    if (!keyword) return { keyword, quizzes: [], contests: [], articles: [], total: 0 };

    const [quizzes, contests, articles] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: { contains: keyword, mode: 'insensitive' } }, { titleEn: { contains: keyword, mode: 'insensitive' } }] },
        take: 8,
        select: { id: true, title: true, cover: true, levelsCount: true, enrollFee: true, playerCount: true, difficulty: true },
      }),
      this.prisma.contest.findMany({
        where: { title: { contains: keyword, mode: 'insensitive' }, status: { not: 'DRAFT' } },
        take: 6,
        select: { id: true, title: true, cover: true, startAt: true, endAt: true, entryFee: true, prizePool: true },
      }),
      this.prisma.article.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [{ title: { contains: keyword, mode: 'insensitive' } }, { summary: { contains: keyword, mode: 'insensitive' } }],
        },
        take: 6,
        select: { id: true, title: true, slug: true, summary: true, readMinutes: true },
      }),
    ]);

    return { keyword, quizzes, contests, articles, total: quizzes.length + contests.length + articles.length };
  }

  /** 输入联想：内容标题 + 站内热词 */
  async suggest(q: string) {
    const keyword = (q ?? '').trim();
    if (!keyword) {
      const hot = await this.prisma.searchHistory.groupBy({
        by: ['keyword'],
        _count: { _all: true },
        orderBy: { _count: { keyword: 'desc' } },
        take: 8,
      });
      return hot.map((h) => ({ text: h.keyword, type: 'HOT' as const }));
    }

    const [quizzes, contests, articles] = await Promise.all([
      this.prisma.quiz.findMany({ where: { status: 'PUBLISHED', title: { contains: keyword, mode: 'insensitive' } }, take: 4, select: { title: true } }),
      this.prisma.contest.findMany({ where: { title: { contains: keyword, mode: 'insensitive' } }, take: 3, select: { title: true } }),
      this.prisma.article.findMany({ where: { status: 'PUBLISHED', title: { contains: keyword, mode: 'insensitive' } }, take: 3, select: { title: true } }),
    ]);

    const list = [
      ...quizzes.map((x) => ({ text: x.title, type: 'QUIZ' as const })),
      ...contests.map((x) => ({ text: x.title, type: 'CONTEST' as const })),
      ...articles.map((x) => ({ text: x.title, type: 'ARTICLE' as const })),
    ];
    const seen = new Set<string>();
    return list.filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true))).slice(0, 8);
  }

  async history(userId: string) {
    const rows = await this.prisma.searchHistory.findMany({
      where: { userId, deletedByUser: false },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    });
    return rows.map((r) => ({ id: r.id, keyword: r.keyword, updatedAt: r.updatedAt }));
  }

  /** 记录搜索词（同词只保留一条，重新搜索会恢复被删除的可见性） */
  async record(userId: string, keyword: string) {
    const word = keyword.trim();
    if (!word) throw new BadRequestException('请输入关键词');
    await this.prisma.searchHistory.upsert({
      where: { userId_keyword: { userId, keyword: word } },
      create: { userId, keyword: word },
      update: { deletedByUser: false },
    });
    return { ok: true };
  }

  /** 用户删除：软删除，后台仍可见 */
  async removeOne(userId: string, id: string) {
    await this.prisma.searchHistory.updateMany({ where: { id, userId }, data: { deletedByUser: true } });
    return { deleted: true };
  }

  async removeAll(userId: string) {
    const res = await this.prisma.searchHistory.updateMany({ where: { userId, deletedByUser: false }, data: { deletedByUser: true } });
    return { deleted: res.count };
  }

  /** 后台：含用户已删除的记录 */
  async adminList(params: { keyword?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const where = params.keyword ? { keyword: { contains: params.keyword, mode: 'insensitive' as const } } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.searchHistory.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true, username: true, phone: true } } },
      }),
      this.prisma.searchHistory.count({ where }),
    ]);

    return {
      list: rows.map((r) => ({
        id: r.id,
        keyword: r.keyword,
        deletedByUser: r.deletedByUser,
        updatedAt: r.updatedAt,
        user: r.user.nickname ?? r.user.username,
        phone: r.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      })),
      total,
      page,
      pageSize,
    };
  }
}

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get()
  query(@Query('q') q: string) {
    return this.search.search(q);
  }

  @Public()
  @Get('suggest')
  suggest(@Query('q') q: string) {
    return this.search.suggest(q);
  }

  @Get('history')
  history(@CurrentUser() user: User) {
    return this.search.history(user.id);
  }

  @Post('history')
  record(@CurrentUser() user: User, @Body(new ZodValidationPipe(keywordSchema)) body: { keyword: string }) {
    return this.search.record(user.id, body.keyword);
  }

  @Delete('history')
  clear(@CurrentUser() user: User) {
    return this.search.removeAll(user.id);
  }

  @Delete('history/:id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.search.removeOne(user.id, id);
  }
}

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin/search-history')
export class AdminSearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  list(@Query('keyword') keyword?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.search.adminList({ keyword, page: Number(page ?? 1), pageSize: Number(pageSize ?? 20) });
  }
}

@Module({
  controllers: [SearchController, AdminSearchController],
  providers: [SearchService],
})
export class SearchModule {}
