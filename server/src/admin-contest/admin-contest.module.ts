import { Module } from '@nestjs/common';
import { ContestsModule } from '../contests/contests.module';
import { AdminContestController } from './admin-contest.controller';
import { AdminContestService } from './admin-contest.service';

@Module({
  imports: [ContestsModule],
  controllers: [AdminContestController],
  providers: [AdminContestService],
})
export class AdminContestModule {}
