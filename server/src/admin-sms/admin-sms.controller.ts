import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { SmsService } from '../auth/sms.service';

/** 后台短信记录：便于本地联调查看验证码（生产环境自动脱敏） */
@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin/sms')
export class AdminSmsController {
  constructor(private readonly sms: SmsService) {}

  @Get()
  list(
    @Query('phone') phone?: string,
    @Query('scene') scene?: string,
    @Query('client') client?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sms.list({
      phone,
      scene,
      client,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 20),
    });
  }
}
