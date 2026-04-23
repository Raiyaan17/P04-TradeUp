import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class ChatRequestDto {
  @IsNumber()
  @IsNotEmpty()
  sessionId: number;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class CreateSessionDto {
  // No body needed — userId comes from JWT
}

export class ReviewRequestDto {
  @IsString()
  @IsNotEmpty()
  period: 'weekly' | 'monthly';
}

export class ChatResponseDto {
  @IsString()
  response: string;
}
