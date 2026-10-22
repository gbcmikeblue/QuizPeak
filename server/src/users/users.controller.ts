import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import type { User } from '@prisma/client';

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  profile(@CurrentUser() user: User) {
    return this.users.toProfile(user);
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
