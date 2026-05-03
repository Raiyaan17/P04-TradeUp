import { IsNumber, IsPositive } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}
