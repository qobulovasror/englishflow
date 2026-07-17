import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class VocabularyStatsDto {
  @ApiProperty({ example: 42 })
  @Expose()
  total: number;

  @ApiProperty({ example: 10 })
  @Expose()
  new: number;

  @ApiProperty({ example: 22 })
  @Expose()
  learning: number;

  @ApiProperty({ example: 10 })
  @Expose()
  learned: number;

  @ApiProperty({
    example: 24,
    description: 'Percentage of learned words (0–100)',
  })
  @Expose()
  progressPercentage: number;
}

export class RecentTestDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 4 })
  @Expose()
  score: number;

  @ApiProperty({ example: 5 })
  @Expose()
  totalQuestions: number;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  createdAt: Date;
}

export class TestStatsDto {
  @ApiProperty({ example: 12 })
  @Expose()
  total: number;

  @ApiProperty({ example: 3.8, description: 'Average score across all tests' })
  @Expose()
  averageScore: number;

  @ApiProperty({ type: [RecentTestDto] })
  @Expose()
  @Type(() => RecentTestDto)
  recent: RecentTestDto[];
}

export class StreakStatsDto {
  @ApiProperty({
    example: 5,
    description:
      'Consecutive active days ending today (or yesterday if not yet reviewed today)',
  })
  @Expose()
  current: number;

  @ApiProperty({
    example: 12,
    description: 'Longest consecutive active-day run ever',
  })
  @Expose()
  longest: number;

  @ApiProperty({ example: 8, description: 'Reviews completed today (UTC)' })
  @Expose()
  todayCount: number;

  @ApiProperty({ example: 20, description: "User's daily review goal" })
  @Expose()
  dailyGoal: number;

  @ApiProperty({
    example: false,
    description: 'Whether todayCount has reached dailyGoal',
  })
  @Expose()
  goalMet: boolean;
}

export class ProgressResponseDto {
  @ApiProperty({ type: VocabularyStatsDto })
  @Expose()
  @Type(() => VocabularyStatsDto)
  vocabulary: VocabularyStatsDto;

  @ApiProperty({ type: TestStatsDto })
  @Expose()
  @Type(() => TestStatsDto)
  tests: TestStatsDto;

  @ApiProperty({ type: StreakStatsDto })
  @Expose()
  @Type(() => StreakStatsDto)
  streak: StreakStatsDto;
}
