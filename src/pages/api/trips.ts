import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../lib/prisma';
import { authOptions } from '../auth/options';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { user_id } = req.query;
  if (user_id !== session.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const trips = await prisma.trips.findMany({
    where: { user_id: session.user.id },
  });

  return res.status(200).json(trips);
}
