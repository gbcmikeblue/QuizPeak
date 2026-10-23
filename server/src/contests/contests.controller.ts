import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ContestsService } from './contests.service';

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.array(z.string()).default([]),
  usedSec: z.number().int().min(0).max(7200).optional(),
});

@Controller()
export class ContestsController {
  constructor(private readonly contests: ContestsService) {}

  @Public()
  @Get('contests')
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contests.list({ status, page: Number(page ?? 1), pageSize: Number(pageSize ?? 9) });
  }

  @Public()
  @Get('contests/:id')
  detail(@Param('id') id: string) {
    return this.contests.detail(id);
  }

  @Public()
  @Get('contests/:id/leaderboard')
  leaderboard(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contests.leaderboard(id, Number(page ?? 1), Number(pageSize ?? 10));
  }

  @Get('contests/:id/my')
  my(@Param('id') id: string, @CurrentUser() user: User) {
    return this.contests.myState(id, user.id);
  }

  @Post('contests/:id/enroll')
  enroll(@Param('id') id: string, @CurrentUser() user: User) {
    return this.contests.enroll(id, user.id);
  }

  @Post('contests/:id/attempt')
  start(@Param('id') id: string, @CurrentUser() user: User) {
    return this.contests.start(id, user.id);
  }

  @Post('contest-attempts/:id/answer')
  answer(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(answerSchema))
    body: { questionId: string; answer: string[]; usedSec?: number },
  ) {
    return this.contests.answer(id, user.id, body);
  }

  @Post('contest-attempts/:id/finish')
  finish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.contests.finish(id, user.id);
  }
}
