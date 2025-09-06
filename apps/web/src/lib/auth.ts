import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export interface User {
  id: string;
}

export async function requireUser(): Promise<User> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id;
  if (!id) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return { id };
}
