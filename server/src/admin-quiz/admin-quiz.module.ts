import { Module } from '@nestjs/common';
import { AdminQuizController } from './admin-quiz.controller';
import { AdminQuizService } from './admin-quiz.service';

@Module({
  controllers: [AdminQuizController],
  providers: [AdminQuizService],
})
export class AdminQuizModule {}
