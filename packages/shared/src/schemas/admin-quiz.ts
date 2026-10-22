import { z } from 'zod';
import { Difficulty, QuestionType, QuizStatus } from '../enums';

export const adminQuizUpsertSchema = z.object({
  title: z.string().min(1, '请填写标题').max(60),
  titleEn: z.string().max(80).optional().nullable(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'slug 只能是小写字母、数字、连字符')
    .max(60)
    .optional(),
  cover: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.BEGINNER),
  /** 解锁消耗积分 */
  enrollFee: z.coerce.number().int().min(0).max(100000).default(0),
  levelsCount: z.coerce.number().int().min(1).max(50).default(10),
  /** 每关题数 */
  questionCount: z.coerce.number().int().min(1).max(50).default(8),
  unlockThreshold: z.coerce.number().int().min(0).max(100).default(90),
  status: z.nativeEnum(QuizStatus).default(QuizStatus.DRAFT),
});

export const adminLevelGenerateSchema = z.object({
  levels: z.coerce.number().int().min(1).max(50).default(10),
  questionCount: z.coerce.number().int().min(1).max(50).default(8),
  passThreshold: z.coerce.number().int().min(0).max(100).default(90),
  /** 是否覆盖已有关卡的题数/阈值 */
  overwrite: z.boolean().default(false),
});

export const adminQuestionSchema = z
  .object({
    levelId: z.string().optional().nullable(),
    type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE),
    stem: z.string().min(1, '请填写题干').max(1000),
    options: z
      .array(z.object({ key: z.string().min(1), text: z.string().min(1) }))
      .max(8)
      .default([]),
    answer: z.array(z.string()).min(1, '请设置正确答案'),
    analysis: z.string().max(2000).optional().nullable(),
    score: z.coerce.number().int().min(1).max(100).default(10),
    enabled: z.boolean().default(true),
    sort: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((v, ctx) => {
    if (v.type === QuestionType.SINGLE && v.answer.length !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '单选题只能有一个正确答案', path: ['answer'] });
    }
    if (v.type === QuestionType.MULTI && v.answer.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '多选题至少两个正确答案', path: ['answer'] });
    }
    if (v.type !== QuestionType.FILL && v.options.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '至少需要两个选项', path: ['options'] });
    }
  });

export type AdminQuizUpsertInput = z.infer<typeof adminQuizUpsertSchema>;
export type AdminLevelGenerateInput = z.infer<typeof adminLevelGenerateSchema>;
export type AdminQuestionInput = z.infer<typeof adminQuestionSchema>;
