import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../lib/transportNSW', () => ({
  getAlerts: vi.fn().mockResolvedValue([]),
  getDepartures: vi.fn().mockResolvedValue([]),
}));

import { getServerSession } from 'next-auth';
import alertsHandler from '../live/alerts';
import departuresHandler from '../live/departures';
import { getAlerts } from '../../../lib/transportNSW';

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

  it('validates query params', async () => {
    const req = new Request(`${base}/api/live/alerts`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await alertsHandler(req);
    expect(res.status).toBe(400);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/live/alerts`, { method: 'POST' });
    const res = await alertsHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns alerts for authenticated user', async () => {
    const req = new Request(`${base}/api/live/alerts?routeId=1&line=T1`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await alertsHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alerts: [] });
    expect(getAlerts).toHaveBeenCalledWith('1', 'T1');
  });

  it('returns 503 when service fails', async () => {
    vi.mocked(getAlerts).mockRejectedValueOnce(
      new Error('Transport NSW API error: 500')
    );
    const req = new Request(`${base}/api/live/alerts?routeId=1`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await alertsHandler(req);
    expect(res.status).toBe(503);
  });

  it('returns 503 when circuit breaker is open', async () => {
    vi.mocked(getAlerts).mockRejectedValueOnce(
      new Error('Transport NSW API circuit breaker open')
    );
    const req = new Request(`${base}/api/live/alerts?routeId=1`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await alertsHandler(req);
    expect(res.status).toBe(503);
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
