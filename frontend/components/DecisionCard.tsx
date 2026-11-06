'use client';
import type { AnalysisResult } from '@/lib/types';

export default function DecisionCard({ result }: { result: AnalysisResult }) {
  const { combined, positionPlan: p } = result;
  const isBuy = combined.signal === 'bullish';
  const isSell = combined.signal === 'bearish';
  const color = isBuy ? 'from-green-500 to-emerald-600'
    : isSell ? 'from-red-500 to-rose-600'
      : 'from-gray-600 to-gray-700';
  const label = isBuy ? 'شراء (Long)' : isSell ? 'بيع (Short)' : 'انتظار';

  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${color} shadow-lg`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs opacity-80">قرار العقل المدبر</div>
          <div className="text-2xl font-bold">{label}</div>
        </div>
        <div className="text-left">
          <div className="text-xs opacity-80">الثقة</div>
          <div className="text-2xl font-bold">{combined.confidence}%</div>
        </div>
      </div>

      <p className="text-xs mt-2 opacity-90">{combined.summary}</p>

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-black/20 rounded-lg p-2">
        <div>
          <div className="opacity-70">1H</div>
          <b>{result.analysis1h.signal} · {result.analysis1h.confidence}%</b>
        </div>
        <div>
          <div className="opacity-70">4H</div>
          <b>{result.analysis4h.signal} · {result.analysis4h.confidence}%</b>
        </div>
      </div>

      {p.side !== 'none' && (
        <div className="mt-3 bg-black/25 rounded-lg p-3 text-xs space-y-1.5">
          <div className="font-semibold text-sm mb-1">📊 خطة المركز (100$ · 5% مخاطرة)</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="opacity-70">نوع الصفقة</span><b>{p.side === 'long' ? 'شراء' : 'بيع'}</b>
            <span className="opacity-70">الدخول</span><b>{p.entry}</b>
            <span className="opacity-70">وقف الخسارة</span><b className="text-red-300">{p.stopLoss} ({p.slPctFromEntry}%)</b>
            <span className="opacity-70">هدف 1</span><b className="text-green-300">{p.takeProfit1}</b>
            <span className="opacity-70">هدف 2</span><b className="text-green-300">{p.takeProfit2}</b>
            <span className="opacity-70">حجم المركز</span><b>{p.positionSize}</b>
            <span className="opacity-70">قيمة المركز</span><b>${p.positionValue}</b>
            <span className="opacity-70">الرفع</span><b>{p.suggestedLeverage}x</b>
            <span className="opacity-70">خسارة محتملة</span><b className="text-red-300">-${p.riskAmount}</b>
            <span className="opacity-70">ربح TP1 / TP2</span><b className="text-green-300">+${p.potentialProfit1} / +${p.potentialProfit2}</b>
            <span className="opacity-70">R:R</span><b>{p.riskRewardRatio1} / {p.riskRewardRatio2}</b>
          </div>
          {p.warning && <div className="text-yellow-300 mt-1">⚠ {p.warning}</div>}
        </div>
      )}

      <div className="mt-3 bg-black/25 rounded-lg p-3 text-xs">
        <div className="font-semibold mb-1">🔮 توقع الشموع القادمة (4H)</div>
        <div className="flex justify-between">
          <span>الاتجاه</span>
          <b className={result.prediction.direction === 'up' ? 'text-green-300' : result.prediction.direction === 'down' ? 'text-red-300' : 'text-gray-300'}>
            {result.prediction.direction === 'up' ? '▲ صعود' : result.prediction.direction === 'down' ? '▼ هبوط' : '● محايد'}
          </b>
        </div>
        <div className="flex justify-between">
          <span>الهدف بعد {result.prediction.horizonCandles} شموع</span>
          <b>{result.prediction.targetPrice}</b>
        </div>
      </div>
    </div>
  );
}
