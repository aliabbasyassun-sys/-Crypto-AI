export interface RiskConfig {
  accountSize: number;
  riskPct: number;
  riskAmount: number;
}

export interface PositionPlan {
  side: 'long' | 'short' | 'none';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  slPctFromEntry: number;
  tp1PctFromEntry: number;
  riskAmount: number;
  potentialProfit1: number;
  potentialProfit2: number;
  positionSize: number;
  positionValue: number;
  suggestedLeverage: number;
  riskRewardRatio1: number;
  riskRewardRatio2: number;
  warning?: string;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  accountSize: 100,
  riskPct: 5,
  riskAmount: 5,
};

export function buildPositionPlan(
  price: number,
  decision: 'bullish' | 'bearish' | 'neutral',
  slDistance: number,
  tp1Distance: number,
  tp2Distance: number,
  cfg: RiskConfig = DEFAULT_RISK_CONFIG
): PositionPlan {
  const riskAmount = cfg.accountSize * (cfg.riskPct / 100);

  if (decision === 'neutral' || slDistance <= 0) {
    return {
      side: 'none', entry: Number(price.toFixed(4)),
      stopLoss: 0, takeProfit1: 0, takeProfit2: 0,
      slPctFromEntry: 0, tp1PctFromEntry: 0,
      riskAmount: Number(riskAmount.toFixed(2)),
      potentialProfit1: 0, potentialProfit2: 0,
      positionSize: 0, positionValue: 0, suggestedLeverage: 0,
      riskRewardRatio1: 0, riskRewardRatio2: 0,
      warning: 'لا صفقة - الاتجاه غير واضح',
    };
  }

  const isLong = decision === 'bullish';
  const sl = isLong ? price - slDistance : price + slDistance;
  const tp1 = isLong ? price + tp1Distance : price - tp1Distance;
  const tp2 = isLong ? price + tp2Distance : price - tp2Distance;

  const positionSize = riskAmount / slDistance;
  const positionValue = positionSize * price;
  const leverage = positionValue / cfg.accountSize;

  const rr1 = tp1Distance / slDistance;
  const rr2 = tp2Distance / slDistance;

  let warning: string | undefined;
  if (leverage > 20) {
    warning = `تحذير: الرفع المقترح ${leverage.toFixed(1)}x مرتفع جدًا. فكّر في SL أوسع أو مخاطرة أقل.`;
  }

  return {
    side: isLong ? 'long' : 'short',
    entry: Number(price.toFixed(4)),
    stopLoss: Number(sl.toFixed(4)),
    takeProfit1: Number(tp1.toFixed(4)),
    takeProfit2: Number(tp2.toFixed(4)),
    slPctFromEntry: Number(((slDistance / price) * 100).toFixed(2)),
    tp1PctFromEntry: Number(((tp1Distance / price) * 100).toFixed(2)),
    riskAmount: Number(riskAmount.toFixed(2)),
    potentialProfit1: Number((riskAmount * rr1).toFixed(2)),
    potentialProfit2: Number((riskAmount * rr2).toFixed(2)),
    positionSize: Number(positionSize.toFixed(6)),
    positionValue: Number(positionValue.toFixed(2)),
    suggestedLeverage: Number(leverage.toFixed(2)),
    riskRewardRatio1: Number(rr1.toFixed(2)),
    riskRewardRatio2: Number(rr2.toFixed(2)),
    warning,
  };
}
