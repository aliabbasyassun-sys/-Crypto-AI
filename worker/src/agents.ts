import type { Candle } from './okx';
import {
  ema, rsi, macd, atr, bollinger, findPivots, clusterLevels,
} from './indicators';

export interface Level {
  price: number;
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: 0 | 1 | 2;
  title: string;
  agent: string;
}

export interface AgentReport {
  agent: string;
  label: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  reasons: string[];
  levels: Level[];
  weight: number;
}

export function trendAgent(candles: Candle[]): AgentReport {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const last = closes.length - 1;
  const price = closes[last];
  const reasons: string[] = [];
  let signal: AgentReport['signal'] = 'neutral';
  let strength = 0;

  if (e20[last] && e50[last] && price > e20[last] && e20[last] > e50[last]) {
    signal = 'bullish'; strength = 0.75;
    reasons.push('السعر فوق EMA20 وEMA20 فوق EMA50 (اتجاه صاعد قصير)');
  } else if (e20[last] && e50[last] && price < e20[last] && e20[last] < e50[last]) {
    signal = 'bearish'; strength = 0.75;
    reasons.push('السعر تحت EMA20 وEMA20 تحت EMA50 (اتجاه هابط قصير)');
  } else {
    reasons.push('لا يوجد اتجاه واضح على الأطر القصيرة');
    strength = 0.3;
  }

  if (e200[last]) {
    if (price > e200[last]) reasons.push('السعر فوق EMA200 (اتجاه طويل صاعد)');
    else reasons.push('السعر تحت EMA200 (اتجاه طويل هابط)');
  }

  return { agent: 'trend', label: 'الاتجاه', signal, strength, reasons, levels: [], weight: 0.20 };
}

export function momentumAgent(candles: Candle[]): AgentReport {
  const closes = candles.map((c) => c.close);
  const r = rsi(closes, 14);
  const { macdLine, signalLine } = macd(closes);
  const last = closes.length - 1;
  const lastRsi = r[last] ?? 50;
  const macdNow = macdLine[last] ?? 0;
  const macdSig = signalLine[last] ?? 0;
  const reasons: string[] = [];
  let score = 0;

  if (lastRsi < 30) { score += 1; reasons.push(`RSI=${lastRsi.toFixed(1)} (تشبع بيع - إشارة شراء)`); }
  else if (lastRsi > 70) { score -= 1; reasons.push(`RSI=${lastRsi.toFixed(1)} (تشبع شراء - إشارة بيع)`); }
  else reasons.push(`RSI=${lastRsi.toFixed(1)} (محايد)`);

  if (macdNow > macdSig) { score += 1; reasons.push('MACD فوق خط الإشارة'); }
  else { score -= 1; reasons.push('MACD تحت خط الإشارة'); }

  const signal = score >= 1 ? 'bullish' : score <= -1 ? 'bearish' : 'neutral';
  return {
    agent: 'momentum', label: 'الزخم', signal,
    strength: Math.min(1, Math.abs(score) / 2),
    reasons, levels: [], weight: 0.15,
  };
}

export function volatilityAgent(candles: Candle[]): AgentReport {
  const closes = candles.map((c) => c.close);
  const a = atr(candles, 14);
  const bb = bollinger(closes, 20, 2);
  const last = closes.length - 1;
  const price = closes[last];
  const atrPct = ((a[last] ?? 0) / price) * 100;
  const reasons: string[] = [];
  if (atrPct > 3) reasons.push(`تقلب مرتفع ATR=${atrPct.toFixed(2)}% - احترس من الحركات المفاجئة`);
  else if (atrPct < 1) reasons.push(`تقلب منخفض ATR=${atrPct.toFixed(2)}% - قد ينفجر قريبًا`);
  else reasons.push(`تقلب طبيعي ATR=${atrPct.toFixed(2)}%`);

  if (bb.upper[last] && price > bb.upper[last]) reasons.push('السعر فوق الحد العلوي لبولينجر');
  if (bb.lower[last] && price < bb.lower[last]) reasons.push('السعر تحت الحد السفلي لبولينجر');

  return {
    agent: 'volatility', label: 'التقلب', signal: 'neutral',
    strength: Math.min(1, atrPct / 5), reasons, levels: [], weight: 0.05,
  };
}

export function fibonacciAgent(candles: Candle[]): AgentReport {
  const slice = candles.slice(-150);
  const { highs, lows } = findPivots(slice, 3, 3);
  if (highs.length === 0 || lows.length === 0) {
    return { agent: 'fibonacci', label: 'فيبوناتشي', signal: 'neutral', strength: 0, reasons: ['لا توجد سوينغ واضحة'], levels: [], weight: 0.10 };
  }
  const high = highs.reduce((a, b) => (a.price > b.price ? a : b));
  const low = lows.reduce((a, b) => (a.price < b.price ? a : b));
  const diff = high.price - low.price;
  if (diff <= 0) {
    return { agent: 'fibonacci', label: 'فيبوناتشي', signal: 'neutral', strength: 0, reasons: ['الحركة غير صالحة'], levels: [], weight: 0.10 };
  }
  const fibs = [
    { ratio: 0.236, label: '23.6%' },
    { ratio: 0.382, label: '38.2%' },
    { ratio: 0.5, label: '50%' },
    { ratio: 0.618, label: '61.8%' },
    { ratio: 0.786, label: '78.6%' },
  ];
  const levels: Level[] = fibs.map((f) => {
    const price = high.price - diff * f.ratio;
    return {
      price, color: '#8b5cf6', lineWidth: 1, lineStyle: 2,
      title: `Fib ${f.label}`, agent: 'fibonacci',
    };
  });
  const price = candles[candles.length - 1].close;
  const goldenZone = [high.price - diff * 0.618, high.price - diff * 0.5];
  let signal: AgentReport['signal'] = 'neutral';
  let strength = 0;
  if (price >= goldenZone[0] && price <= goldenZone[1]) {
    signal = 'bullish'; strength = 0.7;
  } else if (price < low.price * 0.999) {
    signal = 'bearish'; strength = 0.6;
  }
  return {
    agent: 'fibonacci', label: 'فيبوناتشي', signal, strength,
    reasons: [`النطاق: ${low.price.toFixed(2)} → ${high.price.toFixed(2)}`],
    levels, weight: 0.10,
  };
}

export function supportResistanceAgent(candles: Candle[]): AgentReport {
  const price = candles[candles.length - 1].close;
  const { highs, lows } = findPivots(candles.slice(-200), 4, 4);
  const highLevels = clusterLevels(highs.map((h) => h.price), 0.005)
    .sort((a, b) => b.touches - a.touches);
  const lowLevels = clusterLevels(lows.map((l) => l.price), 0.005)
    .sort((a, b) => b.touches - a.touches);

  const resistances = highLevels
    .filter((h) => h.price > price)
    .slice(0, 3);
  const supports = lowLevels
    .filter((l) => l.price < price)
    .slice(0, 3);

  const levels: Level[] = [];
  resistances.forEach((r, i) => levels.push({
    price: r.price, color: '#ef4444', lineWidth: (i === 0 ? 2 : 1) as 1 | 2,
    lineStyle: 0, title: `مقاومة ${r.price.toFixed(2)}`, agent: 'sr',
  }));
  supports.forEach((s, i) => levels.push({
    price: s.price, color: '#10b981', lineWidth: (i === 0 ? 2 : 1) as 1 | 2,
    lineStyle: 0, title: `دعم ${s.price.toFixed(2)}`, agent: 'sr',
  }));

  const nearRes = resistances[0] && Math.abs(resistances[0].price - price) / price < 0.01;
  const nearSup = supports[0] && Math.abs(supports[0].price - price) / price < 0.01;
  let signal: AgentReport['signal'] = 'neutral';
  let strength = 0;
  if (nearSup && !nearRes) { signal = 'bullish'; strength = 0.6; }
  else if (nearRes && !nearSup) { signal = 'bearish'; strength = 0.6; }

  return {
    agent: 'sr', label: 'الدعم والمقاومة', signal, strength,
    reasons: [
      `أقرب مقاومة: ${resistances[0]?.price.toFixed(2) ?? '—'}`,
      `أقرب دعم: ${supports[0]?.price.toFixed(2) ?? '—'}`,
    ],
    levels, weight: 0.15,
  };
}

export function liquidityAgent(candles: Candle[]): AgentReport {
  const levels: Level[] = [];
  const recent = candles.slice(-150);
  const { highs, lows } = findPivots(recent, 3, 3);

  const highClusters = clusterLevels(highs.map((h) => h.price), 0.003)
    .filter((c) => c.touches >= 2);
  const lowClusters = clusterLevels(lows.map((l) => l.price), 0.003)
    .filter((c) => c.touches >= 2);

  highClusters.slice(0, 2).forEach((c) => levels.push({
    price: c.price, color: '#f59e0b', lineWidth: 2, lineStyle: 2,
    title: `سيولة شراء (${c.touches} لمسات)`, agent: 'liquidity',
  }));
  lowClusters.slice(0, 2).forEach((c) => levels.push({
    price: c.price, color: '#f59e0b', lineWidth: 2, lineStyle: 2,
    title: `سيولة بيع (${c.touches} لمسات)`, agent: 'liquidity',
  }));

  const fvgs: { top: number; bottom: number; type: 'bull' | 'bear' }[] = [];
  for (let i = 2; i < recent.length; i++) {
    const a = recent[i - 2], b = recent[i];
    if (b.low > a.high) fvgs.push({ top: b.low, bottom: a.high, type: 'bull' });
    if (b.high < a.low) fvgs.push({ top: a.low, bottom: b.high, type: 'bear' });
  }
  fvgs.slice(-3).forEach((f) => {
    const mid = (f.top + f.bottom) / 2;
    levels.push({
      price: mid, color: '#06b6d4', lineWidth: 1, lineStyle: 1,
      title: `FVG ${f.type === 'bull' ? 'صاعد' : 'هابط'}`, agent: 'liquidity',
    });
  });

  const price = recent[recent.length - 1].close;
  const nearLiquidity = levels.some((l) => Math.abs(l.price - price) / price < 0.005);
  return {
    agent: 'liquidity', label: 'السيولة', signal: 'neutral',
    strength: nearLiquidity ? 0.5 : 0.2,
    reasons: [`${levels.length} منطقة سيولة محتملة`],
    levels, weight: 0.10,
  };
}

export function newsAgent(
  news: { title: string; sentiment: 'positive' | 'negative' | 'neutral' }[]
): AgentReport {
  if (!news.length) {
    return { agent: 'news', label: 'الأخبار', signal: 'neutral', strength: 0,
      reasons: ['لم يتم جلب أخبار'], levels: [], weight: 0.10 };
  }
  const pos = news.filter((n) => n.sentiment === 'positive').length;
  const neg = news.filter((n) => n.sentiment === 'negative').length;
  let signal: AgentReport['signal'] = 'neutral';
  if (pos > neg + 2) signal = 'bullish';
  else if (neg > pos + 2) signal = 'bearish';
  return {
    agent: 'news', label: 'الأخبار', signal,
    strength: Math.min(1, Math.abs(pos - neg) / news.length),
    reasons: [`${pos} إيجابي / ${neg} سلبي من ${news.length} عنوان`],
    levels: [], weight: 0.10,
  };
}

export function sentimentAgent(
  fearGreed: number | null,
  fundingRate: number | null
): AgentReport {
  const reasons: string[] = [];
  let score = 0;
  if (fearGreed != null) {
    reasons.push(`مؤشر الخوف والطمع = ${fearGreed}`);
    if (fearGreed < 25) { score += 1; reasons.push('خوف شديد - فرصة شراء عكسية'); }
    else if (fearGreed > 75) { score -= 1; reasons.push('طمع شديد - احتمال تصحيح'); }
  }
  if (fundingRate != null) {
    reasons.push(`Funding Rate = ${(fundingRate * 100).toFixed(4)}%`);
    if (fundingRate > 0.0005) { score -= 1; reasons.push('تمويل مرتفع جدًا (Longs يدفعون)'); }
    if (fundingRate < -0.0005) { score += 1; reasons.push('تمويل سالب (Shorts يدفعون)'); }
  }
  const signal = score >= 1 ? 'bullish' : score <= -1 ? 'bearish' : 'neutral';
  return {
    agent: 'sentiment', label: 'المشاعر', signal,
    strength: Math.min(1, Math.abs(score) / 2),
    reasons, levels: [], weight: 0.05,
  };
}

export function riskAgent(candles: Candle[]) {
  const a = atr(candles, 14);
  const price = candles[candles.length - 1].close;
  const lastAtr = a[a.length - 1] ?? price * 0.02;
  const slDistance = lastAtr * 1.5;
  const tp1Distance = lastAtr * 2;
  const tp2Distance = lastAtr * 3;
  const reasons = [
    `ATR = ${lastAtr.toFixed(2)}`,
    `SL مقترح = ${slDistance.toFixed(2)} (1.5×ATR)`,
    `TP1 = ${tp1Distance.toFixed(2)} (2×ATR)`,
    `TP2 = ${tp2Distance.toFixed(2)} (3×ATR)`,
    `حجم المركز محسوب من مخاطرة المستخدم`,
  ];
  return {
    slDistance, tp1Distance, tp2Distance, lastAtr,
    report: {
      agent: 'risk', label: 'إدارة المخاطر', signal: 'neutral' as const,
      strength: 0, reasons, levels: [], weight: 0,
    },
  };
}

export function contextAgent(higherCandles: Candle[]): AgentReport {
  const closes = higherCandles.map((c) => c.close);
  if (closes.length < 30) {
    return { agent: 'context', label: 'السياق', signal: 'neutral', strength: 0,
      reasons: ['بيانات غير كافية'], levels: [], weight: 0.10 };
  }
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const last = closes.length - 1;
  const bullish = e20[last] > e50[last];
  return {
    agent: 'context', label: 'السياق (HTF)', signal: bullish ? 'bullish' : 'bearish',
    strength: 0.65,
    reasons: [bullish ? 'الإطار الأعلى صاعد' : 'الإطار الأعلى هابط'],
    levels: [], weight: 0.10,
  };
}
