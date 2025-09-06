import { describe, it, expect } from 'vitest';
import alertsHandler from '../live/alerts';
import departuresHandler from '../live/departures';

const base = 'http://localhost';

describe('GET /api/live/alerts', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/live/alerts`);
    const res = await alertsHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/live/alerts`, { method: 'POST' });
    const res = await alertsHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns alerts for authenticated user', async () => {
    const req = new Request(`${base}/api/live/alerts`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await alertsHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alerts: [] });
  });
});

describe('GET /api/live/departures', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/live/departures?stopId=1`);
    const res = await departuresHandler(req);
    expect(res.status).toBe(401);
  });

  it('validates query params', async () => {
    const req = new Request(`${base}/api/live/departures`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await departuresHandler(req);
    expect(res.status).toBe(400);
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/live/departures?stopId=1`, { method: 'POST' });
    const res = await departuresHandler(req);
    expect(res.status).toBe(405);
  });

  it('returns departures for authenticated user', async () => {
    const req = new Request(`${base}/api/live/departures?stopId=1`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await departuresHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ departures: [] });
  });
});
