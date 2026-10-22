import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminAuthService } from './admin-auth.service';
import type { AdminUser } from '@prisma/client';

const loginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(64),
});

// 后台接口由 AdminAuthGuard 单独鉴权，需绕过全局用户守卫
@Public()
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) body: { username: string; password: string }) {
    return this.auth.login(body.username, body.password);
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  me(@CurrentAdmin() admin: AdminUser) {
    return { id: admin.id, username: admin.username, name: admin.name, role: admin.role };
  }
}
