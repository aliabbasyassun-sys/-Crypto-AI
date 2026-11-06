'use client';
import { useEffect, useRef } from 'react';
import {
  createChart, IChartApi, ISeriesApi, IPriceLine, UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, Level, Prediction } from '@/lib/types';

interface Props {
  candles: Candle[];
  levels: Level[];
  prediction?: Prediction;
}

export default function TradingChart({ candles, levels, prediction }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const midRef = useRef<ISeriesApi<'Line'> | null>(null);
  const upRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0b0e14' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#374151' },
      rightPriceScale: { borderColor: '#374151' },
      handleScroll: { vertTouchDrag: false },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });

    const midSeries = chart.addLineSeries({
      color: '#22d3ee', lineWidth: 2, lineStyle: 2,
      lastValueVisible: false, priceLineVisible: false,
    });
    const upSeries = chart.addLineSeries({
      color: 'rgba(34,211,238,0.35)', lineWidth: 1, lineStyle: 1,
      lastValueVisible: false, priceLineVisible: false,
    });
    const lowSeries = chart.addLineSeries({
      color: 'rgba(34,211,238,0.35)', lineWidth: 1, lineStyle: 1,
      lastValueVisible: false, priceLineVisible: false,
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    midRef.current = midSeries;
    upRef.current = upSeries;
    lowRef.current = lowSeries;

    return () => {
      chart.remove();
      chartRef.current = null; candleRef.current = null;
      midRef.current = null; upRef.current = null; lowRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleRef.current || candles.length === 0) return;
    candleRef.current.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!midRef.current || !upRef.current || !lowRef.current) return;
    if (!prediction || prediction.points.length === 0) {
      midRef.current.setData([]);
      upRef.current.setData([]);
      lowRef.current.setData([]);
      return;
    }
    const last = candles[candles.length - 1];
    const anchor = { time: last.time, value: last.close };

    midRef.current.setData([
      { time: anchor.time as UTCTimestamp, value: anchor.value },
      ...prediction.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.price })),
    ]);
    upRef.current.setData([
      { time: anchor.time as UTCTimestamp, value: anchor.value },
      ...prediction.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.upper })),
    ]);
    lowRef.current.setData([
      { time: anchor.time as UTCTimestamp, value: anchor.value },
      ...prediction.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.lower })),
    ]);

    chartRef.current?.timeScale().fitContent();
  }, [prediction, candles]);

  useEffect(() => {
    const series = candleRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((l) => { try { series.removePriceLine(l); } catch {} });
    priceLinesRef.current = [];
    if (candles.length === 0) return;

    const lastPrice = candles[candles.length - 1].close;
    const minPrice = Math.min(...candles.map((c) => c.low));
    const maxPrice = Math.max(...candles.map((c) => c.high));
    const range = maxPrice - minPrice || lastPrice * 0.1;

    levels.forEach((lvl) => {
      if (lvl.price < minPrice - range * 0.5 || lvl.price > maxPrice + range * 0.5) return;
      priceLinesRef.current.push(series.createPriceLine({
        price: lvl.price, color: lvl.color, lineWidth: lvl.lineWidth,
        lineStyle: lvl.lineStyle, axisLabelVisible: true, title: lvl.title,
      }));
    });
  }, [levels, candles]);

  return <div ref={containerRef} className="w-full h-[600px] rounded-xl overflow-hidden border border-border touch-pan-y" />;
}
