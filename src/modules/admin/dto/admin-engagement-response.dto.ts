import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Coarse engagement indicators for product decisions; contains no user rows. */
export class AdminEngagementResponseDto {
  @ApiProperty({ example: 1200 }) @Expose() totalUsers: number;
  @ApiProperty({ example: 980 }) @Expose() onboardedUsers: number;
  @ApiProperty({ example: 740 }) @Expose() firstLessonUsers: number;
  @ApiProperty({ example: 620 }) @Expose() eligible7DayUsers: number;
  @ApiProperty({ example: 180 }) @Expose() returnedIn7Days: number;
  @ApiProperty({ example: 450 }) @Expose() eligible30DayUsers: number;
  @ApiProperty({ example: 240 }) @Expose() returnedIn30Days: number;
  @ApiProperty({ example: 16 }) @Expose() abandonedTests: number;
  @ApiProperty({ example: 210 }) @Expose() remindersEnabled: number;
  @ApiProperty({ example: 990 }) @Expose() remindersDisabled: number;
  @ApiProperty({ example: 24 }) @Expose() reminderOptOuts30Days: number;
}
