import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { quizListQuerySchema, type QuizListQuery } from '@quizpeak/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { QuizService } from './quiz.service';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Public()
  @Get()
  list(@Query() query: Record<string, string>) {
    const parsed = quizListQuerySchema.parse(query) as QuizListQuery;
    return this.quiz.list(parsed);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.quiz.detail(id);
  }

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quiz.enroll(id, user.id);
  }
}
