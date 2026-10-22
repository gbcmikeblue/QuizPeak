import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PointsService } from './points.service';

const likeSchema = z.object({
  toUserId: z.string().min(1),
  targetType: z.enum(['LEADERBOARD_ALL', 'LEADERBOARD_MONTH']).default('LEADERBOARD_ALL'),
  targetId: z.string().optional(),
});

@Controller('points')
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get('summary')
  summary(@CurrentUser() user: User) {
    return this.points.summary(user.id);
  }

  @Get('transactions')
  transactions(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.points.listTransactions(
      user.id,
      Math.max(Number(page ?? 1), 1),
      Math.min(Math.max(Number(pageSize ?? 10), 1), 50),
    );
  }

  @Get('activities')
  activities() {
    return this.points.listActivities();
  }

  @Post('checkin')
  checkin(@CurrentUser() user: User) {
    return this.points.checkin(user.id);
  }

  @Post('ad-reward')
  adReward(@CurrentUser() user: User) {
    return this.points.watchAd(user.id);
  }

  @Post('like')
  like(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(likeSchema))
    body: { toUserId: string; targetType: string; targetId?: string },
  ) {
    return this.points.like(user.id, body.toUserId, body.targetType, body.targetId);
  }

  @Post('activities/:id/claim')
  claim(@CurrentUser() user: User, @Param('id') id: string) {
    return this.points.claimActivity(user.id, id);
  }
}
