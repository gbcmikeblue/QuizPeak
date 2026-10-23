import { Module } from '@nestjs/common';
import { AdminQuizController } from './admin-quiz.controller';
import { AdminQuizExcelService } from './admin-quiz-excel.service';
import { AdminQuizService } from './admin-quiz.service';

@Module({
  controllers: [AdminQuizController],
  providers: [AdminQuizService, AdminQuizExcelService],
})
export class AdminQuizModule {}
