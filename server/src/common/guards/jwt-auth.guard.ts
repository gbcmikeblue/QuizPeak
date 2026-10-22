import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@quizpeak/shared';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('请先登录');

    let payload: JwtPayload & { typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    if (payload.typ && payload.typ !== 'access') {
      throw new UnauthorizedException('Token 类型错误');
    }
    if (payload.scope !== 'user') {
      throw new UnauthorizedException('请使用用户账号登录');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('用户不存在');
    if (user.status === UserStatus.BANNED) throw new ForbiddenException('账号已被限制');

    req.user = user;
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies
      ?.access_token;
    return cookieToken;
  }
}
