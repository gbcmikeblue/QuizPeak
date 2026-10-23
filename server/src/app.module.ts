import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AdminArticleModule } from './admin-article/admin-article.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminConfigModule } from './admin-config/admin-config.module';
import { AdminContestModule } from './admin-contest/admin-contest.module';
import { AdminQuizModule } from './admin-quiz/admin-quiz.module';
import { AdminSmsModule } from './admin-sms/admin-sms.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AttemptsModule } from './attempts/attempts.module';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { ContestsModule } from './contests/contests.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HealthController } from './health/health.controller';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { MeModule } from './me/me.module';
import { PointsModule } from './points/points.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuizModule } from './quiz/quiz.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    PrismaModule,
    AuthModule,
    AdminAuthModule,
    AdminSmsModule,
    AdminQuizModule,
    AdminContestModule,
    AdminConfigModule,
    AdminArticleModule,
    AdminUsersModule,
    AttemptsModule,
    ContestsModule,
    ArticlesModule,
    UsersModule,
    QuizModule,
    PointsModule,
    LeaderboardModule,
    MeModule,
    UploadModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
