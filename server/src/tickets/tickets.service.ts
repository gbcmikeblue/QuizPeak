import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** 用户侧：我的工单 */
  async mine(userId: string, page = 1, pageSize = 10) {
    const where = { userId };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { replies: true } } },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return {
      list: list.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        replies: t._count.replies,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async create(userId: string, input: { subject: string; category: string; content: string; priority?: string }) {
    const ticket = await this.prisma.ticket.create({
      data: {
        userId,
        subject: input.subject,
        category: input.category,
        content: input.content,
        priority: (input.priority ?? 'MEDIUM') as never,
      },
    });
    return { id: ticket.id };
  }

  async detail(id: string, userId?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        replies: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, nickname: true, username: true, phone: true } },
      },
    });
    if (!ticket) throw new NotFoundException('工单不存在');
    if (userId && ticket.userId !== userId) throw new NotFoundException('工单不存在');

    return {
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      content: ticket.content,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      // 手机号默认脱敏，需要完整号走 POST /admin/reveal-phone（会写审计）
      user: { ...ticket.user, phone: ticket.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') },
      replies: ticket.replies.map((r) => ({
        id: r.id,
        authorType: r.authorType,
        content: r.content,
        createdAt: r.createdAt,
      })),
    };
  }

  /** 回复：用户回复会把已关闭工单重新打回处理中 */
  async reply(id: string, authorType: 'USER' | 'ADMIN', authorId: string, content: string) {
    if (!content.trim()) throw new BadRequestException('回复内容不能为空');
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('工单不存在');

    await this.prisma.$transaction([
      this.prisma.ticketReply.create({ data: { ticketId: id, authorType, authorId, content } }),
      this.prisma.ticket.update({
        where: { id },
        data: { status: authorType === 'USER' && ticket.status === 'CLOSED' ? 'OPEN' : ticket.status },
      }),
    ]);
    if (authorType === 'ADMIN') {
      await this.notifications.push(ticket.userId, 'TICKET', '客服回复了你的工单', content.slice(0, 80), '/support', id);
    }
    return { ok: true };
  }

  async list(params: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 10), 1), 50);
    const where = params.status ? { status: params.status as TicketStatus } : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { nickname: true, username: true, phone: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return {
      list: list.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        user: t.user.nickname ?? t.user.username,
        phone: t.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        replies: t._count.replies,
        createdAt: t.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async setStatus(id: string, status: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('工单不存在');
    await this.prisma.ticket.update({ where: { id }, data: { status } });
    return { id, status };
  }
}
