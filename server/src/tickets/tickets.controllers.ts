import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TicketStatus, type AdminUser, type User } from '@prisma/client';
import { z } from 'zod';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TicketsService } from './tickets.service';

const createSchema = z.object({
  subject: z.string().min(2, '请填写标题').max(80),
  category: z.enum(['ACCOUNT', 'QUIZ', 'POINTS', 'CONTEST', 'OTHER']).default('OTHER'),
  content: z.string().min(5, '请描述遇到的问题').max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

const replySchema = z.object({ content: z.string().min(1).max(2000) });

/** 用户端工单 */
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  mine(@CurrentUser() user: User, @Query('page') page?: string) {
    return this.tickets.mine(user.id, Number(page ?? 1));
  }

  @Post()
  create(@CurrentUser() user: User, @Body(new ZodValidationPipe(createSchema)) body: { subject: string; category: string; content: string; priority?: string }) {
    return this.tickets.create(user.id, body);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tickets.detail(id, user.id);
  }

  @Post(':id/replies')
  reply(@Param('id') id: string, @CurrentUser() user: User, @Body(new ZodValidationPipe(replySchema)) body: { content: string }) {
    return this.tickets.reply(id, 'USER', user.id, body.content);
  }
}

/** 后台工单 */
@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.tickets.list({ status, page: Number(page ?? 1), pageSize: Number(pageSize ?? 10) });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.tickets.detail(id);
  }

  @Post(':id/replies')
  reply(@Param('id') id: string, @CurrentAdmin() admin: AdminUser, @Body(new ZodValidationPipe(replySchema)) body: { content: string }) {
    return this.tickets.reply(id, 'ADMIN', admin.id, body.content);
  }

  @Patch(':id/status')
  status(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminUser,
    @Body(
      new ZodValidationPipe(
        z.object({
          status: z.nativeEnum(TicketStatus),
          /** 变更说明：关闭工单必填，会作为客服回复写入并通知用户 */
          note: z.string().trim().max(500).optional(),
        }),
      ),
    )
    body: { status: TicketStatus; note?: string },
  ) {
    return this.tickets.setStatus(id, body.status, body.note, admin.id);
  }
}
