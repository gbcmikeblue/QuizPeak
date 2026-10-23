import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { canAccess, permissionForPath, permissionLabel } from '../admin-permissions';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@quizpeak/shared';

/** 后台接口鉴权：要求 scope=admin 的 token */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { admin?: unknown }>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('请先登录');

    let payload: JwtPayload & { typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    if (payload.typ !== 'access' || payload.scope !== 'admin') {
      throw new UnauthorizedException('无权访问后台接口');
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || admin.status === UserStatus.BANNED) {
      throw new UnauthorizedException('账号不可用');
    }

    // 角色权限：按路径前缀判定（SUPER_ADMIN 拥有全部权限）
    // 注意 req.path 含全局前缀 /api，需要先剥掉再匹配
    const cleanPath = req.path.replace(/^\/api(?=\/|$)/, '');
    const required = permissionForPath(cleanPath, req.method);
    if (required.length > 0 && !required.some((perm) => canAccess(admin.role, perm))) {
      throw new ForbiddenException(`当前角色无「${permissionLabel(required)}」权限，请联系超级管理员`);
    }

    // 配置读取细到 prefix：没有系统设置权限的角色，只能读 points.*（积分任务页依赖）
    if (cleanPath.startsWith('/admin/config') && !canAccess(admin.role, 'system')) {
      if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
        throw new ForbiddenException('只有「系统设置」权限可以修改配置，请联系超级管理员');
      }
      const prefix = String((req.query as { prefix?: unknown })?.prefix ?? '');
      if (!prefix.startsWith('points.')) {
        throw new ForbiddenException('当前角色只能查看积分相关配置，站点与规则配置需要「系统设置」权限');
      }
    }

    req.admin = admin;
    return true;
  }
}
