import { describe, it, expect, vi, beforeEach } from 'vitest';

const { create, PrismaClient } = vi.hoisted(() => ({
  create: vi.fn(),
  PrismaClient: vi.fn(() => ({ opalUpload: { create } })),
}));

vi.mock('../../../lib/auth', () => ({
  requireUser: vi.fn(),
}));

vi.mock('../../../lib/storage', () => ({
  presignUpload: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient,
}));
import { requireUser } from '../../../lib/auth';
import { presignUpload } from '../../../lib/storage';

const requireUserMock = vi.mocked(requireUser);
const presignUploadMock = vi.mocked(presignUpload);

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('POST /api/opal/upload', () => {
  it('reuses prisma connection across requests', async () => {
    requireUserMock.mockResolvedValue({ id: 'user1' } as any);
    presignUploadMock.mockReturnValue('http://upload');

    (globalThis as any).prisma = undefined;
    const { default: handler } = await import('../opal/upload');
    const req = () =>
      new Request('http://localhost/api/opal/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: 'file.csv', mime: 'text/csv' }),
      });

    const res1 = await handler(req());
    const res2 = await handler(req());

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

