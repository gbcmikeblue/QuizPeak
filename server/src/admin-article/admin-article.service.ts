import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ArticleUpsert {
  title: string;
  slug?: string | null;
  summary?: string | null;
  cover?: string | null;
  content: string;
  tags?: string[];
  categoryId?: string | null;
  readMinutes?: number;
  status: 'DRAFT' | 'PUBLISHED';
}

@Injectable()
export class AdminArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 10), 1), 50);
    const where: Prisma.ArticleWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.keyword
        ? {
            OR: [
              { title: { contains: params.keyword, mode: 'insensitive' } },
              { slug: { contains: params.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
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
        status: a.status,
        categoryName: a.category?.name ?? null,
        tags: a.tags,
        views: a.views,
        readMinutes: a.readMinutes,
        publishedAt: a.publishedAt,
        updatedAt: a.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async detail(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('文章不存在');
    return article;
  }

  async create(input: ArticleUpsert) {
    const slug = input.slug?.trim() || (await this.generateSlug(input.title));
    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (exists) throw new BadRequestException('slug 已被占用');

    const article = await this.prisma.article.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary ?? null,
        cover: input.cover ?? null,
        content: input.content,
        tags: input.tags ?? [],
        categoryId: input.categoryId ?? null,
        readMinutes: input.readMinutes ?? 3,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
    });
    return { id: article.id, slug: article.slug };
  }

  async update(id: string, input: ArticleUpsert) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('文章不存在');

    await this.prisma.article.update({
      where: { id },
      data: {
        title: input.title,
        summary: input.summary ?? null,
        cover: input.cover ?? null,
        content: input.content,
        tags: input.tags ?? [],
        categoryId: input.categoryId ?? null,
        readMinutes: input.readMinutes ?? 3,
        status: input.status,
        publishedAt:
          input.status === 'PUBLISHED' ? (article.publishedAt ?? new Date()) : article.publishedAt,
      },
    });
    return { id };
  }

  /** 下线（保留数据，前台不再展示） */
  async archive(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('文章不存在');
    await this.prisma.article.update({ where: { id }, data: { status: 'DRAFT' } });
    return { archived: true };
  }

  private async generateSlug(title: string) {
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 40) || 'article';
    for (let i = 0; i < 20; i += 1) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const exists = await this.prisma.article.findUnique({ where: { slug: candidate } });
      if (!exists) return candidate;
    }
    return `article-${Date.now().toString(36)}`;
  }
}
