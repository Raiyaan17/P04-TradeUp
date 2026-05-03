import { IsInt } from 'class-validator';

export class SendRequestDto {
  @IsInt()
  receiverId!: number;
}
