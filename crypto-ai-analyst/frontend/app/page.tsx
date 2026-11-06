'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchCandles, analyzeMultiTf } from '@/lib/api';
import type { AnalysisResult, Candle } from '@/lib/types';
import AgentPanel from '@/components/AgentPanel';
import DecisionCard from '@/components/DecisionCard';

const TradingChart = dynamic(() => import('@/components/TradingChart'), { ssr: false });

const PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT', 'ADA-USDT', 'DOGE-USDT'];
const TFS = ['1H', '4H'];

export default function Home() {
  const [pair, setPair] = useState('BTC-USDT');
  const [tf, setTf] = useState('4H');
  const [accountSize, setAccountSize] = useState(100);
  const [riskPct, setRiskPct] = useState(5);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadChart() {
    setLoading(true); setError(null); setResult(null);
    try { setCandles(await fetchCandles(pair, tf)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function runAnalysis() {
    setLoading(true); setError(null);
    try {
      const [c, r] = await Promise.all([
        fetchCandles(pair, tf),
        analyzeMultiTf(pair, accountSize, riskPct),
      ]);
      setCandles(c);
      setResult(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen p-4 lg:p-8">
      <header className="mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row justify-between gap-3 items-start lg:items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Crypto AI Analyst · 1H + 4H
            </h1>
            <p className="text-xs text-gray-500">10 وكلاء + عقل مدبر + توقع شموع + إدارة مخاطر</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={pair} onChange={(e) => setPair(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              {PAIRS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select value={tf} onChange={(e) => setTf(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              {TFS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button onClick={loadChart} disabled={loading}
              className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm disabled:opacity-50">
              تحميل
            </button>
            <button onClick={runAnalysis} disabled={loading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-sm font-semibold disabled:opacity-50">
              {loading ? 'جارٍ التحليل...' : '🚀 حلّل + توقّع + ارسم'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-card border border-border rounded-xl px-4 py-2 text-sm">
          <span className="text-gray-400">💰 إدارة المخاطر:</span>
          <label className="flex items-center gap-2">
            رأس المال $
            <input type="number" min={10} value={accountSize}
              onChange={(e) => setAccountSize(Number(e.target.value))}
              className="w-20 bg-bg border border-border rounded px-2 py-1" />
          </label>
          <label className="flex items-center gap-2">
            مخاطرة %
            <input type="number" min={0.5} max={20} step={0.5} value={riskPct}
              onChange={(e) => setRiskPct(Number(e.target.value))}
              className="w-16 bg-bg border border-border rounded px-2 py-1" />
          </label>
          <span className="text-cyan-300">
            = مخاطرة ${(accountSize * riskPct / 100).toFixed(2)} / صفقة
          </span>
        </div>
      </header>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <TradingChart
            candles={candles}
            levels={result?.levels ?? []}
            prediction={result?.prediction}
          />
          {!candles.length && !loading && (
            <div className="mt-4 p-6 text-center bg-card border border-border rounded-xl text-sm text-gray-400">
              اختر زوجًا واضغط "تحميل" أو "حلّل" للبدء
            </div>
          )}
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {result && <DecisionCard result={result} />}
          {result && (
            <>
              <div className="text-xs text-gray-500 px-1">وكلاء 4H</div>
              <AgentPanel agents={result.analysis4h.reports} />
              <div className="text-xs text-gray-500 px-1 mt-2">وكلاء 1H</div>
              <AgentPanel agents={result.analysis1h.reports} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
