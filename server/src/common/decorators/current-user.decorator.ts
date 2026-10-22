import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

/** 从请求上下文取当前登录用户（JwtAuthGuard 注入） */
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = req.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
