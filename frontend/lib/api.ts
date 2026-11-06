import type { AnalysisResult, Candle } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function fetchCandles(pair: string, tf: string): Promise<Candle[]> {
  const query = new URLSearchParams({ pair, tf, limit: '300' });
  const res = await fetch(`${API}/api/candles?${query}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to fetch candles (${res.status})`);
  return body.candles;
}

export async function analyzeMultiTf(
  pair: string, accountSize = 100, riskPct = 5
): Promise<AnalysisResult> {
  const res = await fetch(`${API}/api/analyze-mtf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pair, accountSize, riskPct }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Analysis failed (${res.status})`);
  return body;
}
