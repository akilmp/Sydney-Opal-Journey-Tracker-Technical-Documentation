import NextAuth, { type NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
