import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();

    // Test query
    const userCount = await prisma.user.count();

    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      userCount,
      databaseUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
    }, { status: 500 });
  }
}
