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
import { parseStatements } from '../parseStatements';

describe('parseStatements job', () => {
  it('parses statements and clears cache', async () => {
    const file = '2024-01-01,A,10\n2024-01-02,B,20\n';
    global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve(file) }) as any;

    const run = vi
      .fn()
      .mockImplementationOnce((_name, fn) => fn())
      .mockImplementationOnce((_name, fn) => fn());

    const result = await parseStatements.fn({
      event: { data: { fileUrl: 'http://example.com/file.csv' } },
      step: { run }
    });

    expect(fetch).toHaveBeenCalledWith('http://example.com/file.csv');
    expect(run.mock.calls[0][0]).toBe('download');
    expect(run.mock.calls[1][0]).toBe('save');
    expect(result).toEqual({ parsed: 2 });
    expect(cache.clear).toHaveBeenCalledWith('statements');
  });
});
