import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MeService } from './me.service';

const toggleSchema = z.object({
  targetType: z.enum(['QUIZ', 'CONTEST', 'ARTICLE']),
  targetId: z.string().min(1),
});

@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('favorites')
  favorites(@CurrentUser() user: User, @Query('type') type?: string) {
    return this.me.favorites(user.id, type ?? 'quiz');
  }

  @Get('favorites/check')
  check(@CurrentUser() user: User, @Query('targetType') targetType: string, @Query('targetId') targetId: string) {
    return this.me.isFavorited(user.id, targetType ?? 'QUIZ', targetId ?? '');
  }

  @Post('favorites/toggle')
  toggle(@CurrentUser() user: User, @Body(new ZodValidationPipe(toggleSchema)) body: { targetType: string; targetId: string }) {
    return this.me.toggleFavorite(user.id, body.targetType, body.targetId);
  }

  @Get('badges')
  badges(@CurrentUser() user: User) {
    return this.me.badges(user.id);
  }
}
