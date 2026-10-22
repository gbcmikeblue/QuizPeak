import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens, JwtPayload } from '@quizpeak/shared';

@Injectable()
export class TokenService {
  private readonly accessExpires = Number(process.env.JWT_ACCESS_EXPIRES ?? 1800);
  private readonly refreshExpires = Number(process.env.JWT_REFRESH_EXPIRES ?? 604800);

  constructor(private readonly jwt: JwtService) {}

  async issue(userId: string, scope: 'user' | 'admin' = 'user', roles?: string[]): Promise<AuthTokens> {
    const base = { sub: userId, scope, roles };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, typ: 'access' } as JwtPayload, {
        expiresIn: this.accessExpires,
      }),
      this.jwt.signAsync({ ...base, typ: 'refresh' } as JwtPayload, {
        expiresIn: this.refreshExpires,
      }),
    ]);
    return { accessToken, refreshToken, expiresIn: this.accessExpires };
  }

  async verifyRefresh(token: string): Promise<JwtPayload> {
    let payload: JwtPayload & { typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Token 类型错误');
    return payload;
  }
}
