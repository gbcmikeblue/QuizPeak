import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { z } from 'zod';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminUsersService } from './admin-users.service';

const statusSchema = z.object({ status: z.nativeEnum(UserStatus) });
const adjustSchema = z.object({
  delta: z.coerce.number().int().refine((v) => v !== 0, '调整值不能为 0'),
  reason: z.string().min(1, '请填写调整理由').max(200),
});

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get('users')
  list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.users.list({ keyword, status, page: Number(page ?? 1), pageSize: Number(pageSize ?? 10) });
  }

  @Get('users/:id')
  detail(@Param('id') id: string) {
    return this.users.detail(id);
  }

  @Patch('users/:id/status')
  setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statusSchema)) body: { status: UserStatus },
  ) {
    return this.users.setStatus(id, body.status);
  }

  @Post('users/:id/points')
  adjust(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adjustSchema)) body: { delta: number; reason: string },
  ) {
    return this.users.adjustPoints(id, body.delta, body.reason);
  }

  @Get('point-transactions')
  transactions(
    @Query('type') type?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.users.transactions({ type, keyword, page: Number(page ?? 1), pageSize: Number(pageSize ?? 20) });
  }
}
