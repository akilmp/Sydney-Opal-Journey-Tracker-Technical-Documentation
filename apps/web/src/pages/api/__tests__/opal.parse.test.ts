import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findFirst, PrismaClient } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  PrismaClient: vi.fn(() => ({ opalUpload: { findFirst } })),
}));

vi.mock('../../../lib/auth', () => ({
  requireUser: vi.fn(),
}));

vi.mock('../../../lib/storage', () => ({
  presignDownload: vi.fn(),
}));

vi.mock('../../../jobs', () => ({
  inngest: { send: vi.fn() },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient,
}));
import { requireUser } from '../../../lib/auth';
import { presignDownload } from '../../../lib/storage';
import { inngest } from '../../../jobs';

const requireUserMock = vi.mocked(requireUser);
const presignDownloadMock = vi.mocked(presignDownload);
const sendMock = vi.mocked(inngest.send);

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('POST /api/opal/parse/[uploadId]', () => {
  it('reuses prisma connection across requests', async () => {
    requireUserMock.mockResolvedValue({ id: 'user1' } as any);
    findFirst.mockResolvedValue({ id: 'u1', filename: 'file.csv' });
    presignDownloadMock.mockReturnValue('http://example.com/file.csv');

    (globalThis as any).prisma = undefined;
    const { default: handler } = await import('../opal/parse/[uploadId]');
    const req = () =>
      new Request('http://localhost/api/opal/parse/u1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'csv' }),
      });

    const res1 = await handler(req());
    const res2 = await handler(req());
    expect(res1.status).toBe(202);
    expect(res2.status).toBe(202);
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

