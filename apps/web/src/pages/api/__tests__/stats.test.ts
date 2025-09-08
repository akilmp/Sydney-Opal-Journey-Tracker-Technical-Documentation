import { describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({}),
  getServerSession: vi.fn(),
}), { virtual: true });
vi.mock('next-auth/providers/email', () => ({ default: () => ({}) }), { virtual: true });
vi.mock('next-auth/providers/google', () => ({ default: () => ({}) }), { virtual: true });

import { getServerSession } from 'next-auth';
import summaryHandler from '../stats/summary';
import heatmapHandler from '../stats/heatmap';

const getServerSessionMock = vi.mocked(getServerSession);

beforeEach(() => {
  getServerSessionMock.mockReset();
});

const base = 'http://localhost';

describe('GET /api/stats/summary', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/stats/summary`);
    getServerSessionMock.mockResolvedValueOnce(null);
    const res = await summaryHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/stats/summary`, { method: 'POST' });
    const res = await summaryHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns stats for authenticated user', async () => {
    const req = new Request(`${base}/api/stats/summary`);
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user1' } } as any);
    const res = await summaryHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trips: 0, distance: 0, fare: 0 });
  });
});

describe('GET /api/stats/heatmap', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/stats/heatmap`);
    getServerSessionMock.mockResolvedValueOnce(null);
    const res = await heatmapHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/stats/heatmap`, { method: 'POST' });
    const res = await heatmapHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns heatmap data for authenticated user', async () => {
    const req = new Request(`${base}/api/stats/heatmap`);
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user1' } } as any);
    const res = await heatmapHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ points: [] });
  });
});
