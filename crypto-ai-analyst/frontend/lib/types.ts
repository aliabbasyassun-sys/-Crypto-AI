export interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

export interface Level {
  price: number; color: string;
  lineWidth: 1 | 2 | 3 | 4; lineStyle: 0 | 1 | 2;
  title: string; agent: string;
}

export interface AgentReport {
  agent: string; label: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; reasons: string[];
  levels: Level[]; weight: number;
}

export interface Decision {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  bullishVotes: number;
  bearishVotes: number;
  summary: string;
}

export interface PredictionPoint {
  time: number; price: number; upper: number; lower: number;
}

export interface Prediction {
  points: PredictionPoint[];
  targetPrice: number; targetTime: number;
  direction: 'up' | 'down' | 'flat';
  confidence: number; horizonCandles: number; timeframeSec: number;
}

export interface PositionPlan {
  side: 'long' | 'short' | 'none';
  entry: number; stopLoss: number; takeProfit1: number; takeProfit2: number;
  slPctFromEntry: number; tp1PctFromEntry: number;
  riskAmount: number; potentialProfit1: number; potentialProfit2: number;
  positionSize: number; positionValue: number; suggestedLeverage: number;
  riskRewardRatio1: number; riskRewardRatio2: number;
  warning?: string;
}

export interface AnalysisResult {
  pair: string;
  price: number;
  combined: Decision;
  analysis1h: {
    signal: Decision['signal']; confidence: number;
    bullishVotes: number; bearishVotes: number; reports: AgentReport[];
  };
  analysis4h: {
    signal: Decision['signal']; confidence: number;
    bullishVotes: number; bearishVotes: number; reports: AgentReport[];
  };
  levels: Level[];
  prediction: Prediction;
  positionPlan: PositionPlan;
  news: { title: string; sentiment: 'positive' | 'negative' | 'neutral' }[];
  fearGreed: number | null;
  fundingRate: number | null;
}
