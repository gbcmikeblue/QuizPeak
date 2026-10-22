import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PointTxType, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import {
  DEFAULT_RULES,
  type AuthTokens,
  type PasswordLoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SmsLoginInput,
} from '@quizpeak/shared';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { TokenService } from './token.service';

export interface PublicUser {
  id: string;
  phone: string;
  email: string | null;
  username: string;
  nickname: string | null;
  avatar: string | null;
  points: number;
  xp: number;
  level: number;
  streakDays: number;
  inviteCode: string;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly token: TokenService,
    private readonly points: PointsService,
  ) {}

  async smsLogin(input: SmsLoginInput): Promise<AuthResult> {
    await this.sms.verify(input.phone, 'LOGIN', input.code);

    let user = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user) {
      user = await this.createUser({
        phone: input.phone,
        inviteCode: input.inviteCode,
      });
    }
    if (user.status === UserStatus.BANNED) throw new UnauthorizedException('账号已被限制');

    return this.finishLogin(user);
  }

  async passwordLogin(input: PasswordLoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: input.account }, { email: input.account }, { username: input.account }],
      },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('账号或密码错误');

    const matched = await bcrypt.compare(input.password, user.passwordHash);
    if (!matched) throw new UnauthorizedException('账号或密码错误');
    if (user.status === UserStatus.BANNED) throw new UnauthorizedException('账号已被限制');

    return this.finishLogin(user);
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    await this.sms.verify(input.phone, 'REGISTER', input.code);

    const exists = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (exists) throw new ConflictException('该手机号已注册');

    const user = await this.createUser({
      phone: input.phone,
      password: input.password,
      nickname: input.nickname,
      inviteCode: input.inviteCode,
    });

    await this.prisma.smsCode.updateMany({
      where: { phone: input.phone, used: false },
      data: { used: true },
    });

    return this.finishLogin(user);
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ success: true }> {
    await this.sms.verify(input.phone, 'RESET_PASSWORD', input.code);
    const user = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user) throw new BadRequestException('手机号未注册');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await this.hash(input.password) },
    });
    return { success: true };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.token.verifyRefresh(refreshToken);
    if (payload.scope !== 'user') throw new UnauthorizedException('Token 类型错误');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('账号不可用');
    }
    return this.token.issue(user.id, 'user');
  }

  /** M1 采用前端丢弃 token；如需服务端强制下线，后续接入 Redis 黑名单 */
  logout(): { success: true } {
    return { success: true };
  }

  private async createUser(params: {
    phone: string;
    password?: string;
    nickname?: string;
    inviteCode?: string;
  }): Promise<User> {
    const inviter = params.inviteCode
      ? await this.prisma.user.findUnique({ where: { inviteCode: params.inviteCode } })
      : null;

    const user = await this.prisma.user.create({
      data: {
        phone: params.phone,
        nickname: params.nickname ?? `用户${params.phone.slice(-4)}`,
        username: await this.generateUsername(),
        passwordHash: params.password ? await this.hash(params.password) : null,
        inviteCode: await this.generateInviteCode(),
        inviterId: inviter?.id,
      },
    });

    // 新人礼：注册即赠积分（额度可在后台积分任务中调整）
    const bonus = await this.points.rule(
      'points.register_bonus',
      DEFAULT_RULES.REGISTER_BONUS_POINTS,
    );
    if (bonus > 0) {
      await this.points.change({
        userId: user.id,
        delta: bonus,
        type: PointTxType.REGISTER_BONUS,
        refType: 'user',
        refId: user.id,
        remark: '新人注册礼',
      });
    }

    return (await this.prisma.user.findUnique({ where: { id: user.id } })) ?? user;
  }

  private async finishLogin(user: User): Promise<AuthResult> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = await this.token.issue(user.id, 'user');
    return { user: this.toPublicUser(user), tokens };
  }

  private async hash(raw: string): Promise<string> {
    return bcrypt.hash(raw, 10);
  }

  private async generateUsername(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const candidate = `u${randomBytes(4).toString('hex')}`;
      const exists = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!exists) return candidate;
    }
    throw new ConflictException('用户名生成失败，请重试');
  }

  private async generateInviteCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const candidate = randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
      const exists = await this.prisma.user.findUnique({ where: { inviteCode: candidate } });
      if (!exists) return candidate;
    }
    throw new ConflictException('邀请码生成失败，请重试');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      points: user.points,
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      inviteCode: user.inviteCode,
      createdAt: user.createdAt,
    };
  }
}
