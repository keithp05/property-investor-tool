import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';

/**
 * GET /api/admin/check-db
 * Check database tables and their status (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tables: Record<string, { exists: boolean; count?: number; error?: string }> = {};

    // Check User table
    try {
      const userCount = await prisma.user.count();
      tables['User'] = { exists: true, count: userCount };
    } catch (e: any) {
      tables['User'] = { exists: false, error: e.message };
    }

    // Check MagicLink table
    try {
      const magicLinkCount = await (prisma as any).magicLink.count();
      tables['MagicLink'] = { exists: true, count: magicLinkCount };
    } catch (e: any) {
      tables['MagicLink'] = { exists: false, error: e.message };
    }

    // Check UserFeatureOverride table
    try {
      const overrideCount = await prisma.userFeatureOverride.count();
      tables['UserFeatureOverride'] = { exists: true, count: overrideCount };
    } catch (e: any) {
      tables['UserFeatureOverride'] = { exists: false, error: e.message };
    }

    // Check AdminUser table
    try {
      const adminCount = await prisma.adminUser.count();
      tables['AdminUser'] = { exists: true, count: adminCount };
    } catch (e: any) {
      tables['AdminUser'] = { exists: false, error: e.message };
    }

    // Check _prisma_migrations table
    try {
      const migrations = await prisma.$queryRaw`SELECT "migration_name" FROM "_prisma_migrations" ORDER BY "finished_at" DESC LIMIT 10`;
      tables['_prisma_migrations'] = { exists: true, count: (migrations as any[]).length };
    } catch (e: any) {
      tables['_prisma_migrations'] = { exists: false, error: e.message };
    }

    return NextResponse.json({
      success: true,
      tables,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Check DB error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/check-db
 * Create missing tables (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'create-magic-link-table') {
      // Try to create the MagicLink table if it doesn't exist
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "MagicLink" (
            "id" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "token" TEXT NOT NULL,
            "expires" TIMESTAMP(3) NOT NULL,
            "used" BOOLEAN NOT NULL DEFAULT false,
            "usedAt" TIMESTAMP(3),
            "mfaPending" BOOLEAN NOT NULL DEFAULT false,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
          )
        `;

        // Create indexes
        await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "MagicLink_token_key" ON "MagicLink"("token")`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MagicLink_email_idx" ON "MagicLink"("email")`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MagicLink_expires_idx" ON "MagicLink"("expires")`;

        return NextResponse.json({
          success: true,
          message: 'MagicLink table created successfully',
        });
      } catch (e: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to create table: ${e.message}`,
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action',
    }, { status: 400 });

  } catch (error: any) {
    console.error('Check DB POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
