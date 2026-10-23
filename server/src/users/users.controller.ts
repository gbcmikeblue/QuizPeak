import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';
import type { User } from '@prisma/client';

const passwordSchema = z.object({
  oldPassword: z.string().default(''),
  newPassword: z.string().min(8, '新密码至少 8 位').max(32),
});

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  profile(@CurrentUser() user: User) {
    return this.users.toProfile(user);
  }

  @Get('history')
  history(
    @CurrentUser() user: User,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.users.history(
      user.id,
      type === 'contest' ? 'contest' : 'quiz',
      Math.max(Number(page ?? 1), 1),
      Math.min(Math.max(Number(pageSize ?? 10), 1), 50),
    );
  }

  @Post('password')
  changePassword(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(passwordSchema)) body: { oldPassword: string; newPassword: string },
  ) {
    return this.users.changePassword(user.id, body.oldPassword, body.newPassword);
  }

  @Patch()
  update(
    @CurrentUser() user: User,
    @Body()
    body: {
      nickname?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
      address?: string;
    },
  ) {
    return this.users.updateProfile(user.id, body);
  }
}
