import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SEED_CATALOGS } from '@pom/engine';

export interface WorkerBindings {
  APP_ID: string;
  ALLOWED_ORIGINS: string;
  DB: D1Database;
  POM_CACHE_KV?: KVNamespace;
}

const app = new Hono<{ Bindings: WorkerBindings }>();

app.use('/api/*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const middleware = cors({
    origin: (origin) => (allowed.includes(origin) ? origin : allowed[0] ?? '*'),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  return middleware(c, next);
});

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'path-of-mercenaries-api',
    appId: c.env.APP_ID ?? 'path-of-mercenaries',
    hasD1Binding: Boolean(c.env.DB),
    hasKvCache: Boolean(c.env.POM_CACHE_KV),
  });
});

app.get('/api/catalog/summary', (c) => {
  return c.json({
    ok: true,
    counts: {
      archetypes: SEED_CATALOGS.archetypes.length,
      skills: SEED_CATALOGS.skills.length,
      supports: SEED_CATALOGS.supports.length,
      baseItems: SEED_CATALOGS.baseItems.length,
      uniques: SEED_CATALOGS.uniques.length,
    },
  });
});

export default app;
