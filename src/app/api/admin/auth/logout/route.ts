import { NextRequest, NextResponse } from 'next/server';
import { revokeAdminSession } from '@/lib/admin-security';
import { adminAuthFailure } from '@/lib/admin-response';

export async function POST(request: NextRequest) {
  try {
    await revokeAdminSession(request.cookies.get('admin_session')?.value);
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_session');
    response.cookies.delete('admin_temp_token');
    return response;
  } catch (error) { return adminAuthFailure(error); }
}
