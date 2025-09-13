import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

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
  PrismaClient: vi.fn(() => ({
    opalUpload: { findFirst },
  })),
}));

import handler from '../opal/parse/[uploadId]';
import { requireUser } from '../../../lib/auth';
import { presignDownload } from '../../../lib/storage';
import { inngest } from '../../../jobs';

const requireUserMock = vi.mocked(requireUser);
const presignDownloadMock = vi.mocked(presignDownload);
const sendMock = vi.mocked(inngest.send);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/opal/parse/[uploadId]', () => {
  it('enqueues parsing job and returns 202', async () => {
    requireUserMock.mockResolvedValue({ id: 'user1' } as any);
    findFirst.mockResolvedValue({ id: 'u1', filename: 'file.csv' });
    presignDownloadMock.mockReturnValue('http://example.com/file.csv');

    const req = new Request('http://localhost/api/opal/parse/u1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'csv' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ uploadId: 'u1' });
    expect(sendMock).toHaveBeenCalledWith({
      name: 'statements/uploaded',
      data: {
        fileUrl: 'http://example.com/file.csv',
        uploadId: 'u1',
        userId: 'user1',
        type: 'csv',
      },
    });
  });
});

