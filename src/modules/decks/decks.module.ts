import { Module } from '@nestjs/common';
import { DecksController } from './decks.controller';
import { AdminDecksController } from './admin-decks.controller';
import { DecksService } from './decks.service';

@Module({
  controllers: [DecksController, AdminDecksController],
  providers: [DecksService],
  exports: [DecksService],
})
export class DecksModule {}
