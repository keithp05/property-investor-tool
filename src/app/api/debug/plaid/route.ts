import { NextResponse } from 'next/server';

// Retired diagnostics must not disclose secrets, query users, or contact providers.
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
