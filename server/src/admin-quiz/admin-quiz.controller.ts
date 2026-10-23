import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  adminLevelGenerateSchema,
  adminQuestionSchema,
  adminQuizUpsertSchema,
  type AdminLevelGenerateInput,
  type AdminQuestionInput,
  type AdminQuizUpsertInput,
} from '@quizpeak/shared';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminQuizExcelService } from './admin-quiz-excel.service';
import { AdminQuizService } from './admin-quiz.service';

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminQuizController {
  constructor(
    private readonly quiz: AdminQuizService,
    private readonly excel: AdminQuizExcelService,
  ) {}

  @Get('categories')
  categories() {
    return this.quiz.categories();
  }

  @Get('quizzes')
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.quiz.list({ page: Number(page ?? 1), pageSize: Number(pageSize ?? 10), keyword, status, categoryId });
  }

  @Post('quizzes')
  create(@Body(new ZodValidationPipe(adminQuizUpsertSchema)) body: AdminQuizUpsertInput) {
    return this.quiz.create(body);
  }

  /** 下载空白模板（必须定义在 quizzes/:id 之前） */
  @Get('quizzes/import-template')
  template() {
    return this.excel.template();
  }

  @Get('quizzes/:id/export')
  exportQuiz(@Param('id') id: string) {
    return this.excel.exportQuiz(id);
  }

  @Post('quizzes/:id/import')
  importQuiz(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({ fileBase64: z.string().min(10) }))) body: { fileBase64: string },
  ) {
    return this.excel.importQuiz(id, body.fileBase64);
  }

  @Get('quizzes/:id')
  detail(@Param('id') id: string) {
    return this.quiz.detail(id);
  }

  @Patch('quizzes/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminQuizUpsertSchema)) body: AdminQuizUpsertInput,
  ) {
    return this.quiz.update(id, body);
  }

  @Delete('quizzes/:id')
  archive(@Param('id') id: string) {
    return this.quiz.archive(id);
  }

  @Post('quizzes/:id/levels/generate')
  generate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminLevelGenerateSchema)) body: AdminLevelGenerateInput,
  ) {
    return this.quiz.generateLevels(id, body);
  }

  @Get('quizzes/:id/questions')
  questions(
    @Param('id') id: string,
    @Query('levelId') levelId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.quiz.questions(id, levelId, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Post('quizzes/:id/questions')
  createQuestion(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminQuestionSchema)) body: AdminQuestionInput,
  ) {
    return this.quiz.createQuestion(id, body);
  }

  @Patch('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminQuestionSchema)) body: AdminQuestionInput,
  ) {
    return this.quiz.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  removeQuestion(@Param('id') id: string) {
    return this.quiz.removeQuestion(id);
  }
}
