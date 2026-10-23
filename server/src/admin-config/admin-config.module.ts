import { Module } from '@nestjs/common';
import { AdminConfigController } from './admin-config.controller';
import { AdminConfigService } from './admin-config.service';

@Module({
  controllers: [AdminConfigController],
  providers: [AdminConfigService],
})
export class AdminConfigModule {}
