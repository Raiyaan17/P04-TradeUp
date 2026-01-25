import { IsEnum, IsNotEmpty, IsString, isUppercase } from 'class-validator';
import { MarketScenario } from '@prisma/client';

export class RunSimulationDto {
  @IsString()
  @IsNotEmpty()
  ticker: string;

  @IsEnum(MarketScenario)
  @IsNotEmpty()
  scenario: MarketScenario;
}
