import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../lib/prisma';
import { authOptions } from './auth/options';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { user_id } = req.query;
  if (user_id !== session.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const settings = await prisma.settings.findUnique({
    where: { user_id: session.user.id },
  });

  if (!settings?.collect_metrics) {
    return res.status(204).end();
  }

  const stats = await prisma.trips.aggregate({
    where: { user_id: session.user.id },
    _sum: { fare: true, duration_minutes: true },
  });

  if (settings.share_anonymized_metrics) {
    // placeholder for sending anonymized metrics to an external collector
  }

  return res.status(200).json({
    totalFare: stats._sum.fare ?? 0,
    totalMinutes: stats._sum.duration_minutes ?? 0,
  });
}
