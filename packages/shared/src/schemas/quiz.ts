import { z } from 'zod';
import { Difficulty, QuestionType } from '../enums';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(9),
});

export const quizListQuerySchema = paginationSchema.extend({
  categoryId: z.string().optional(),
  keyword: z.string().max(64).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
});

export const questionOptionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
});

export const createQuestionSchema = z
  .object({
    type: z.nativeEnum(QuestionType),
    stem: z.string().min(1),
    options: z.array(questionOptionSchema).max(8).default([]),
    answer: z.array(z.string()).min(1, '请设置正确答案'),
    analysis: z.string().max(2000).optional(),
    score: z.number().int().min(1).max(100).default(10),
  })
  .superRefine((v, ctx) => {
    if (v.type === QuestionType.SINGLE && v.answer.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '单选题只能有一个正确答案',
        path: ['answer'],
      });
    }
    if (v.type === QuestionType.MULTI && v.answer.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '多选题至少两个正确答案',
        path: ['answer'],
      });
    }
    if (v.type !== QuestionType.FILL && v.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '至少需要两个选项',
        path: ['options'],
      });
    }
  });

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.array(z.string()).default([]),
  /** 前端上报的题目停留秒数，仅作参考，服务端以自身计时为准 */
  clientUsedSec: z.number().int().min(0).optional(),
});

export const enrollQuizSchema = z.object({
  quizId: z.string().min(1),
});

export type QuizListQuery = z.infer<typeof quizListQuerySchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
