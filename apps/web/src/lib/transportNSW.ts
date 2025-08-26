const BASE_URL = 'https://api.transport.nsw.gov.au/v1';
const CACHE_TTL = 20_000; // 20s TTL
const FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAK_DURATION = 30_000; // 30s cooldown

interface CacheEntry<T> {
  expiry: number;
  data: T;
}

const cache = new Map<string, CacheEntry<unknown>>();
let failureCount = 0;
let circuitOpenUntil = 0;

function ensureCircuit() {
  if (Date.now() < circuitOpenUntil) {
    throw new Error('Transport NSW API circuit breaker open');
  }
}

function recordFailure() {
  failureCount++;
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_BREAK_DURATION;
  }
}

function recordSuccess() {
  failureCount = 0;
  circuitOpenUntil = 0;
}

async function request<T>(path: string, params: Record<string, string | number>): Promise<T> {
  ensureCircuit();
  const apiKey = process.env.TFNSW_API_KEY;
  if (!apiKey) throw new Error('TFNSW_API_KEY not set');

  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, String(value));
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `apikey ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      recordFailure();
      throw new Error(`Transport NSW API error: ${res.status}`);
    }

    const data = (await res.json()) as T;
    recordSuccess();
    return data;
  } catch (err) {
    recordFailure();
    throw err;
  }
}

export async function getDepartures(stopId: string, limit = 5) {
  const key = `departures:${stopId}:${limit}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const data = await request<any>('/transportnsw/realtime/departures', { stopId, limit });
  cache.set(key, { data, expiry: now + CACHE_TTL });
  return data;
}

export async function getAlerts(routeId: string, line?: string) {
  const key = `alerts:${routeId}:${line ?? ''}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const params: Record<string, string | number> = { routeId };
  if (line) params.line = line;

  const data = await request<any>('/transportnsw/realtime/alerts', params);
  cache.set(key, { data, expiry: now + CACHE_TTL });
  return data;
}
