import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { authenticator } from 'otplib';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Traditional password login
    CredentialsProvider({
      id: 'credentials',
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

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            loginCount: { increment: 1 },
          },
        });

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
    
    // Magic link login
    CredentialsProvider({
      id: 'magic-link',
      name: 'Magic Link',
      credentials: {
        token: { label: 'Token', type: 'text' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          console.log('Magic link login failed: No token');
          return null;
        }

        try {
          // Find the magic link
          let magicLink;
          try {
            magicLink = await prisma.magicLink.findUnique({
              where: { token: credentials.token },
            });
          } catch (dbError: any) {
            // Table might not exist yet
            if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
              console.log('Magic link login failed: MagicLink table does not exist');
              return null;
            }
            throw dbError;
          }

          if (!magicLink) {
            console.log('Magic link login failed: Invalid token');
            return null;
          }

          // Check if already used
          if (magicLink.used) {
            console.log('Magic link login failed: Token already used');
            return null;
          }

          // Check if expired
          if (new Date() > magicLink.expires) {
            console.log('Magic link login failed: Token expired');
            return null;
          }

          // Get the user
          const user = await prisma.user.findUnique({
            where: { email: magicLink.email },
          });

          if (!user || !user.isActive || user.isSuspended) {
            console.log('Magic link login failed: User not found or inactive');
            return null;
          }

          // If MFA is enabled, verify the code
          if (user.mfaEnabled) {
            if (!credentials.mfaCode) {
              console.log('Magic link login failed: MFA required but no code provided');
              return null;
            }

            if (!user.mfaSecret) {
              console.log('Magic link login failed: MFA not properly configured');
              return null;
            }

            const isValidCode = authenticator.verify({
              token: credentials.mfaCode,
              secret: user.mfaSecret,
            });

            if (!isValidCode) {
              console.log('Magic link login failed: Invalid MFA code');
              return null;
            }
          }

          // Mark magic link as used
          await prisma.magicLink.update({
            where: { token: credentials.token },
            data: {
              used: true,
              usedAt: new Date(),
            },
          });

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              loginCount: { increment: 1 },
            },
          });

          console.log('Magic link login successful for:', user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
          };
        } catch (error) {
          console.error('Magic link authorize error:', error);
          return null;
        }
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
