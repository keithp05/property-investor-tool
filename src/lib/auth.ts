import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Login failed: Missing email or password');
          return null;
        }

        // Normalize email to lowercase
        const normalizedEmail = credentials.email.toLowerCase().trim();
        
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            landlordProfile: true,
            tenantProfile: true,
          },
        });

        if (!user) {
          console.log('Login failed: User not found for email:', normalizedEmail);
          return null;
        }
        
        if (!user.password) {
          console.log('Login failed: No password set for user:', normalizedEmail);
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        
        console.log('Login attempt:', { 
          email: normalizedEmail, 
          passwordMatch,
          hashedPasswordLength: user.password?.length,
        });

        if (!passwordMatch) {
          console.log('Login failed: Password mismatch for:', normalizedEmail);
          return null;
        }

        console.log('Login successful for:', normalizedEmail);
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.subscriptionTier = (user as any).subscriptionTier;
        token.subscriptionStatus = (user as any).subscriptionStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).subscriptionTier = token.subscriptionTier;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
