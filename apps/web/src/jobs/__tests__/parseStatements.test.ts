import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMany, uploadUpdate } = vi.hoisted(() => ({
  createMany: vi.fn(),
  uploadUpdate: vi.fn()
}));

vi.mock('../client', () => ({
  inngest: {
    createFunction: (_opts: any, _trigger: any, handler: any) => ({ fn: handler })
  }
}));

vi.mock('../../utils/cache', () => ({
  cache: { clear: vi.fn() }
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    trip: { createMany },
    opalUpload: { update: uploadUpdate }
  }))
}));

import { cache } from '../../utils/cache';
import { parseStatements } from '../parseStatements';

describe('parseStatements job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMany.mockResolvedValue(undefined);
    uploadUpdate.mockResolvedValue(undefined);
  });

  it('parses statements, persists trips, updates upload and clears cache', async () => {
    const file = 'Tap On,Tap Off,Mode,From Stop,To Stop,Fare\n2024-01-01 10:00,2024-01-01 10:30,Train,T1,T2,$2.50\n';
    global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve(file) }) as any;

    const run = vi.fn((_name, fn) => fn());

    const result = await parseStatements.fn({
      event: { data: { fileUrl: 'http://example.com/file.csv', uploadId: 'u1', userId: 'user1', type: 'csv' } },
      step: { run }
    });

    expect(fetch).toHaveBeenCalledWith('http://example.com/file.csv');
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ mode: 'Train', line: 'train' })
      ]
    });
    expect(uploadUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { status: 'parsed', rowsParsed: 1 }
    });
    expect(cache.clear).toHaveBeenCalledWith('statements');
    expect(result).toEqual({ parsed: 1 });
  });

  it('does not clear cache when persistence fails', async () => {
    const file = 'Tap On,Tap Off,Mode,From Stop,To Stop,Fare\n2024-01-01 10:00,2024-01-01 10:30,Train,T1,T2,$2.50\n';
    global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve(file) }) as any;

    createMany.mockRejectedValueOnce(new Error('db fail'));

    const run = vi.fn((_name, fn) => fn());

    await expect(
      parseStatements.fn({
        event: { data: { fileUrl: 'http://example.com/file.csv', uploadId: 'u1', userId: 'user1', type: 'csv' } },
        step: { run }
      })
    ).rejects.toThrow('db fail');

    expect(cache.clear).not.toHaveBeenCalled();
    expect(uploadUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { status: 'error' }
    });
  });
});
