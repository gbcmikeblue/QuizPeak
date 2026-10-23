import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(@Query('tag') tag?: string, @Query('categoryId') categoryId?: string, @Query('page') pageStr?: string) {
    const page = Math.max(Number(pageStr ?? 1), 1);
    const pageSize = 6;
    const where = {
      status: 'PUBLISHED',
      ...(categoryId ? { categoryId } : {}),
      ...(tag ? { tags: { array_contains: [tag] } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      list: rows.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        cover: a.cover,
        summary: a.summary,
        tags: a.tags,
        readMinutes: a.readMinutes,
        views: a.views,
        publishedAt: a.publishedAt,
        category: a.category,
      })),
      total,
      page,
      pageSize,
    };
  }

  @Public()
  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!article || article.status !== 'PUBLISHED') throw new NotFoundException('文章不存在');

    await this.prisma.article.update({ where: { id: article.id }, data: { views: { increment: 1 } } });
    return { ...article, views: article.views + 1 };
  }
}
