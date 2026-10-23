import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

const createSchema = z.object({ emoji: z.string().min(1).max(8), sort: z.coerce.number().int().min(0).max(999).optional() });
const updateSchema = z.object({
  emoji: z.string().min(1).max(8).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sort: z.coerce.number().int().min(0).max(999).optional(),
});

@Injectable()
export class AvatarsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 前台可选头像（默认头像排最前） */
  list() {
    return this.prisma.avatarPreset.findMany({
      where: { enabled: true },
      orderBy: [{ isDefault: 'desc' }, { sort: 'asc' }],
      select: { id: true, emoji: true, isDefault: true },
    });
  }

  /** 后台列表：附带引用人数 */
  async adminList() {
    const [rows, grouped] = await Promise.all([
      this.prisma.avatarPreset.findMany({ orderBy: [{ isDefault: 'desc' }, { sort: 'asc' }] }),
      this.prisma.user.groupBy({ by: ['avatar'], _count: { _all: true } }),
    ]);
    const usage = new Map(grouped.map((g) => [g.avatar ?? '', g._count._all]));
    return rows.map((r) => ({
      id: r.id,
      emoji: r.emoji,
      isDefault: r.isDefault,
      enabled: r.enabled,
      sort: r.sort,
      usageCount: usage.get(`emoji:${r.emoji}`) ?? 0,
    }));
  }

  async create(input: { emoji: string; sort?: number }) {
    const emoji = input.emoji.trim();
    if (!emoji) throw new BadRequestException('请填写 emoji');
    const exists = await this.prisma.avatarPreset.findUnique({ where: { emoji } });
    if (exists) throw new BadRequestException('该 emoji 已存在');

    const count = await this.prisma.avatarPreset.count();
    const created = await this.prisma.avatarPreset.create({
      data: { emoji, sort: input.sort ?? count + 1, isDefault: count === 0 },
    });
    return { id: created.id, emoji: created.emoji };
  }

  /** 修改：emoji 变化时级联更新已引用用户的头像 */
  async update(id: string, input: { emoji?: string; enabled?: boolean; isDefault?: boolean; sort?: number }) {
    const preset = await this.prisma.avatarPreset.findUnique({ where: { id } });
    if (!preset) throw new BadRequestException('头像不存在');

    const nextEmoji = input.emoji?.trim();
    let migrated = 0;

    if (nextEmoji && nextEmoji !== preset.emoji) {
      const dup = await this.prisma.avatarPreset.findUnique({ where: { emoji: nextEmoji } });
      if (dup) throw new BadRequestException('该 emoji 已存在');

      const res = await this.prisma.user.updateMany({
        where: { avatar: `emoji:${preset.emoji}` },
        data: { avatar: `emoji:${nextEmoji}` },
      });
      migrated = res.count;
    }

    if (input.isDefault) {
      await this.prisma.avatarPreset.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    await this.prisma.avatarPreset.update({
      where: { id },
      data: {
        ...(nextEmoji ? { emoji: nextEmoji } : {}),
        ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
        ...(typeof input.isDefault === 'boolean' ? { isDefault: input.isDefault } : {}),
        ...(typeof input.sort === 'number' ? { sort: input.sort } : {}),
      },
    });

    return { id, migrated };
  }

  /** 删除：默认头像与被引用头像都不允许删除 */
  async remove(id: string) {
    const preset = await this.prisma.avatarPreset.findUnique({ where: { id } });
    if (!preset) throw new BadRequestException('头像不存在');
    if (preset.isDefault) throw new BadRequestException('默认头像不可删除，请先更换默认头像');

    const used = await this.prisma.user.count({ where: { avatar: `emoji:${preset.emoji}` } });
    if (used > 0) throw new BadRequestException(`已被 ${used} 位用户使用，只能修改不能删除`);

    await this.prisma.avatarPreset.delete({ where: { id } });
    return { deleted: true };
  }

  /** 注册时使用的默认头像 */
  async defaultAvatar() {
    const preset = await this.prisma.avatarPreset.findFirst({ where: { isDefault: true } });
    return preset ? `emoji:${preset.emoji}` : null;
  }
}

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Public()
  @Get()
  list() {
    return this.avatars.list();
  }
}

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin/avatars')
export class AdminAvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Get()
  list() {
    return this.avatars.adminList();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createSchema)) body: { emoji: string; sort?: number }) {
    return this.avatars.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: { emoji?: string; enabled?: boolean; isDefault?: boolean; sort?: number },
  ) {
    return this.avatars.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.avatars.remove(id);
  }
}

@Module({
  controllers: [AvatarsController, AdminAvatarsController],
  providers: [AvatarsService],
  exports: [AvatarsService],
})
export class AvatarsModule {}
