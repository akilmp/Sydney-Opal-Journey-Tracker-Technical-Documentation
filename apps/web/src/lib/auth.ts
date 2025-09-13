import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export interface User {
  id: string;
}

export async function requireUser(req: Request): Promise<User> {
  const session = await getServerSession(req, { ...authOptions });
  const id = session?.user?.id as string | undefined;
  if (!id) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return { id };
}
