import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';

/**
 * GET /api/admin/logs
 * Get audit logs with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    try {
      const [logs, total] = await Promise.all([
        prisma.adminAuditLog.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.adminAuditLog.count(),
      ]);

      return NextResponse.json({
        success: true,
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (e: any) {
      // Table might not exist
      return NextResponse.json({
        success: true,
        logs: [],
        message: 'AdminAuditLog table not migrated yet',
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

  } catch (error: any) {
    console.error('Admin logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get logs', debug: error.message },
      { status: 500 }
    );
  }
}
