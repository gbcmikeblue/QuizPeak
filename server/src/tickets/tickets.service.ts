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

    const [list, total, openCount, inProgressCount, closedCount, allTotal] =
      await this.prisma.$transaction([
        this.prisma.ticket.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            user: { select: { nickname: true, username: true, phone: true } },
            _count: { select: { replies: true } },
          },
        }),
        this.prisma.ticket.count({ where }),
        this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
        this.prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
        this.prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
        this.prisma.ticket.count(),
      ]);

    // 各状态数量：筛选标签直接显示，避免「切了筛选看不到东西」的错觉
    const statusCounts = {
      ALL: allTotal,
      OPEN: openCount,
      IN_PROGRESS: inProgressCount,
      CLOSED: closedCount,
    };

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
        updatedAt: t.updatedAt,
      })),
      total,
      page,
      pageSize,
      statusCounts,
    };
  }

  /**
   * 变更工单状态
   * - 关闭工单必须填写处理说明（写库为一条客服回复并推送通知，便于事后追溯）
   * - 其它状态说明可选填
   */
  async setStatus(id: string, status: TicketStatus, note?: string, adminId?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('工单不存在');

    const trimmed = note?.trim() ?? '';
    if (ticket.status === status && !trimmed) {
      throw new BadRequestException('工单已是该状态');
    }
    if (status === TicketStatus.CLOSED && trimmed.length < 2) {
      throw new BadRequestException('关闭工单需填写处理说明（至少 2 个字）');
    }

    await this.prisma.$transaction([
      this.prisma.ticket.update({ where: { id }, data: { status } }),
      ...(trimmed
        ? [
            this.prisma.ticketReply.create({
              data: {
                ticketId: id,
                authorType: 'ADMIN',
                authorId: adminId ?? 'system:status',
                content: trimmed,
              },
            }),
          ]
        : []),
    ]);

    const label =
      status === TicketStatus.CLOSED
        ? '已关闭'
        : status === TicketStatus.IN_PROGRESS
          ? '处理中'
          : '待处理';
    await this.notifications.push(
      ticket.userId,
      'TICKET',
      `工单状态更新为「${label}」`,
      trimmed ? trimmed.slice(0, 80) : `你的工单「${ticket.subject}」状态已更新`,
      '/support',
      id,
    );

    return { id, status, noteSaved: Boolean(trimmed) };
  }
}
