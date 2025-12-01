import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

/**
 * Verify admin session from cookie (JWT-based)
 * Returns true if valid admin session with MFA verified
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      return false;
    }

    const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
    
    return payload.type === 'admin_session' && payload.mfaVerified === true;
  } catch {
    return false;
  }
}
