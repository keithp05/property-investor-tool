import { NextRequest, NextResponse } from 'next/server';
import { prepareAdminMfa } from '@/lib/admin-security';
import { adminAuthFailure } from '@/lib/admin-response';

export async function POST(request: NextRequest) {
  try {
    const setup = await prepareAdminMfa(request.cookies.get('admin_temp_token')?.value);
    return NextResponse.json({ success: true, ...setup });
  } catch (error) { return adminAuthFailure(error); }
}
