import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SmsScene = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD' | 'BIND_PHONE';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly ttlSec = 300;
  private readonly resendIntervalSec = 60;
  private readonly dailyLimit = 10;

  constructor(private readonly prisma: PrismaService) {}

  /** 发送验证码：60s 内不允许重发，单日上限 10 条 */
  async send(phone: string, scene: SmsScene): Promise<{ ttl: number }> {
    const since = new Date(Date.now() - this.resendIntervalSec * 1000);
    const recent = await this.prisma.smsCode.findFirst({
      where: { phone, scene, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new HttpException('验证码发送过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.smsCode.count({
      where: { phone, createdAt: { gte: dayStart } },
    });
    if (todayCount >= this.dailyLimit) {
      throw new HttpException('今日验证码次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.prisma.smsCode.create({
      data: { phone, code, scene, expiresAt: new Date(Date.now() + this.ttlSec * 1000) },
    });

    // TODO: 接入阿里云短信（配置齐全后替换 console 实现）
    this.logger.log(`[SMS:${scene}] ${phone} -> ${code}`);
    return { ttl: this.ttlSec };
  }

  /** 校验并消费验证码 */
  async verify(phone: string, scene: SmsScene, code: string): Promise<void> {
    const record = await this.prisma.smsCode.findFirst({
      where: { phone, scene, code, used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new BadRequestException('验证码不正确');
    if (record.expiresAt.getTime() < Date.now()) throw new BadRequestException('验证码已过期');

    await this.prisma.smsCode.update({ where: { id: record.id }, data: { used: true } });
  }
}
