import type { Candle } from './okx';
import { getNews, getFearGreed, getFundingRate, getCandles } from './okx';
import {
  trendAgent, momentumAgent, volatilityAgent, fibonacciAgent,
  supportResistanceAgent, liquidityAgent, newsAgent, sentimentAgent,
  riskAgent, contextAgent,
  type AgentReport, type Level,
} from './agents';
import { buildPositionPlan, type RiskConfig, DEFAULT_RISK_CONFIG, type PositionPlan } from './risk';
import { predictFuture, type Prediction } from './predictor';

interface Decision {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  bullishVotes: number;
  bearishVotes: number;
  summary: string;
}

function runAnalysis(
  candles: Candle[],
  higherCandles: Candle[],
  news: { title: string; sentiment: 'positive' | 'negative' | 'neutral' }[],
  fearGreed: number | null,
  fundingRate: number | null
) {
  const reports: AgentReport[] = [
    trendAgent(candles),
    momentumAgent(candles),
    volatilityAgent(candles),
    fibonacciAgent(candles),
    supportResistanceAgent(candles),
    liquidityAgent(candles),
    newsAgent(news),
    sentimentAgent(fearGreed, fundingRate),
    contextAgent(higherCandles),
  ];
  const risk = riskAgent(candles);

  let bull = 0, bear = 0, tw = 0;
  for (const r of reports) {
    if (r.weight === 0) continue;
    tw += r.weight;
    if (r.signal === 'bullish') bull += r.weight * r.strength;
    if (r.signal === 'bearish') bear += r.weight * r.strength;
  }
  const bullPct = tw > 0 ? (bull / tw) * 100 : 0;
  const bearPct = tw > 0 ? (bear / tw) * 100 : 0;

  let signal: Decision['signal'] = 'neutral';
  let confidence = Math.max(bullPct, bearPct);
  if (bullPct > bearPct * 1.2 && bullPct > 15) {
    signal = 'bullish'; confidence = Math.min(95, bullPct * 1.5);
  } else if (bearPct > bullPct * 1.2 && bearPct > 15) {
    signal = 'bearish'; confidence = Math.min(95, bearPct * 1.5);
  }

  return {
    signal, confidence,
    bullishVotes: Number(bullPct.toFixed(1)),
    bearishVotes: Number(bearPct.toFixed(1)),
    levels: reports.flatMap((r) => r.levels),
    reports,
    risk,
    price: candles[candles.length - 1].close,
  };
}

function combine(
  a1h: ReturnType<typeof runAnalysis>,
  a4h: ReturnType<typeof runAnalysis>
): Decision {
  const bull = a1h.bullishVotes * 0.35 + a4h.bullishVotes * 0.65;
  const bear = a1h.bearishVotes * 0.35 + a4h.bearishVotes * 0.65;

  const agree = a1h.signal === a4h.signal && a1h.signal !== 'neutral';
  let signal: Decision['signal'] = 'neutral';
  let confidence = 0;

  if (agree) {
    signal = a4h.signal;
    confidence = Math.min(95, (a1h.confidence + a4h.confidence) / 2 + 15);
  } else if (a4h.signal !== 'neutral') {
    signal = a4h.signal;
    confidence = Math.min(70, a4h.confidence * 0.7);
  } else {
    confidence = Math.max(bull, bear);
  }

  const summary = agree
    ? `توافق 1H(${a1h.signal}) + 4H(${a4h.signal}) → ${signal} بثقة ${confidence.toFixed(0)}%`
    : `تعارض بين الأطر (1H=${a1h.signal} / 4H=${a4h.signal}) → اعتماد 4H بثقة ${confidence.toFixed(0)}%`;

  return {
    signal,
    confidence: Number(confidence.toFixed(1)),
    bullishVotes: Number(bull.toFixed(1)),
    bearishVotes: Number(bear.toFixed(1)),
    summary,
  };
}

function dedupeLevels(levels: Level[], tolerancePct = 0.003): Level[] {
  const out: Level[] = [];
  for (const lvl of levels) {
    const dup = out.find(
      (x) => Math.abs(x.price - lvl.price) / lvl.price < tolerancePct && x.agent === lvl.agent
    );
    if (!dup) out.push(lvl);
  }
  return out;
}

export async function orchestrateMultiTf(
  pair: string,
  cfg: RiskConfig = DEFAULT_RISK_CONFIG
) {
  const [c1h, c4h, c1d, news, fearGreed, fundingRate] = await Promise.all([
    getCandles(pair, '1H', 300),
    getCandles(pair, '4H', 300),
    getCandles(pair, '1D', 200),
    getNews(15),
    getFearGreed(),
    getFundingRate(pair),
  ]);

  const a4h = runAnalysis(c4h, c1d, news, fearGreed, fundingRate);
  const a1h = runAnalysis(c1h, c4h, news, fearGreed, fundingRate);

  const combined = combine(a1h, a4h);

  const prediction: Prediction = predictFuture(
    c4h, combined.signal, combined.confidence / 100, 8, 14400
  );

  const positionPlan: PositionPlan = buildPositionPlan(
    c4h[c4h.length - 1].close,
    combined.signal,
    a4h.risk.slDistance,
    a4h.risk.tp1Distance,
    a4h.risk.tp2Distance,
    cfg
  );

  const levels = dedupeLevels([...a4h.levels, ...a1h.levels]);

  if (prediction.direction !== 'flat') {
    levels.push({
      price: prediction.targetPrice,
      color: prediction.direction === 'up' ? '#22d3ee' : '#f472b6',
      lineWidth: 2,
      lineStyle: 1,
      title: `توقع ${prediction.horizonCandles} شمعة 4H`,
      agent: 'predictor',
    });
  }

  return {
    pair,
    price: c4h[c4h.length - 1].close,
    combined,
    analysis1h: {
      signal: a1h.signal, confidence: a1h.confidence,
      bullishVotes: a1h.bullishVotes, bearishVotes: a1h.bearishVotes,
      reports: a1h.reports,
    },
    analysis4h: {
      signal: a4h.signal, confidence: a4h.confidence,
      bullishVotes: a4h.bullishVotes, bearishVotes: a4h.bearishVotes,
      reports: a4h.reports,
    },
    levels,
    prediction,
    positionPlan,
    news: news.slice(0, 8),
    fearGreed,
    fundingRate,
  };
}
