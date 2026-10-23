import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminConfigService } from './admin-config.service';

const saveConfigSchema = z.object({
  items: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.union([z.number(), z.string(), z.boolean()]),
        remark: z.string().max(80).optional(),
      }),
    )
    .min(1),
});

const activitySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(60),
  titleEn: z.string().max(80).optional().nullable(),
  desc: z.string().max(500).optional().nullable(),
  points: z.coerce.number().int().min(0).max(100000),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  enabled: z.boolean().optional(),
});

const badgeSchema = z.object({
  threshold: z.coerce.number().int().min(1).max(1000000).optional(),
  enabled: z.boolean().optional(),
  desc: z.string().max(120).optional(),
});

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminConfigController {
  constructor(private readonly config: AdminConfigService) {}

  @Get('dashboard')
  dashboard() {
    return this.config.dashboard();
  }

  @Get('config')
  list(@Query('prefix') prefix?: string) {
    return this.config.config(prefix);
  }

  @Put('config')
  save(@Body(new ZodValidationPipe(saveConfigSchema)) body: { items: Array<{ key: string; value: unknown; remark?: string }> }) {
    return this.config.saveConfig(body.items);
  }

  @Get('activities')
  activities() {
    return this.config.activities();
  }

  @Post('activities')
  saveActivity(@Body(new ZodValidationPipe(activitySchema)) body: Parameters<AdminConfigService['saveActivity']>[0]) {
    return this.config.saveActivity(body);
  }

  @Delete('activities/:id')
  removeActivity(@Param('id') id: string) {
    return this.config.removeActivity(id);
  }

  @Get('badges')
  badges() {
    return this.config.badges();
  }

  @Patch('badges/:id')
  saveBadge(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(badgeSchema)) body: { threshold?: number; enabled?: boolean; desc?: string },
  ) {
    return this.config.saveBadge(id, body);
  }
}
