import { NextResponse } from 'next/server';

// The supported admin flow uses /api/admin/login and /api/admin/mfa/*.
export async function POST() {
  return NextResponse.json({ success: false, error: 'Use the administrator sign-in page at /admin/login' }, { status: 410 });
}
