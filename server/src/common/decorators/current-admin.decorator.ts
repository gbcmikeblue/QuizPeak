import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminUser } from '@prisma/client';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser | undefined => {
    const req = ctx.switchToHttp().getRequest<{ admin?: AdminUser }>();
    return req.admin;
  },
);
