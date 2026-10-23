import { Module } from '@nestjs/common';
import { AdminContestController } from './admin-contest.controller';
import { AdminContestService } from './admin-contest.service';

@Module({
  controllers: [AdminContestController],
  providers: [AdminContestService],
})
export class AdminContestModule {}
