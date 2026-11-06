import type { Candle } from './okx';

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    out[i] = sum / period;
  }
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = [];
  let gain = 0, loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (i <= period) {
      if (diff >= 0) gain += diff; else loss -= diff;
      if (i === period) {
        const rs = gain / (loss || 1e-9);
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      const g = Math.max(diff, 0);
      const l = Math.max(-diff, 0);
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      const rs = gain / (loss || 1e-9);
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }
  const valid = macdLine.filter((v) => v != null);
  const signalLine = ema(valid, signal);
  const offset = closes.length - signalLine.length;
  const aligned: number[] = new Array(closes.length).fill(undefined);
  signalLine.forEach((v, i) => { aligned[offset + i] = v; });
  return { macdLine, signalLine: aligned };
}

export function atr(candles: Candle[], period = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { tr[i] = candles[i].high - candles[i].low; continue; }
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  const out: number[] = [];
  let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  out[period - 1] = sum / period;
  for (let i = period; i < tr.length; i++) {
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

export function bollinger(closes: number[], period = 20, mult = 2) {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { upper, middle, lower };
}

export function findPivots(candles: Candle[], left = 3, right = 3) {
  const highs: { time: number; price: number }[] = [];
  const lows: { time: number; price: number }[] = [];
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i];
    let isHigh = true, isLow = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }
    if (isHigh) highs.push({ time: c.time, price: c.high });
    if (isLow) lows.push({ time: c.time, price: c.low });
  }
  return { highs, lows };
}

export function clusterLevels(
  prices: number[],
  tolerancePct = 0.005
): { price: number; touches: number }[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters: { price: number; touches: number }[] = [];
  for (const p of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(p - last.price) / last.price < tolerancePct) {
      last.price = (last.price * last.touches + p) / (last.touches + 1);
      last.touches++;
    } else {
      clusters.push({ price: p, touches: 1 });
    }
  }
  return clusters;
}
