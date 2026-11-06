import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCandles } from './okx';
import { orchestrateMultiTf } from './orchestrator';

type Bindings = { FRONTEND_ORIGIN: string };
const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  const mw = cors({
    origin: c.env.FRONTEND_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  });
  return mw(c, next);
});

app.get('/', (c) => c.json({ ok: true, service: 'crypto-ai-worker' }));

app.get('/api/candles', async (c) => {
  const pair = c.req.query('pair') ?? 'BTC-USDT';
  const tf = c.req.query('tf') ?? '1H';
  const limit = Number(c.req.query('limit') ?? '300');
  try {
    const candles = await getCandles(pair, tf, limit);
    return c.json({ pair, tf, candles });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/api/analyze-mtf', async (c) => {
  const body = await c.req.json<{
    pair: string;
    accountSize?: number;
    riskPct?: number;
  }>();
  const pair = body.pair ?? 'BTC-USDT';
  const accountSize = body.accountSize ?? 100;
  const riskPct = body.riskPct ?? 5;

  try {
    const result = await orchestrateMultiTf(pair, {
      accountSize,
      riskPct,
      riskAmount: accountSize * (riskPct / 100),
    });
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default app;
