import { IsInt, IsEnum } from 'class-validator';

export enum ReactionTypeDto {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  FIRE = 'FIRE',
  BEARISH = 'BEARISH',
  BULLISH = 'BULLISH',
}

export class ToggleReactionDto {
  @IsInt()
  postId!: number;

  @IsEnum(ReactionTypeDto)
  type!: ReactionTypeDto;
}
