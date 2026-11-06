import type { Candle } from './okx';
import { atr } from './indicators';

export interface PredictionPoint {
  time: number;
  price: number;
  upper: number;
  lower: number;
}

export interface Prediction {
  points: PredictionPoint[];
  targetPrice: number;
  targetTime: number;
  direction: 'up' | 'down' | 'flat';
  confidence: number;
  horizonCandles: number;
  timeframeSec: number;
}

export function predictFuture(
  candles: Candle[],
  signal: 'bullish' | 'bearish' | 'neutral',
  strength: number,
  horizonCandles = 8,
  timeframeSec = 14400
): Prediction {
  const last = candles[candles.length - 1];
  const price = last.close;
  const atrArr = atr(candles, 14);
  const lastAtr = atrArr[atrArr.length - 1] || price * 0.02;

  let drift = 0;
  if (signal === 'bullish') drift = lastAtr * 0.4 * strength;
  else if (signal === 'bearish') drift = -lastAtr * 0.4 * strength;

  const points: PredictionPoint[] = [];
  let currentPrice = price;

  for (let i = 1; i <= horizonCandles; i++) {
    currentPrice += drift;
    const bandWidth = lastAtr * Math.sqrt(i) * 1.2;
    points.push({
      time: last.time + i * timeframeSec,
      price: Number(currentPrice.toFixed(4)),
      upper: Number((currentPrice + bandWidth).toFixed(4)),
      lower: Number((currentPrice - bandWidth).toFixed(4)),
    });
  }

  const target = points[points.length - 1];
  return {
    points,
    targetPrice: target.price,
    targetTime: target.time,
    direction: signal === 'bullish' ? 'up' : signal === 'bearish' ? 'down' : 'flat',
    confidence: Number((strength * 100).toFixed(1)),
    horizonCandles,
    timeframeSec,
  };
}
