import { describe, it, expect } from 'vitest';
import summaryHandler from '../stats/summary';
import heatmapHandler from '../stats/heatmap';

const base = 'http://localhost';

describe('GET /api/stats/summary', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/stats/summary`);
    const res = await summaryHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/stats/summary`, { method: 'POST' });
    const res = await summaryHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns stats for authenticated user', async () => {
    const req = new Request(`${base}/api/stats/summary`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await summaryHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trips: 0, distance: 0 });
  });
});

describe('GET /api/stats/heatmap', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/stats/heatmap`);
    const res = await heatmapHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/stats/heatmap`, { method: 'POST' });
    const res = await heatmapHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns heatmap data for authenticated user', async () => {
    const req = new Request(`${base}/api/stats/heatmap`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await heatmapHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ points: [] });
  });
});
