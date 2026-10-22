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

  /** 开发模式：接口直接回传验证码，便于本地联调（生产环境必须关闭） */
  private get devMode(): boolean {
    return process.env.SMS_DEV_MODE !== 'false' && process.env.NODE_ENV !== 'production';
  }

  /** 发送验证码：60s 内不允许重发，单日上限 10 条 */
  async send(phone: string, scene: SmsScene): Promise<{ ttl: number; devCode?: string }> {
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
    return this.devMode ? { ttl: this.ttlSec, devCode: code } : { ttl: this.ttlSec };
  }

  /** 后台查看验证码记录（生产环境默认脱敏） */
  async list(params: { phone?: string; scene?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const where = {
      ...(params.phone ? { phone: { contains: params.phone } } : {}),
      ...(params.scene ? { scene: params.scene } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.smsCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.smsCode.count({ where }),
    ]);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.smsCode.count({ where: { createdAt: { gte: dayStart } } });

    return {
      list: rows.map((r) => ({
        id: r.id,
        phone: r.phone,
        scene: r.scene,
        code: this.devMode ? r.code : `${r.code.slice(0, 2)}****`,
        used: r.used,
        expired: r.expiresAt.getTime() < Date.now(),
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
      todayCount,
      devMode: this.devMode,
    };
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
