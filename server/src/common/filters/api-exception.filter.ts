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
