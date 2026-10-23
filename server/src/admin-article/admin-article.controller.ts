import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminArticleService, type ArticleUpsert } from './admin-article.service';

const upsertSchema = z.object({
  title: z.string().min(1, '请填写标题').max(120),
  slug: z.string().max(80).optional().nullable(),
  summary: z.string().max(300).optional().nullable(),
  cover: z.string().max(500).optional().nullable(),
  content: z.string().min(1, '请填写正文'),
  tags: z.array(z.string().max(20)).max(8).optional(),
  categoryId: z.string().optional().nullable(),
  readMinutes: z.coerce.number().int().min(1).max(60).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin/articles')
export class AdminArticleController {
  constructor(private readonly articles: AdminArticleService) {}

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.articles.list({ keyword, status, page: Number(page ?? 1), pageSize: Number(pageSize ?? 10) });
  }

  @Post()
  create(@Body(new ZodValidationPipe(upsertSchema)) body: ArticleUpsert) {
    return this.articles.create(body);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.articles.detail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(upsertSchema)) body: ArticleUpsert) {
    return this.articles.update(id, body);
  }

  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.articles.archive(id);
  }
}
