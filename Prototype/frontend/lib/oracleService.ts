import { http } from "./http";
import type {
  Preset,
  SimulationScenario,
  TradingDecision,
  FinalPortfolio,
  AnalysisResult,
  PresetType,
} from "@/types/oracle";

interface PresetsResponse {
  presets: Preset[];
  symbols: string[];
}

interface StartSimulationRequest {
  presetType: PresetType;
  stockSymbol: string;
}

interface AnalyzeSimulationRequest {
  scenarioId: string;
  decisions: TradingDecision[];
  finalPortfolio: FinalPortfolio;
}

export const oracleService = {
  async getPresets(): Promise<PresetsResponse> {
    return http.get<PresetsResponse>("/oracle/presets");
  },

  async startSimulation(
    presetType: PresetType,
    stockSymbol: string,
  ): Promise<SimulationScenario> {
    return http.post<SimulationScenario>("/oracle/start", {
      presetType,
      stockSymbol,
    } as StartSimulationRequest);
  },

  async analyzeSimulation(
    scenarioId: string,
    decisions: TradingDecision[],
    finalPortfolio: FinalPortfolio,
  ): Promise<AnalysisResult> {
    return http.post<AnalysisResult>("/oracle/analyze", {
      scenarioId,
      decisions,
      finalPortfolio,
    } as AnalyzeSimulationRequest);
  },
};

export default oracleService;
