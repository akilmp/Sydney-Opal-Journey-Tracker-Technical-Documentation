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

  const stops: Array<{ stopId: string; nickname: string }> = [
    { stopId: '214748', nickname: 'Home' },
    { stopId: '214749', nickname: 'Work' },
  ];

  for (const stop of stops) {
    await client.query(
      `INSERT INTO saved_stops (user_id, stop_id, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, stop.stopId, stop.nickname]
    );
  }

  if (SEED_WITH_FAKE_TRIPS) {
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      const start = new Date(now - i * 86400000 + 8 * 3600000); // 8AM each day
      const end = new Date(start.getTime() + 45 * 60000); // 45 mins later
      await client.query(
        `INSERT INTO trips (user_id, origin_stop_id, destination_stop_id, mode, start_time, end_time, fare_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          stops[0].stopId,
          stops[1].stopId,
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
