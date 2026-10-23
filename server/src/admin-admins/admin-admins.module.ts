import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserStatus, type AdminUser } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ROLE_LABELS, ROLE_PERMISSIONS, permissionsOf } from '../common/admin-permissions';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

const ROLES = Object.keys(ROLE_PERMISSIONS);

const createSchema = z.object({
  username: z.string().min(3).max(32),
  name: z.string().min(1).max(32),
  password: z.string().min(8, '密码至少 8 位').max(64),
  role: z.enum(ROLES as [string, ...string[]]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  role: z.enum(ROLES as [string, ...string[]]).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

const passwordSchema = z.object({ password: z.string().min(8, '密码至少 8 位').max(64) });

@Injectable()
export class AdminAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((a) => ({
      id: a.id,
      username: a.username,
      name: a.name,
      role: a.role,
      roleLabel: ROLE_LABELS[a.role] ?? a.role,
      status: a.status,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
      permissions: permissionsOf(a.role),
    }));
  }

  /** 角色 → 权限矩阵（前端展示用） */
  matrix() {
    return {
      roles: ROLES.map((role) => ({
        role,
        label: ROLE_LABELS[role] ?? role,
        permissions: ROLE_PERMISSIONS[role] ?? [],
      })),
    };
  }

  async create(input: { username: string; name: string; password: string; role: string }) {
    const exists = await this.prisma.adminUser.findUnique({ where: { username: input.username } });
    if (exists) throw new BadRequestException('用户名已存在');

    const created = await this.prisma.adminUser.create({
      data: {
        username: input.username,
        name: input.name,
        role: input.role,
        passwordHash: await bcrypt.hash(input.password, 10),
      },
    });
    return { id: created.id };
  }

  async update(operator: AdminUser, id: string, input: { name?: string; role?: string; status?: UserStatus }) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new BadRequestException('管理员不存在');

    // 保护：不能停用自己、不能把自己降级，避免把最后一个超管锁死
    if (target.id === operator.id && input.status === UserStatus.BANNED) {
      throw new BadRequestException('不能停用当前登录的账号');
    }
    if (target.id === operator.id && input.role && input.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('不能修改自己的角色');
    }
    if (target.role === 'SUPER_ADMIN' && (input.role ?? target.role) !== 'SUPER_ADMIN') {
      const supers = await this.prisma.adminUser.count({ where: { role: 'SUPER_ADMIN', status: UserStatus.ACTIVE } });
      if (supers <= 1) throw new BadRequestException('系统至少需要保留一个启用状态的超级管理员');
    }

    await this.prisma.adminUser.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });
    return { id };
  }

  async resetPassword(id: string, password: string) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new BadRequestException('管理员不存在');
    await this.prisma.adminUser.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    return { ok: true };
  }
}

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin/admins')
export class AdminAdminsController {
  constructor(private readonly admins: AdminAdminsService) {}

  @Get()
  list() {
    return this.admins.list();
  }

  @Get('matrix')
  matrix() {
    return this.admins.matrix();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createSchema)) body: { username: string; name: string; password: string; role: string },
  ) {
    return this.admins.create(body);
  }

  @Patch(':id')
  update(
    @CurrentAdmin() admin: AdminUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: { name?: string; role?: string; status?: UserStatus },
  ) {
    return this.admins.update(admin, id, body);
  }

  @Post(':id/password')
  resetPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(passwordSchema)) body: { password: string },
  ) {
    return this.admins.resetPassword(id, body.password);
  }
}

@Module({
  controllers: [AdminAdminsController],
  providers: [AdminAdminsService],
})
export class AdminAdminsModule {}
