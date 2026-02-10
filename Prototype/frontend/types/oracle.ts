export interface TrajectoryPoint {
  day: number;
  priceModifier: number;
  cumulativePrice: number;
}

export interface NewsItem {
  day: number;
  headline: string;
  sentiment: "positive" | "negative" | "neutral";
}

export type PresetType =
  | "STEADY_CLIMB"
  | "FLASH_CRASH"
  | "IMF_ROLLERCOASTER"
  | "REALISTIC_OUTLOOK";

export interface Preset {
  type: PresetType;
  name: string;
  description: string;
  isPro: boolean;
}

export interface SimulationScenario {
  id: string;
  presetType: PresetType;
  stockSymbol: string;
  trajectory: TrajectoryPoint[];
  news: NewsItem[];
  basePrice: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface TradingDecision {
  day: number;
  action: "buy" | "sell" | "hold";
  quantity: number;
  price: number;
}

export interface FinalPortfolio {
  cash: number;
  shares: number;
  currentPrice: number;
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
}

export interface SimulationState {
  status: "IDLE" | "LOADING" | "RUNNING" | "PAUSED" | "COMPLETED";
  scenarioData: SimulationScenario | null;
  currentDay: number;
  speed: number;
  decisions: TradingDecision[];
  portfolio: FinalPortfolio;
}
