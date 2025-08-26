export interface User {
  id: string;
}

export async function requireUser(req: Request): Promise<User> {
  const id = req.headers.get('x-user-id');
  if (!id) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return { id };
}
