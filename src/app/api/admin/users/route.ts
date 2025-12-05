import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email';

// Version 3 - Using raw SQL for delete to bypass schema mismatch

/**
 * GET /api/admin/users
 * List all users with pagination and relationships
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    // Use raw query to avoid schema mismatch issues
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, email, name, role, "createdAt", "subscriptionTier", "subscriptionStatus"
      FROM "User"
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalResult = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as count FROM "User"`;
    const total = parseInt(totalResult[0].count);

    const transformedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      subscriptionTier: user.subscriptionTier || 'FREE',
      subscriptionStatus: user.subscriptionStatus || 'INACTIVE',
      isActive: true,
      isSuspended: false,
      mfaEnabled: false,
    }));

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get users', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, password, role, sendEmail } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM "User" WHERE email = ${normalizedEmail} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userRole = role || 'TENANT';

    // Create user with raw SQL
    const newUsers = await prisma.$queryRaw<any[]>`
      INSERT INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${normalizedEmail},
        ${name || null},
        ${hashedPassword},
        ${userRole}::"UserRole",
        NOW(),
        NOW()
      )
      RETURNING id, email, name, role, "createdAt"
    `;

    const newUser = newUsers[0];

    let emailSent = false;
    if (sendEmail) {
      const result = await sendWelcomeEmail(normalizedEmail, password, name);
      emailSent = result.success;
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully',
      emailSent,
    });

  } catch (error: any) {
    console.error('Admin create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role, subscription, or reset password
 */
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role, resetPassword, subscriptionTier, subscriptionStatus, sendEmail } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Get existing user
    const existingUsers = await prisma.$queryRaw<any[]>`
      SELECT id, email, name, password FROM "User" WHERE id = ${userId} LIMIT 1
    `;

    if (existingUsers.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const existingUser = existingUsers[0];
    const changes: string[] = [];
    let newPassword: string | null = null;

    // Build dynamic update
    const updates: string[] = [];
    
    if (role) {
      updates.push(`role = '${role}'::"UserRole"`);
      changes.push(`role → ${role}`);
    }

    if (subscriptionTier) {
      updates.push(`"subscriptionTier" = '${subscriptionTier}'::"SubscriptionTier"`);
      changes.push(`tier → ${subscriptionTier}`);
    }

    if (subscriptionStatus) {
      updates.push(`"subscriptionStatus" = '${subscriptionStatus}'::"SubscriptionStatus"`);
      changes.push(`status → ${subscriptionStatus}`);
    }

    if (resetPassword) {
      const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let password = '';
      for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      newPassword = password;
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      updates.push(`password = '${hashedPassword}'`);
      changes.push('password reset');
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`"updatedAt" = NOW()`);

    // Execute update
    await prisma.$executeRawUnsafe(`
      UPDATE "User" SET ${updates.join(', ')} WHERE id = '${userId}'
    `);

    // Get updated user
    const updatedUsers = await prisma.$queryRaw<any[]>`
      SELECT id, email, name, role, "subscriptionTier", "subscriptionStatus"
      FROM "User" WHERE id = ${userId} LIMIT 1
    `;

    let emailSent = false;
    if (resetPassword && newPassword && sendEmail) {
      const result = await sendPasswordResetEmail(
        existingUser.email, 
        newPassword, 
        existingUser.name || undefined
      );
      emailSent = result.success;
    }

    return NextResponse.json({
      success: true,
      user: updatedUsers[0],
      message: changes.join(', '),
      newPassword: newPassword,
      emailSent,
    });

  } catch (error: any) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user using raw SQL to bypass schema mismatch
 */
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    console.log('DELETE: Attempting to delete user:', userId);

    // Get user info using raw query
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, email, name, role FROM "User" WHERE id = ${userId} LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Prevent deleting SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete SUPER_ADMIN users' 
      }, { status: 403 });
    }

    console.log('DELETE: Found user to delete:', user.email);

    // Delete related records using raw SQL
    // 1. Delete feature overrides
    try {
      await prisma.$executeRaw`DELETE FROM "UserFeatureOverride" WHERE "userId" = ${userId}`;
      console.log('DELETE: Deleted feature overrides');
    } catch (e: any) {
      console.log('DELETE: Feature overrides cleanup:', e.message);
    }

    // 2. Delete accounts (OAuth)
    try {
      await prisma.$executeRaw`DELETE FROM "Account" WHERE "userId" = ${userId}`;
      console.log('DELETE: Deleted accounts');
    } catch (e: any) {
      console.log('DELETE: Accounts cleanup:', e.message);
    }

    // 3. Delete sessions
    try {
      await prisma.$executeRaw`DELETE FROM "Session" WHERE "userId" = ${userId}`;
      console.log('DELETE: Deleted sessions');
    } catch (e: any) {
      console.log('DELETE: Sessions cleanup:', e.message);
    }

    // 4. Delete magic links
    try {
      await prisma.$executeRaw`DELETE FROM "MagicLink" WHERE email = ${user.email}`;
      console.log('DELETE: Deleted magic links');
    } catch (e: any) {
      console.log('DELETE: Magic links cleanup:', e.message);
    }

    // 5. Delete tenant applications
    try {
      await prisma.$executeRaw`DELETE FROM "TenantApplication" WHERE "userId" = ${userId}`;
      console.log('DELETE: Deleted tenant applications');
    } catch (e: any) {
      console.log('DELETE: Tenant applications cleanup:', e.message);
    }

    // 6. Delete profiles (these cascade to other records)
    try {
      await prisma.$executeRaw`DELETE FROM "LandlordProfile" WHERE "userId" = ${userId}`;
      console.log('DELETE: Deleted landlord profile');
    } catch (e: any) {
      console.log('DELETE: Landlord profile cleanup:', e.message);
    }

    try {
      await prisma.$executeRaw`DELETE FROM "TenantProfile" WHERE "userId" = ${userId}`;
      console.log('DELETE: Deleted tenant profile');
    } catch (e: any) {
      console.log('DELETE: Tenant profile cleanup:', e.message);
    }

    try {
      await prisma.$executeRaw`DELETE FROM "ProProfile" WHERE "userId" = ${userId}`;
      console.log('DELETE: Deleted pro profile');
    } catch (e: any) {
      console.log('DELETE: Pro profile cleanup:', e.message);
    }

    // 7. Finally delete the user using raw SQL
    try {
      const result = await prisma.$executeRaw`DELETE FROM "User" WHERE id = ${userId}`;
      console.log('DELETE: User deleted successfully:', user.email, 'rows affected:', result);

      return NextResponse.json({
        success: true,
        message: `User ${user.email} deleted successfully`,
      });
    } catch (deleteError: any) {
      console.error('DELETE: User delete failed:', deleteError.message);
      console.error('DELETE: Error code:', deleteError.code);
      
      // Check for foreign key constraint
      if (deleteError.message?.includes('foreign key constraint') || deleteError.code === 'P2003') {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete user: they have related records (properties, tenants, etc.). Please remove those first or deactivate the user instead.',
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to delete user',
        debug: deleteError.message,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('DELETE: Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user', debug: error.message },
      { status: 500 }
    );
  }
}
