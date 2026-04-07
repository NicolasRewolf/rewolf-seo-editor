import { google } from 'googleapis';
import { Hono } from 'hono';
import { z } from 'zod';

const querySchema = z.object({
  siteUrl: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dimensions: z.array(z.string()).optional(),
  rowLimit: z.number().int().min(1).max(25000).optional(),
  startRow: z.number().int().min(0).optional(),
});

export const gscRoutes = new Hono();

gscRoutes.post('/search-analytics', async (c) => {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    return c.json(
      {
        error: 'GOOGLE_APPLICATION_CREDENTIALS manquant (chemin vers le JSON du compte de service)',
      },
      503
    );
  }

  let body: z.infer<typeof querySchema>;
  try {
    body = querySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({
      version: 'v1',
      auth,
    });

    const res = await searchconsole.searchanalytics.query({
      siteUrl: body.siteUrl,
      requestBody: {
        startDate: body.startDate,
        endDate: body.endDate,
        dimensions: body.dimensions ?? ['query'],
        rowLimit: body.rowLimit ?? 100,
        startRow: body.startRow ?? 0,
      },
    });

    return c.json(res.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Google Search Console';
    return c.json({ error: msg }, 500);
  }
});

gscRoutes.post('/search-analytics/opportunities', async (c) => {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    return c.json({ error: 'GOOGLE_APPLICATION_CREDENTIALS manquant' }, 503);
  }

  let body: z.infer<typeof querySchema>;
  try {
    body = querySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const res = await searchconsole.searchanalytics.query({
      siteUrl: body.siteUrl,
      requestBody: {
        startDate: body.startDate,
        endDate: body.endDate,
        dimensions: ['query', 'page'],
        rowLimit: 500,
        startRow: 0,
      },
    });

    const rows = (res.data.rows ?? [])
      .filter((r) => {
        const pos = r.position ?? 0;
        return pos >= 5 && pos <= 20;
      })
      .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
      .slice(0, 50);

    return c.json({ rows, total: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur GSC opportunities';
    return c.json({ error: msg }, 500);
  }
});

gscRoutes.get('/sites', async (c) => {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    return c.json({ error: 'GOOGLE_APPLICATION_CREDENTIALS manquant' }, 503);
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({
      version: 'v1',
      auth,
    });

    const res = await searchconsole.sites.list();
    return c.json(res.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur liste des sites GSC';
    return c.json({ error: msg }, 500);
  }
});
