import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: string;
      subscriptionTier: string;
      subscriptionStatus: string;
      mfaEnabled: boolean;
      mfaReauthRequired: boolean;
    };
  }
}
