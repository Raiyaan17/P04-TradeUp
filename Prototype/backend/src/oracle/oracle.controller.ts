import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { OracleService } from './oracle.service';
import {
  StartSimulationDto,
  AnalyzeSimulationDto,
} from './dto/start-simulation.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PresetType } from '@prisma/client';

interface SimulationResponse {
  id: string;
  presetType: PresetType;
  stockSymbol: string;
  trajectory: Array<{
    day: number;
    priceModifier: number;
    cumulativePrice: number;
  }>;
  news: Array<{
    day: number;
    headline: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  basePrice: number;
  createdAt: Date;
  expiresAt: Date | null;
}

interface AnalysisResponse {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
}

interface PresetsResponse {
  presets: Array<{
    type: PresetType;
    name: string;
    description: string;
    isPro: boolean;
  }>;
  symbols: string[];
}

@Controller('oracle')
@UseGuards(JwtAuthGuard)
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Get('presets')
  getPresets(): PresetsResponse {
    const presets = this.oracleService.getAvailablePresets();
    const symbols = this.oracleService.getAvailableSymbols();
    return { presets, symbols };
  }

  @Post('start')
  async startSimulation(
    @Body() dto: StartSimulationDto,
  ): Promise<SimulationResponse> {
    return this.oracleService.getScenario(dto.presetType, dto.stockSymbol);
  }

  @Post('analyze')
  async analyzeSimulation(
    @Body() dto: AnalyzeSimulationDto,
  ): Promise<AnalysisResponse> {
    return this.oracleService.analyzePerformance(
      dto.scenarioId,
      dto.decisions,
      dto.finalPortfolio,
    );
  }
}
