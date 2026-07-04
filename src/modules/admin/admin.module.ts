import { Module } from '@nestjs/common';
import { DecksModule } from '../decks/decks.module';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminWordsController } from './controllers/admin-words.controller';
import { AdminDecksController } from './controllers/admin-decks.controller';

/**
 * Groups every `/admin/*` endpoint behind the ADMIN role. User/word/stats logic
 * lives in `AdminService` (Prisma is global); deck management delegates to the
 * existing `DecksService` (imported via `DecksModule`).
 */
@Module({
  imports: [DecksModule],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminWordsController,
    AdminDecksController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
