import { describe, it, expect, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

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
  it('persists archive and clears cache', async () => {
    const data = Buffer.from('dummy');
    const hash = createHash('sha256').update(data).digest('hex');
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gtfs-'));

    process.env.GTFS_URL = 'http://example.com/gtfs.zip';
    process.env.GTFS_STORAGE_DIR = tmpDir;

    const arrayBuf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
    global.fetch = vi
      .fn()
      .mockResolvedValue({ arrayBuffer: () => Promise.resolve(arrayBuf) }) as any;

    const run = vi.fn().mockImplementation((_name, fn) => fn());

    const result = await refreshGtfs.fn({ step: { run } });

    const filePath = path.join(tmpDir, `${hash}.zip`);
    const metaPath = path.join(tmpDir, 'latest.json');

    expect(await fs.stat(filePath)).toBeTruthy();
    expect(JSON.parse(await fs.readFile(metaPath, 'utf8')).hash).toBe(hash);
    expect(result).toEqual({ refreshed: true, hash });
    expect(cache.clear).toHaveBeenCalledWith('gtfs');
  });
});
