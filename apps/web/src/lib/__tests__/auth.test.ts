import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({}),
  getServerSession: vi.fn(),
}), { virtual: true });
vi.mock('next-auth/providers/email', () => ({ default: () => ({}) }), { virtual: true });
vi.mock('next-auth/providers/google', () => ({ default: () => ({}) }), { virtual: true });

import { getServerSession } from 'next-auth';
import { requireUser } from '../auth';

const getServerSessionMock = vi.mocked(getServerSession);

describe('requireUser', () => {
  const base = 'http://localhost';

  beforeEach(() => {
    getServerSessionMock.mockReset();
  });

  it('returns user when authenticated', async () => {
    const req = new Request(`${base}/api/test`);
    getServerSessionMock.mockResolvedValueOnce({ user: { id: 'user1' } } as any);

    await expect(requireUser(req)).resolves.toEqual({ id: 'user1' });
    expect(getServerSessionMock).toHaveBeenCalledWith(req, expect.any(Object));
  });

  it('throws 401 when unauthenticated', async () => {
    const req = new Request(`${base}/api/test`);
    getServerSessionMock.mockResolvedValueOnce(null);

    await expect(requireUser(req)).rejects.toMatchObject({ status: 401 });
    expect(getServerSessionMock).toHaveBeenCalledWith(req, expect.any(Object));
  });
});
