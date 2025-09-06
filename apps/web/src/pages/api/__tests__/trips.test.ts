import { describe, it, expect } from 'vitest';
import listHandler from '../trips/index';
import updateHandler from '../trips/[id]';

const base = 'http://localhost';

describe('GET /api/trips', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/trips`);
    const res = await listHandler(req);
    expect(res.status).toBe(401);
  });

  it('returns trips for authenticated user', async () => {
    const req = new Request(`${base}/api/trips`, {
      headers: { 'x-user-id': 'user1' }
    });
    const res = await listHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trips: [] });
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/trips`, { method: 'POST' });
    const res = await listHandler(req);
    expect(res.status).toBe(405);
  });
});

describe('PATCH /api/trips/[id]', () => {
  it('requires authentication', async () => {
    const req = new Request(`${base}/api/trips/1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' })
    });
    const res = await updateHandler(req);
    expect(res.status).toBe(401);
  });

  it('validates request body', async () => {
    const req = new Request(`${base}/api/trips/1`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'user1'
      },
      body: JSON.stringify({ name: 123 })
    });
    const res = await updateHandler(req);
    expect(res.status).toBe(400);
  });

  it('updates trip when valid', async () => {
    const req = new Request(`${base}/api/trips/1`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'user1'
      },
      body: JSON.stringify({ name: 'home' })
    });
    const res = await updateHandler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: '1', updated: true });
  });

  it('rejects unsupported methods', async () => {
    const req = new Request(`${base}/api/trips/1`);
    const res = await updateHandler(req);
    expect(res.status).toBe(405);
  });
});
