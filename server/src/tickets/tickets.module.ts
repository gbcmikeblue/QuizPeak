import { Module } from '@nestjs/common';
import { AdminTicketsController, TicketsController } from './tickets.controllers';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, AdminTicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
