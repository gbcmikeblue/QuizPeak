import { Controller, Get, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LeaderboardService, type LeaderboardPeriod } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Public()
  @Get()
  list(
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p: LeaderboardPeriod = period === 'month' ? 'month' : 'all';
    return this.leaderboard.list(
      p,
      Math.max(Number(page ?? 1), 1),
      Math.min(Math.max(Number(pageSize ?? 20), 1), 50),
    );
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.leaderboard.myRank(user.id);
  }
}
