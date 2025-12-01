import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ADMIN_SECRET_SET: !!process.env.ADMIN_SECRET,
    ADMIN_SECRET_LENGTH: process.env.ADMIN_SECRET?.length || 0,
    NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    // List all env var keys (not values) to see what's available
    ALL_ENV_KEYS: Object.keys(process.env).filter(k => 
      !k.startsWith('npm_') && 
      !k.startsWith('PATH') &&
      !k.startsWith('HOME')
    ).sort()
  });
}
