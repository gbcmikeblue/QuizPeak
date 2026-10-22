import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AttemptsService } from './attempts.service';

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.array(z.string()).default([]),
  usedSec: z.number().int().min(0).max(3600).optional(),
});

const skipSchema = z.object({ questionId: z.string().min(1) });

@Controller()
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post('quizzes/:id/levels/:levelNo/attempt')
  start(
    @Param('id') quizId: string,
    @Param('levelNo') levelNo: string,
    @CurrentUser() user: User,
  ) {
    return this.attempts.start(quizId, Number(levelNo), user.id);
  }

  @Get('quizzes/:id/progress')
  progress(@Param('id') quizId: string, @CurrentUser() user: User) {
    return this.attempts.progress(quizId, user.id);
  }

  @Post('attempts/:id/answer')
  answer(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(answerSchema))
    body: { questionId: string; answer: string[]; usedSec?: number },
  ) {
    return this.attempts.submitAnswer(id, user.id, body);
  }

  @Post('attempts/:id/skip')
  skip(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(skipSchema)) body: { questionId: string },
  ) {
    return this.attempts.skip(id, user.id, body.questionId);
  }

  @Post('attempts/:id/finish')
  finish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.attempts.finish(id, user.id);
  }

  @Get('attempts/:id/review')
  review(@Param('id') id: string, @CurrentUser() user: User) {
    return this.attempts.review(id, user.id);
  }
}
