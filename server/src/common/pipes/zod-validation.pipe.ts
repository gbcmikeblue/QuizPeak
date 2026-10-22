import { Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema, ZodTypeDef } from 'zod';

/** 用 @quizpeak/shared 中的 zod schema 做入参校验（与前端共用同一份规则） */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    return this.schema.parse(value ?? {});
  }
}
