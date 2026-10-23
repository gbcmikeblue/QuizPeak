import { Controller, Get, Global, Injectable, Module, Param, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 站内通知：写库（供其他模块调用） */
  async push(userId: string, type: string, title: string, content: string, link?: string, refId?: string) {
    return this.prisma.notification.create({
      data: { userId, type, title, content, link: link ?? null, refId: refId ?? null },
    });
  }

  async list(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [list, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { list, total, unread, page, pageSize };
  }

  async readAll(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { ok: true };
  }

  async read(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return { ok: true };
  }
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query('page') page?: string) {
    return this.notifications.list(user.id, Number(page ?? 1));
  }

  @Post('read-all')
  readAll(@CurrentUser() user: User) {
    return this.notifications.readAll(user.id);
  }

  @Post(':id/read')
  read(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notifications.read(user.id, id);
  }
}

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
