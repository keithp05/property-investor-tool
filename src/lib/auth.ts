import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { authenticator } from 'otplib';

// Session durations
const SESSION_DURATION_DEFAULT = 24 * 60 * 60; // 1 day in seconds
const SESSION_DURATION_REMEMBER = 30 * 24 * 60 * 60; // 30 days in seconds
const MFA_REAUTH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Login failed: Missing email or password');
          return null;
        }

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
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              loginCount: { increment: 1 },
            },
          });
        } catch (e) {
          console.log('Could not update login stats');
        }

        console.log('Login successful for:', normalizedEmail);
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          rememberMe: credentials.rememberMe === 'true',
          lastMfaVerifiedAt: Date.now(),
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
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          console.log('Magic link login failed: No token');
          return null;
        }

        try {
          // Find the magic link
          let magicLink: any;
          try {
            magicLink = await (prisma as any).magicLink.findUnique({
              where: { token: credentials.token },
            });
          } catch (dbError: any) {
            console.log('Magic link login failed: MagicLink table error', dbError.message);
            return null;
          }

          if (!magicLink) {
            console.log('Magic link login failed: Invalid token');
            return null;
          }

          if (magicLink.used) {
            console.log('Magic link login failed: Token already used');
            return null;
          }

          if (new Date() > new Date(magicLink.expires)) {
            console.log('Magic link login failed: Token expired');
            return null;
          }

          // Get the user - use raw query to handle MFA columns
          let user: any;
          const users = await prisma.$queryRaw<any[]>`
            SELECT id, email, name, role, "subscriptionTier", "subscriptionStatus",
                   "isActive", "isSuspended", "mfaEnabled", "mfaSecret"
            FROM "User"
            WHERE email = ${magicLink.email}
            LIMIT 1
          `;
          
          user = users[0];

          if (!user) {
            console.log('Magic link login failed: User not found');
            return null;
          }

          // Check active status
          if (user.isActive === false || user.isSuspended === true) {
            console.log('Magic link login failed: User not active');
            return null;
          }

          // If MFA is enabled, verify the code
          if (user.mfaEnabled && user.mfaSecret) {
            if (!credentials.mfaCode) {
              console.log('Magic link login failed: MFA required but no code');
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
            
            console.log('MFA verification successful for:', user.email);
          }

          // Mark magic link as used
          await (prisma as any).magicLink.update({
            where: { token: credentials.token },
            data: {
              used: true,
              usedAt: new Date(),
            },
          });

          // Update last login
          try {
            await prisma.$executeRaw`
              UPDATE "User" 
              SET "lastLoginAt" = NOW(), "loginCount" = "loginCount" + 1
              WHERE id = ${user.id}
            `;
          } catch (e) {
            console.log('Could not update login stats');
          }

          console.log('Magic link login successful for:', user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            rememberMe: credentials.rememberMe === 'true',
            lastMfaVerifiedAt: user.mfaEnabled ? Date.now() : null,
            mfaEnabled: user.mfaEnabled || false,
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
    maxAge: SESSION_DURATION_DEFAULT, // Default, will be overridden by jwt callback
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.subscriptionTier = (user as any).subscriptionTier;
        token.subscriptionStatus = (user as any).subscriptionStatus;
        token.rememberMe = (user as any).rememberMe || false;
        token.lastMfaVerifiedAt = (user as any).lastMfaVerifiedAt || null;
        token.mfaEnabled = (user as any).mfaEnabled || false;
        
        // Set expiration based on remember me
        if ((user as any).rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + SESSION_DURATION_REMEMBER;
        }
      }
      
      // Check if MFA re-verification is needed (for users with MFA enabled)
      if (token.mfaEnabled && token.lastMfaVerifiedAt) {
        const timeSinceLastMfa = Date.now() - (token.lastMfaVerifiedAt as number);
        token.mfaReauthRequired = timeSinceLastMfa > MFA_REAUTH_INTERVAL;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).subscriptionTier = token.subscriptionTier;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).mfaEnabled = token.mfaEnabled;
        (session.user as any).mfaReauthRequired = token.mfaReauthRequired || false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
