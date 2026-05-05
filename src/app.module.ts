import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WordsModule } from './modules/words/words.module';
import { LearningModule } from './modules/learning/learning.module';
import { TestsModule } from './modules/tests/tests.module';
import { ProgressModule } from './modules/progress/progress.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    WordsModule,
    LearningModule,
    TestsModule,
    ProgressModule,
  ],
})
export class AppModule {}
