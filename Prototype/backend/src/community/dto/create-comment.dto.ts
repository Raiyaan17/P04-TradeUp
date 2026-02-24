import { IsString, IsNotEmpty, MaxLength, IsInt, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  postId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsInt()
  @IsOptional()
  parentId?: number;
}
