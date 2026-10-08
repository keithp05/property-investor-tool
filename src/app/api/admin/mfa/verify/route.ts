import { NextRequest, NextResponse } from 'next/server';
import { completeAdminMfa, adminCookieOptions, adminSessionSeconds } from '@/lib/admin-security';
import { adminAuthFailure } from '@/lib/admin-response';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const token = await completeAdminMfa(request.cookies.get('admin_temp_token')?.value, code);
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', token, { ...adminCookieOptions, maxAge: adminSessionSeconds });
    response.cookies.delete('admin_temp_token');
    return response;
  } catch (error) { return adminAuthFailure(error); }
}
