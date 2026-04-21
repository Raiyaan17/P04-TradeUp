import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SellStockDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsEnum(['TARGET_HIT', 'PANIC_EMOTION', 'NEEDED_CASH'])
  sellReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  sellNote?: string;
}
