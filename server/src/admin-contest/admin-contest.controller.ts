import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ContestStatus } from '@prisma/client';
import { z } from 'zod';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminContestService, type ContestUpsert } from './admin-contest.service';

const upsertSchema = z.object({
  title: z.string().min(1, '请填写标题').max(60),
  description: z.string().max(5000).optional().nullable(),
  cover: z.string().max(500).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  startAt: z.string().min(1, '请选择开始时间'),
  endAt: z.string().min(1, '请选择结束时间'),
  capacity: z.coerce.number().int().min(1).max(100000),
  entryFee: z.coerce.number().int().min(0).max(100000),
  questionCount: z.coerce.number().int().min(1).max(100),
  prizePool: z.coerce.number().int().min(0).default(0),
  status: z.nativeEnum(ContestStatus).optional(),
  prizes: z
    .array(z.object({ rank: z.coerce.number().int().min(1), points: z.coerce.number().int().min(0), xp: z.coerce.number().int().min(0) }))
    .max(10)
    .optional(),
});

const pickSchema = z.object({
  quizId: z.string().min(1),
  levelId: z.string().optional(),
  count: z.coerce.number().int().min(1).max(100).default(8),
});

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin/contests')
export class AdminContestController {
  constructor(private readonly contests: AdminContestService) {}

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contests.list({ keyword, page: Number(page ?? 1), pageSize: Number(pageSize ?? 10) });
  }

  @Post()
  create(@Body(new ZodValidationPipe(upsertSchema)) body: ContestUpsert) {
    return this.contests.create(body);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.contests.detail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(upsertSchema)) body: ContestUpsert) {
    return this.contests.update(id, body);
  }

  @Post(':id/questions/pick')
  pick(@Param('id') id: string, @Body(new ZodValidationPipe(pickSchema)) body: { quizId: string; levelId?: string; count: number }) {
    return this.contests.pickQuestions(id, body);
  }

  @Get(':id/leaderboard')
  leaderboard(@Param('id') id: string) {
    return this.contests.leaderboard(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.contests.close(id);
  }
}
