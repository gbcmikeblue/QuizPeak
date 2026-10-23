import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method: string; url: string }>();

    if (exception instanceof ZodError) {
      res.status(HttpStatus.BAD_REQUEST).json({
        code: 400,
        message: exception.issues[0]?.message ?? '参数校验失败',
        data: { issues: exception.issues },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: unknown }).message ?? exception.message);
      res.status(status).json({
        code: status,
        message: Array.isArray(message) ? message.join('; ') : message,
        data: null,
      });
      return;
    }

    // body-parser 抛出的错误（如请求体过大）没有继承 HttpException
    const raw = exception as { status?: number; statusCode?: number; type?: string };
    const rawStatus = raw?.status ?? raw?.statusCode;
    if (raw?.type === 'entity.too.large' || rawStatus === 413) {
      res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        code: 413,
        message: '图片过大，请压缩到 2MB 以内再上传',
        data: null,
      });
      return;
    }
    if (typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500) {
      res.status(rawStatus).json({
        code: rawStatus,
        message: (exception as Error)?.message || '请求参数有误',
        data: null,
      });
      return;
    }

    this.logger.error(
      `Unhandled error ${req.method} ${req.url}: ${(exception as Error)?.message}`,
      (exception as Error)?.stack,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 500,
      message: '服务异常，请稍后重试',
      data: null,
    });
  }
}
