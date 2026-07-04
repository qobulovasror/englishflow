import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AdminUserStatsDto {
  @ApiProperty({ example: 1240 }) @Expose() total: number;
  @ApiProperty({ example: 3 }) @Expose() admins: number;
  @ApiProperty({ example: 980 }) @Expose() verified: number;
  @ApiProperty({ example: 1100 }) @Expose() onboarded: number;
  @ApiProperty({ example: 12, description: 'Signups since UTC midnight today' }) @Expose() newToday: number;
  @ApiProperty({ example: 84, description: 'Signups in the last 7 days' }) @Expose() newThisWeek: number;
}

export class AdminDeckStatsDto {
  @ApiProperty({ example: 57 }) @Expose() total: number;
  @ApiProperty({ example: 12, description: 'Curated system decks' }) @Expose() system: number;
}

export class AdminWordStatsDto {
  @ApiProperty({ example: 8400 }) @Expose() total: number;
}

export class AdminReviewStatsDto {
  @ApiProperty({ example: 91000 }) @Expose() total: number;
  @ApiProperty({ example: 320, description: 'Reviews since UTC midnight today' }) @Expose() today: number;
}

export class AdminTestStatsDto {
  @ApiProperty({ example: 4200 }) @Expose() total: number;
}

/** Aggregate platform metrics for the admin dashboard. */
export class AdminStatsOverviewDto {
  @ApiProperty({ type: AdminUserStatsDto })
  @Expose()
  @Type(() => AdminUserStatsDto)
  users: AdminUserStatsDto;

  @ApiProperty({ type: AdminDeckStatsDto })
  @Expose()
  @Type(() => AdminDeckStatsDto)
  decks: AdminDeckStatsDto;

  @ApiProperty({ type: AdminWordStatsDto })
  @Expose()
  @Type(() => AdminWordStatsDto)
  words: AdminWordStatsDto;

  @ApiProperty({ type: AdminReviewStatsDto })
  @Expose()
  @Type(() => AdminReviewStatsDto)
  reviews: AdminReviewStatsDto;

  @ApiProperty({ type: AdminTestStatsDto })
  @Expose()
  @Type(() => AdminTestStatsDto)
  tests: AdminTestStatsDto;
}

/** One day of the signup trend series (dense, oldest→newest). */
export class SignupPointDto {
  @ApiProperty({ example: '2026-06-30' }) @Expose() date: string;
  @ApiProperty({ example: 14 }) @Expose() count: number;
}
