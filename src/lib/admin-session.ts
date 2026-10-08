import { cookies } from 'next/headers';
import { isAdminSession } from './admin-security';

export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isAdminSession(cookieStore.get('admin_session')?.value);
}
