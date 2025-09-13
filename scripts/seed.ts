import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/opal';
const SEED_WITH_FAKE_TRIPS = process.env.SEED_WITH_FAKE_TRIPS === 'true';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const userId = randomUUID();

  await client.query(
    `INSERT INTO users (id, email, created_at, tz)
     VALUES ($1, $2, NOW(), 'Australia/Sydney')
     ON CONFLICT (email) DO NOTHING`,
    [userId, 'demo@example.com']
  );

  const favourites: Array<{ stopId?: string; routeId?: string }> = [
    { stopId: '214748' },
    { stopId: '214749' },
  ];

  for (const fav of favourites) {
    await client.query(
      `INSERT INTO favourites (user_id, stop_id, route_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, fav.stopId ?? null, fav.routeId ?? null]
    );
  }

  if (SEED_WITH_FAKE_TRIPS) {
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      const start = new Date(now - i * 86400000 + 8 * 3600000); // 8AM each day
      const end = new Date(start.getTime() + 45 * 60000); // 45 mins later
      await client.query(
        `INSERT INTO trips (user_id, origin_stop_id, origin_lat, origin_lng, destination_stop_id, dest_lat, dest_lng, mode, start_time, end_time, fare_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          favourites[0].stopId,
          -33.87,
          151.21,
          favourites[1].stopId,
          -33.88,
          151.22,
          'train',
          start.toISOString(),
          end.toISOString(),
          420,
        ]
      );
    }
  }

  await client.end();
  console.log('Seed complete');
}

main().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
