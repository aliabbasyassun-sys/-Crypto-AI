'use client';
import type { AgentReport } from '@/lib/types';

export default function AgentPanel({ agents }: { agents: AgentReport[] }) {
  return (
    <div className="space-y-2">
      {agents.map((a) => {
        const color = a.signal === 'bullish' ? 'text-green-400'
          : a.signal === 'bearish' ? 'text-red-400' : 'text-gray-400';
        const bg = a.signal === 'bullish' ? 'bg-green-500/10 border-green-500/30'
          : a.signal === 'bearish' ? 'bg-red-500/10 border-red-500/30'
            : 'bg-gray-500/10 border-gray-500/30';
        const arrow = a.signal === 'bullish' ? '▲' : a.signal === 'bearish' ? '▼' : '●';
        return (
          <div key={a.agent} className={`p-2 rounded-lg border ${bg}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{a.label}</span>
              <span className={`text-sm font-bold ${color}`}>{arrow} {(a.strength * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {a.reasons[0] ?? '—'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
