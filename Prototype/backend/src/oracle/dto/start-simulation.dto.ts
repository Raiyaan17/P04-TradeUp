import {
  IsEnum,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PresetType } from '@prisma/client';

export class StartSimulationDto {
  @IsEnum(PresetType)
  presetType: PresetType;

  @IsString()
  stockSymbol: string;
}

export class TradingDecisionDto {
  @IsNumber()
  day: number;

  @IsString()
  action: 'buy' | 'sell' | 'hold';

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class FinalPortfolioDto {
  @IsNumber()
  cash: number;

  @IsNumber()
  shares: number;

  @IsNumber()
  currentPrice: number;
}

export class AnalyzeSimulationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradingDecisionDto)
  decisions: TradingDecisionDto[];

  @ValidateNested()
  @Type(() => FinalPortfolioDto)
  finalPortfolio: FinalPortfolioDto;

  @IsString()
  scenarioId: string;
}
