import { describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({}),
  getServerSession: vi.fn(),
}), { virtual: true });
vi.mock('next-auth/providers/email', () => ({ default: () => ({}) }), { virtual: true });
vi.mock('next-auth/providers/google', () => ({ default: () => ({}) }), { virtual: true });

vi.mock('../../../lib/transportNSW', () => ({
  getAlerts: vi.fn().mockResolvedValue([]),
  getDepartures: vi.fn().mockResolvedValue([]),
}));

import { getServerSession } from 'next-auth';
import alertsHandler from '../live/alerts';
import departuresHandler from '../live/departures';

const getServerSessionMock = vi.mocked(getServerSession);

beforeEach(() => {
  getServerSessionMock.mockReset();
});

const base = 'http://localhost';

describe('GET /api/live/alerts', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/live/alerts`);
    getServerSessionMock.mockResolvedValueOnce(null);
    const res = await alertsHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/live/alerts`, { method: 'POST' });
    const res = await alertsHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns alerts for authenticated user', async () => {
    const req = new Request(`${base}/api/live/alerts`);
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user1' } } as any);
    const res = await alertsHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alerts: [] });
  });
});

describe('GET /api/live/departures', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/live/departures?stopId=1`);
     getServerSessionMock.mockResolvedValueOnce(null);
    const res = await departuresHandler(req);
    expect(res.status).toBe(401);
  });

  it('validates query params', async () => {
    const req = new Request(`${base}/api/live/departures`);
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user1' } } as any);
    const res = await departuresHandler(req);
    expect(res.status).toBe(400);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/live/departures?stopId=1`, { method: 'POST' });
    const res = await departuresHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns departures for authenticated user', async () => {
    const req = new Request(`${base}/api/live/departures?stopId=1`);
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user1' } } as any);
    const res = await departuresHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ departures: [] });
  });
});
