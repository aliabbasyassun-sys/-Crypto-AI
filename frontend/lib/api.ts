import type { AnalysisResult, Candle } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function fetchCandles(pair: string, tf: string): Promise<Candle[]> {
  const res = await fetch(`${API}/api/candles?pair=${pair}&tf=${tf}&limit=300`);
  if (!res.ok) throw new Error('Failed to fetch candles');
  return (await res.json()).candles;
}

export async function analyzeMultiTf(
  pair: string, accountSize = 100, riskPct = 5
): Promise<AnalysisResult> {
  const res = await fetch(`${API}/api/analyze-mtf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pair, accountSize, riskPct }),
  });
  if (!res.ok) throw new Error('Analysis failed');
  return res.json();
}
