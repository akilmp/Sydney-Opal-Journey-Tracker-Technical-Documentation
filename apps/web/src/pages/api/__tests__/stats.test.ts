import { describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({}),
  getServerSession: vi.fn(),
}), { virtual: true });
vi.mock('next-auth/providers/email', () => ({ default: () => ({}) }), { virtual: true });
vi.mock('next-auth/providers/google', () => ({ default: () => ({}) }), { virtual: true });

vi.mock('../../../lib/prisma', () => {
  const trips = [
    {
      userId: 'user1',
      distanceKm: 5,
      fareCents: 300,
      originLat: -33.87,
      originLng: 151.21,
      destLat: -33.88,
      destLng: 151.22,
    },
    {
      userId: 'user1',
      distanceKm: 7.5,
      fareCents: 400,
      originLat: -33.87,
      originLng: 151.21,
      destLat: -33.86,
      destLng: 151.2,
    },
  ];

  return {
    prisma: {
      trip: {
        aggregate: vi.fn(async ({ where }: any) => {
          const userTrips = trips.filter((t) => t.userId === where.userId);
          const distance = userTrips.reduce((sum, t) => sum + (t.distanceKm ?? 0), 0);
          const fare = userTrips.reduce((sum, t) => sum + (t.fareCents ?? 0), 0);
          return {
            _count: { _all: userTrips.length },
            _sum: { distanceKm: distance, fareCents: fare },
          };
        }),
        findMany: vi.fn(async ({ where }: any) =>
          trips.filter((t) => t.userId === where.userId)
        ),
      },
    },
  };
});

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
    expect(await res.json()).toEqual({ trips: 2, distance: 12.5, fare: 700 });
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
    expect(await res.json()).toEqual({
      points: [
        { lat: -33.87, lng: 151.21, weight: 2 },
        { lat: -33.88, lng: 151.22, weight: 1 },
        { lat: -33.86, lng: 151.2, weight: 1 }
      ]
    });
  });
});
