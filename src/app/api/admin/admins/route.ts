import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession, createAdminUser, logAdminAction, hasAdminRole } from '@/lib/admin-auth';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/admins
 * List all admin accounts (Super Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAdminRole(session.admin.role, ['SUPER_ADMIN'])) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const admins = await prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      admins,
    });

  } catch (error: any) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get admins' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/admins
 * Create a new admin account (Super Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAdminRole(session.admin.role, ['SUPER_ADMIN'])) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'BILLING'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const result = await createAdminUser(session.adminId, { email, password, name, role });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Log action
    await logAdminAction(
      session.adminId,
      session.admin.email,
      'ADMIN_CREATED',
      'AdminUser',
      result.admin.id,
      { email, name, role }
    );

    return NextResponse.json({
      success: true,
      admin: result.admin,
    });

  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/admins
 * Update an admin account (Super Admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAdminRole(session.admin.role, ['SUPER_ADMIN'])) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { adminId, role, isActive, resetPassword } = body;

    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required' }, { status: 400 });
    }

    // Prevent modifying yourself
    if (adminId === session.adminId) {
      return NextResponse.json(
        { success: false, error: 'You cannot modify your own account' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    const changes: string[] = [];

    if (role !== undefined) {
      const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'BILLING'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
      changes.push(`role -> ${role}`);
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      changes.push(`active -> ${isActive}`);
    }

    if (resetPassword) {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-10);
      updateData.password = await bcrypt.hash(tempPassword, 12);
      changes.push('password reset');
      
      // TODO: Send email with temporary password
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const updatedAdmin = await prisma.adminUser.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Log action
    await logAdminAction(
      session.adminId,
      session.admin.email,
      'ADMIN_UPDATED',
      'AdminUser',
      adminId,
      { changes }
    );

    return NextResponse.json({
      success: true,
      admin: updatedAdmin,
      message: `Admin updated: ${changes.join(', ')}`,
    });

  } catch (error: any) {
    console.error('Update admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update admin' },
      { status: 500 }
    );
  }
}
