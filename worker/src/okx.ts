export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '12h': '12h', '1d': '1d',
};

export async function getCandles(
  pair: string,
  tf: string,
  limit = 300
): Promise<Candle[]> {
  const interval = TIMEFRAME_MAP[tf.toLowerCase()] ?? '1h';
  const symbol = pair.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit) || 300));
  const params = new URLSearchParams({ symbol, interval, limit: String(safeLimit) });
  const url = `https://data-api.binance.vision/api/v3/klines?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Binance ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  const data = await res.json<unknown>();
  if (!Array.isArray(data)) throw new Error('Binance returned an unexpected candle response');

  return (data as unknown[][])
    .map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
}

export async function getFearGreed(): Promise<number | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    if (!res.ok) return null;
    const j = await res.json<any>();
    return Number(j.data?.[0]?.value ?? null);
  } catch {
    return null;
  }
}

export async function getFundingRate(pair: string): Promise<number | null> {
  try {
    const instId = pair.replace('-USDT', '-USDT-SWAP');
    const res = await fetch(
      `https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`
    );
    if (!res.ok) return null;
    const j = await res.json<any>();
    const rate = j.data?.[0]?.fundingRate;
    return rate ? Number(rate) : null;
  } catch {
    return null;
  }
}

export async function getNews(limit = 10): Promise<
  { title: string; sentiment: 'positive' | 'negative' | 'neutral' }[]
> {
  try {
    const res = await fetch(
      `https://cryptocurrency.cv/api/news?limit=${limit}`
    );
    if (!res.ok) return [];
    const j = await res.json<any>();
    const items = Array.isArray(j.articles) ? j.articles : Array.isArray(j) ? j : [];
    return items.map((a: any) => {
      const title = (a.title ?? a.headline ?? '').toString();
      return { title, sentiment: classifyNewsSentiment(title) };
    });
  } catch {
    return [];
  }
}

const POSITIVE_WORDS = ['surge', 'rally', 'bull', 'gain', 'soar', 'adopt', 'approve', 'record', 'high', 'breakout', 'inflow'];
const NEGATIVE_WORDS = ['crash', 'drop', 'bear', 'fall', 'plunge', 'hack', 'ban', 'reject', 'low', 'outflow', 'liquidation', 'sell'];

export function classifyNewsSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const t = text.toLowerCase();
  const pos = POSITIVE_WORDS.filter((w) => t.includes(w)).length;
  const neg = NEGATIVE_WORDS.filter((w) => t.includes(w)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}
