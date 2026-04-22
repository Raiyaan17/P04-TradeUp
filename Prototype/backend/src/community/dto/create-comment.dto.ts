import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  postId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  imageUrl?: string;

  @IsInt()
  @IsOptional()
  parentId?: number;
}
