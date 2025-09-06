import { describe, it, expect, vi } from 'vitest';

vi.mock('../client', () => ({
  inngest: {
    createFunction: (_opts: any, _trigger: any, handler: any) => ({ fn: handler })
  }
}));

vi.mock('../../utils/cache', () => ({
  cache: { clear: vi.fn() }
}));

import { cache } from '../../utils/cache';
import { refreshGtfs } from '../refreshGtfs';

describe('refreshGtfs job', () => {
  it('fetches GTFS data and clears cache', async () => {
    process.env.GTFS_URL = 'http://example.com/gtfs.zip';
    global.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }) as any;

    const run = vi
      .fn()
      .mockImplementationOnce((_name, fn) => fn())
      .mockImplementationOnce((_name, fn) => fn());

    const result = await refreshGtfs.fn({ step: { run } });

    expect(fetch).toHaveBeenCalledWith('http://example.com/gtfs.zip');
    expect(run.mock.calls[0][0]).toBe('download');
    expect(run.mock.calls[1][0]).toBe('store');
    expect(result).toEqual({ refreshed: true });
    expect(cache.clear).toHaveBeenCalledWith('gtfs');
  });
});
