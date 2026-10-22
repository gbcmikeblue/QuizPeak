import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, map } from 'rxjs';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  traceId: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    const traceId = randomUUID();
    const res = context.switchToHttp().getResponse();
    res.setHeader?.('X-Trace-Id', traceId);

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data,
        traceId,
      })),
    );
  }
}
