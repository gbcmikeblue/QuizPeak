import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toProfile(user: User) {
    return {
      id: user.id,
      phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      address: user.address,
      points: user.points,
      totalEarned: user.totalEarned,
      likesReceived: user.likesReceived,
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      inviteCode: user.inviteCode,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    body: Partial<Pick<User, 'nickname' | 'firstName' | 'lastName' | 'avatar' | 'address'>>,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: body.nickname,
        firstName: body.firstName,
        lastName: body.lastName,
        avatar: body.avatar,
        address: body.address,
      },
    });
    return this.toProfile(user);
  }
}
