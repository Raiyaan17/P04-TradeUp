import { IsString } from 'class-validator';

export class SearchMentionDto {
  @IsString()
  query!: string;
}
