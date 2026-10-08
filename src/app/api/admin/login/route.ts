import { NextRequest, NextResponse } from 'next/server';
import { startAdminLogin, adminCookieOptions } from '@/lib/admin-security';
import { adminAuthFailure } from '@/lib/admin-response';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const challenge = await startAdminLogin(password);
    const response = NextResponse.json({ success: true, needsMfaSetup: challenge.needsMfaSetup });
    response.cookies.set('admin_temp_token', challenge.token, { ...adminCookieOptions, maxAge: challenge.maxAge });
    response.cookies.delete('admin_session');
    return response;
  } catch (error) { return adminAuthFailure(error); }
}
