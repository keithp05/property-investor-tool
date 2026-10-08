import { NextResponse } from 'next/server';
import { AdminAuthError } from './admin-security';

export function adminAuthFailure(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  return NextResponse.json({ success: false, error: 'Administrator authentication is unavailable' }, { status: 503 });
}
