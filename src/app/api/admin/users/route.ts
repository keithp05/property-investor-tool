import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email';

// Version 2 - Simplified delete function

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
    const includeRelations = searchParams.get('includeRelations') === 'true';

    const skip = (page - 1) * limit;

    let users;
    let total;

    try {
      [users, total] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            ...(includeRelations && {
              landlordProfile: {
                select: {
                  id: true,
                  company: true,
                  _count: {
                    select: {
                      properties: true,
                      tenants: true,
                    }
                  }
                }
              },
              tenantProfile: {
                select: {
                  id: true,
                  currentTenancy: {
                    select: {
                      id: true,
                      monthlyRent: true,
                      property: {
                        select: {
                          address: true,
                          city: true,
                          state: true,
                        }
                      },
                      landlord: {
                        select: {
                          user: {
                            select: {
                              name: true,
                              email: true,
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
            }),
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count(),
      ]);
    } catch (e) {
      console.log('Falling back to simple user query');
      [users, total] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            subscriptionTier: true,
            subscriptionStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count(),
      ]);
    }

    const transformedUsers = users.map((user: any) => {
      const transformed: any = {
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
      };

      if (user.landlordProfile) {
        transformed.landlordProfile = {
          id: user.landlordProfile.id,
          company: user.landlordProfile.company,
          propertyCount: user.landlordProfile._count?.properties || 0,
          tenantCount: user.landlordProfile._count?.tenants || 0,
        };
      }

      if (user.tenantProfile) {
        transformed.tenantProfile = {
          id: user.tenantProfile.id,
          currentTenancy: user.tenantProfile.currentTenancy ? {
            propertyAddress: [
              user.tenantProfile.currentTenancy.property?.address,
              user.tenantProfile.currentTenancy.property?.city,
              user.tenantProfile.currentTenancy.property?.state
            ].filter(Boolean).join(', '),
            landlordName: user.tenantProfile.currentTenancy.landlord?.user?.name || 'Unknown',
            landlordEmail: user.tenantProfile.currentTenancy.landlord?.user?.email || '',
            monthlyRent: user.tenantProfile.currentTenancy.monthlyRent ? 
              parseFloat(user.tenantProfile.currentTenancy.monthlyRent.toString()) : null,
          } : null,
        };
      }

      return transformed;
    });

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

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        password: hashedPassword,
        role: role || 'TENANT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

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

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, password: true },
    });

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};
    const changes: string[] = [];
    let newPassword: string | null = null;

    if (role) {
      updateData.role = role;
      changes.push(`role → ${role}`);
    }

    if (subscriptionTier) {
      updateData.subscriptionTier = subscriptionTier;
      changes.push(`tier → ${subscriptionTier}`);
    }

    if (subscriptionStatus) {
      updateData.subscriptionStatus = subscriptionStatus;
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
      const verifyBeforeSave = await bcrypt.compare(newPassword, hashedPassword);
      
      if (!verifyBeforeSave) {
        return NextResponse.json({ 
          success: false, 
          error: 'Password hashing failed' 
        }, { status: 500 });
      }
      
      updateData.password = hashedPassword;
      changes.push('password reset');
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        password: true,
      },
    });

    if (resetPassword && newPassword) {
      const verifyMatch = await bcrypt.compare(newPassword, updatedUser.password);
      if (!verifyMatch) {
        return NextResponse.json({ 
          success: false, 
          error: 'Password reset failed - verification failed after save' 
        }, { status: 500 });
      }
    }

    let emailSent = false;
    if (resetPassword && newPassword && sendEmail) {
      const result = await sendPasswordResetEmail(
        existingUser.email, 
        newPassword, 
        existingUser.name || undefined
      );
      emailSent = result.success;
    }

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
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
 * Delete a user
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

    // Simple user lookup without relations to avoid query errors
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        email: true, 
        name: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete SUPER_ADMIN users' 
      }, { status: 403 });
    }

    console.log('DELETE: Found user to delete:', user.email);

    // Delete in order to handle foreign keys
    // 1. Delete feature overrides
    try {
      await prisma.userFeatureOverride.deleteMany({ where: { userId } });
      console.log('DELETE: Deleted feature overrides');
    } catch (e: any) {
      console.log('DELETE: Feature overrides cleanup:', e.message);
    }

    // 2. Delete accounts (OAuth)
    try {
      await prisma.account.deleteMany({ where: { userId } });
      console.log('DELETE: Deleted accounts');
    } catch (e: any) {
      console.log('DELETE: Accounts cleanup:', e.message);
    }

    // 3. Delete sessions
    try {
      await prisma.session.deleteMany({ where: { userId } });
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

    // 5. Finally delete the user
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      console.log('DELETE: User deleted successfully:', user.email);

      return NextResponse.json({
        success: true,
        message: `User ${user.email} deleted successfully`,
      });
    } catch (deleteError: any) {
      console.error('DELETE: User delete failed:', deleteError.message);
      console.error('DELETE: Error code:', deleteError.code);
      
      if (deleteError.code === 'P2003') {
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
