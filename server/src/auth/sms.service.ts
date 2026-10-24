import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CLIENT_LABELS, ClientCode } from '@quizpeak/shared';
import { PrismaService } from '../prisma/prisma.service';

export type SmsScene = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD' | 'BIND_PHONE';

/**
 * 短信验证码
 *
 * 频控按「手机号 + 端」隔离：同一手机号在 PC 发过验证码后，60s 内 H5 仍可立即发送，
 * 互不占用额度（多端同时登录的前提）。同时保留一条跨端的天级硬上限，防止刷短信。
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  /** 验证码有效期（秒） */
  private readonly ttlSec = 300;
  /** 同一端重发间隔（秒） */
  private readonly resendIntervalSec = 60;
  /** 单个端每日上限 */
  private readonly dailyLimit = 10;
  /** 同一手机号跨端每日硬上限（防刷） */
  private readonly dailyTotalLimit = 30;

  constructor(private readonly prisma: PrismaService) {}

  /** 开发模式：接口直接回传验证码，便于本地联调（生产环境必须关闭） */
  private get devMode(): boolean {
    return process.env.SMS_DEV_MODE !== 'false' && process.env.NODE_ENV !== 'production';
  }

  private label(client: ClientCode): string {
    return CLIENT_LABELS[client] ?? client;
  }

  /** 发送验证码：同一端 60s 内不允许重发，单端每日 10 条、跨端每日 30 条 */
  async send(
    phone: string,
    scene: SmsScene,
    client: ClientCode = ClientCode.PC,
  ): Promise<{ ttl: number; devCode?: string; client: ClientCode }> {
    const since = new Date(Date.now() - this.resendIntervalSec * 1000);
    const recent = await this.prisma.smsCode.findFirst({
      where: { phone, scene, client, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new HttpException(
        `${this.label(client)}端验证码发送过于频繁，请稍后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [todayOnClient, todayTotal] = await this.prisma.$transaction([
      this.prisma.smsCode.count({ where: { phone, client, createdAt: { gte: dayStart } } }),
      this.prisma.smsCode.count({ where: { phone, createdAt: { gte: dayStart } } }),
    ]);
    if (todayOnClient >= this.dailyLimit) {
      throw new HttpException(
        `${this.label(client)}端今日验证码次数已达上限`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (todayTotal >= this.dailyTotalLimit) {
      throw new HttpException('该手机号今日验证码次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.prisma.smsCode.create({
      data: {
        phone,
        code,
        scene,
        client,
        expiresAt: new Date(Date.now() + this.ttlSec * 1000),
      },
    });

    // TODO: 接入阿里云短信（配置齐全后替换 console 实现）
    this.logger.log(`[SMS:${scene}][${client}] ${phone} -> ${code}`);
    return this.devMode
      ? { ttl: this.ttlSec, devCode: code, client }
      : { ttl: this.ttlSec, client };
  }

  /** 后台查看验证码记录（生产环境默认脱敏） */
  async list(params: {
    phone?: string;
    scene?: string;
    client?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const where = {
      ...(params.phone ? { phone: { contains: params.phone } } : {}),
      ...(params.scene ? { scene: params.scene } : {}),
      ...(params.client ? { client: params.client } : {}),
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
        // 手机号默认脱敏；完整号走 POST /admin/reveal-phone（写审计）
        phone: r.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        scene: r.scene,
        client: r.client,
        clientLabel: CLIENT_LABELS[r.client as ClientCode] ?? r.client,
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

  /**
   * 校验并消费验证码
   *
   * 先匹配本端验证码；本端没有再用同手机号其它端发的（用户常在 PC 拿了码去 H5 登录），
   * 频控仍然按端隔离，所以不会出现「A 端发过、B 端被限流」。
   */
  async verify(
    phone: string,
    scene: SmsScene,
    code: string,
    client: ClientCode = ClientCode.PC,
  ): Promise<void> {
    const record =
      (await this.prisma.smsCode.findFirst({
        where: { phone, scene, code, used: false, client },
        orderBy: { createdAt: 'desc' },
      })) ??
      (await this.prisma.smsCode.findFirst({
        where: { phone, scene, code, used: false },
        orderBy: { createdAt: 'desc' },
      }));

    if (!record) throw new BadRequestException('验证码不正确');
    if (record.expiresAt.getTime() < Date.now()) throw new BadRequestException('验证码已过期');

    await this.prisma.smsCode.update({ where: { id: record.id }, data: { used: true } });
  }
}
