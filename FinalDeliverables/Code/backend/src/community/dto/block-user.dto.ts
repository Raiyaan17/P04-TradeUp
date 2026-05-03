import { IsInt } from 'class-validator';

export class BlockUserDto {
  @IsInt()
  blockedId!: number;
}
