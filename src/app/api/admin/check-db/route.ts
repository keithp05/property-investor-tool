import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';

// Version 2 - Added add-mfa-columns action and userColumns check

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
    const userColumns: Record<string, boolean> = {};

    // Check User table
    try {
      const userCount = await prisma.user.count();
      tables['User'] = { exists: true, count: userCount };
    } catch (e: any) {
      tables['User'] = { exists: false, error: e.message };
    }

    // Check specific User columns for MFA
    const columnsToCheck = ['mfaEnabled', 'mfaSecret', 'mfaBackupCodes', 'mfaVerifiedAt', 'isActive', 'isSuspended', 'lastLoginAt', 'loginCount'];
    
    for (const col of columnsToCheck) {
      try {
        await prisma.$queryRawUnsafe(`SELECT "${col}" FROM "User" LIMIT 1`);
        userColumns[col] = true;
      } catch (e: any) {
        userColumns[col] = false;
      }
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
    let recentMigrations: any[] = [];
    try {
      recentMigrations = await prisma.$queryRaw`SELECT "migration_name", "finished_at" FROM "_prisma_migrations" ORDER BY "finished_at" DESC LIMIT 10`;
      tables['_prisma_migrations'] = { exists: true, count: (recentMigrations as any[]).length };
    } catch (e: any) {
      tables['_prisma_migrations'] = { exists: false, error: e.message };
    }

    return NextResponse.json({
      success: true,
      version: 2,
      tables,
      userColumns,
      recentMigrations: recentMigrations.map((m: any) => ({
        name: m.migration_name,
        finishedAt: m.finished_at,
      })),
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
 * Create missing tables or columns (admin only)
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

    if (action === 'add-mfa-columns') {
      const results: Record<string, string> = {};
      
      // Add missing User columns for MFA and account status
      const columns = [
        { name: 'isActive', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true` },
        { name: 'isSuspended', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false` },
        { name: 'suspendedAt', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3)` },
        { name: 'suspendedReason', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT` },
        { name: 'lastLoginAt', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)` },
        { name: 'lastActiveAt', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3)` },
        { name: 'loginCount', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginCount" INTEGER NOT NULL DEFAULT 0` },
        { name: 'mfaEnabled', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false` },
        { name: 'mfaSecret', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT` },
        { name: 'mfaBackupCodes', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[]` },
        { name: 'mfaVerifiedAt', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaVerifiedAt" TIMESTAMP(3)` },
      ];

      for (const col of columns) {
        try {
          await prisma.$executeRawUnsafe(col.sql);
          results[col.name] = 'added';
        } catch (e: any) {
          if (e.message?.includes('already exists')) {
            results[col.name] = 'already exists';
          } else {
            results[col.name] = `error: ${e.message}`;
          }
        }
      }

      // Create index on isActive
      try {
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive")`;
        results['User_isActive_idx'] = 'created';
      } catch (e: any) {
        results['User_isActive_idx'] = e.message?.includes('already exists') ? 'already exists' : `error: ${e.message}`;
      }

      return NextResponse.json({
        success: true,
        message: 'MFA columns added',
        results,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action. Available actions: create-magic-link-table, add-mfa-columns',
    }, { status: 400 });

  } catch (error: any) {
    console.error('Check DB POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
