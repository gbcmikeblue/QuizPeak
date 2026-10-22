import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSmsController } from './admin-sms.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminSmsController],
})
export class AdminSmsModule {}
