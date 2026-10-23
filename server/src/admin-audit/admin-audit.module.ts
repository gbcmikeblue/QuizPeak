import { BadRequestException, Body, Controller, Get, Injectable, Module, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import type { AdminUser } from '@prisma/client';
import { z } from 'zod';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

const revealSchema = z.object({
  source: z.enum(['USER', 'TICKET', 'SMS']),
  id: z.string().min(1),
  reason: z.string().max(100).optional(),
});

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** 按来源取完整手机号（仅供审计接口内部使用） */
  private async resolvePhone(source: 'USER' | 'TICKET' | 'SMS', id: string): Promise<string> {
    if (source === 'USER') {
      const user = await this.prisma.user.findUnique({ where: { id }, select: { phone: true } });
      if (!user) throw new NotFoundException('用户不存在');
      return user.phone;
    }

    if (source === 'TICKET') {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id },
        select: { user: { select: { phone: true } } },
      });
      if (!ticket) throw new NotFoundException('工单不存在');
      return ticket.user.phone;
    }

    const sms = await this.prisma.smsCode.findUnique({ where: { id }, select: { phone: true } });
    if (!sms) throw new NotFoundException('短信记录不存在');
    return sms.phone;
  }

  /** 查看完整手机号：返回明文，同时落审计 */
  async revealPhone(admin: AdminUser, input: { source: 'USER' | 'TICKET' | 'SMS'; id: string; reason?: string }) {
    const phone = await this.resolvePhone(input.source, input.id);
    if (!phone) throw new BadRequestException('该记录没有手机号');

    await this.prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name || admin.username,
        action: 'REVEAL_PHONE',
        targetType: input.source,
        targetId: input.id,
        detail: `查看完整手机号（尾号 ${phone.slice(-4)}）${input.reason ? `；原因：${input.reason}` : ''}`,
      },
    });

    return { phone, masked: maskPhone(phone) };
  }

  async logs(params: { action?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const where = params.action ? { action: params.action } : {};

    const [list, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }
}

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  @Post('reveal-phone')
  reveal(@CurrentAdmin() admin: AdminUser, @Body(new ZodValidationPipe(revealSchema)) body: { source: 'USER' | 'TICKET' | 'SMS'; id: string; reason?: string }) {
    return this.audit.revealPhone(admin, body);
  }

  @Get('audit-logs')
  logs(@Query('action') action?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.audit.logs({ action, page: Number(page ?? 1), pageSize: Number(pageSize ?? 20) });
  }
}

@Module({
  controllers: [AdminAuditController],
  providers: [AdminAuditService],
})
export class AdminAuditModule {}
