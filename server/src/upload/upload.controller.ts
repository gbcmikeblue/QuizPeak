import { BadRequestException, Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Response } from 'express';
import { z } from 'zod';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

const uploadSchema = z.object({
  /** data:image/png;base64,xxxx */
  dataUrl: z.string().min(32),
  name: z.string().max(80).optional(),
});

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_BYTES = 2 * 1024 * 1024;

@Controller()
export class UploadController {
  /** 后台上传图片（封面 / banner），返回可直接使用的 URL */
  @Public()
  @UseGuards(AdminAuthGuard)
  @Post('admin/upload')
  async upload(@Body(new ZodValidationPipe(uploadSchema)) body: { dataUrl: string; name?: string }) {
    const match = body.dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    if (!match) throw new BadRequestException('仅支持 base64 图片数据');

    const mime = match[1].toLowerCase();
    const ext = MIME_EXT[mime];
    if (!ext) throw new BadRequestException('仅支持 png / jpg / webp / gif / svg');

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.byteLength > MAX_BYTES) throw new BadRequestException('图片不能超过 2MB');

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return { url: `/api/uploads/${filename}`, size: buffer.byteLength, mime };
  }

  /** 静态读取已上传图片（无需鉴权，供前台 <img> 使用） */
  @Public()
  @Get('uploads/:file')
  serve(@Param('file') file: string, @Res() res: Response) {
    if (!/^[a-zA-Z0-9._-]+$/.test(file)) throw new BadRequestException('非法文件名');
    const full = path.join(UPLOAD_DIR, file);
    if (!full.startsWith(UPLOAD_DIR) || !existsSync(full)) throw new BadRequestException('文件不存在');
    res.sendFile(full);
  }
}
