import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class SellStockDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
