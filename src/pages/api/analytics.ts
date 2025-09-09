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

  const settings = await prisma.setting.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings?.collectMetrics) {
    return res.status(204).end();
  }

  const stats = await prisma.trip.aggregate({
    where: { userId: session.user.id },
    _sum: { fareCents: true },
  });

  if (settings.shareAnonymizedMetrics) {
    // placeholder for sending anonymized metrics to an external collector
  }

  return res.status(200).json({
    totalFareCents: stats._sum.fareCents ?? 0,
  });
}
