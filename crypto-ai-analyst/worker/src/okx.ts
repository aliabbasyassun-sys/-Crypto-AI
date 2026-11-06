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
  '1H': '1H', '4H': '4H', '1D': '1D',
};

export async function getCandles(
  pair: string,
  tf: string,
  limit = 300
): Promise<Candle[]> {
  const bar = TIMEFRAME_MAP[tf] ?? '1H';
  const url = `https://www.okx.com/api/v5/market/candles?instId=${pair}&bar=${bar}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OKX ${res.status}`);
  const data = await res.json<any>();
  if (data.code !== '0') throw new Error(`OKX: ${data.msg}`);

  return (data.data as string[][])
    .map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }))
    .reverse();
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
