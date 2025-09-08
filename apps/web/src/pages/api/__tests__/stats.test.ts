import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    trip: {
      aggregate: vi.fn().mockResolvedValue({
        _count: { _all: 2 },
        _sum: { distanceKm: 12.5, fareCents: 700 },
      }),
      findMany: vi.fn().mockResolvedValue([
        { originLat: -33.87, originLng: 151.21, destLat: -33.88, destLng: 151.22 },
        { originLat: -33.87, originLng: 151.21, destLat: -33.86, destLng: 151.2 },
      ]),
    },
  },
}));

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
    expect(await res.json()).toEqual({ trips: 2, distance: 12.5, fare: 700 });
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
    expect(await res.json()).toEqual({
      points: [
        { lat: -33.87, lng: 151.21, weight: 2 },
        { lat: -33.88, lng: 151.22, weight: 1 },
        { lat: -33.86, lng: 151.2, weight: 1 }
      ]
    });
  });
});
