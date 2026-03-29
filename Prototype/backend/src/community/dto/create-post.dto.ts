import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsOptional,
  IsUrl,
} from 'class-validator';

export enum PostTagDto {
  GENERAL = 'GENERAL',
  STOCKS = 'STOCKS',
  CRYPTO = 'CRYPTO',
  NEWS = 'NEWS',
  ANALYSIS = 'ANALYSIS',
  QUESTION = 'QUESTION',
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(PostTagDto)
  @IsOptional()
  tag?: PostTagDto;
}
