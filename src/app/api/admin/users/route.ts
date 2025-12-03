import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';
import bcrypt from 'bcryptjs';

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

    // Build the query based on what columns exist
    let users;
    let total;

    try {
      // Try to get users with all fields and relations
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
            // These might not exist yet
            // isActive: true,
            // isSuspended: true,
            // mfaEnabled: true,
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
      // Fallback to simpler query if relations fail
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

    // Transform the data for the frontend
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

      // Add landlord profile data
      if (user.landlordProfile) {
        transformed.landlordProfile = {
          id: user.landlordProfile.id,
          company: user.landlordProfile.company,
          propertyCount: user.landlordProfile._count?.properties || 0,
          tenantCount: user.landlordProfile._count?.tenants || 0,
        };
      }

      // Add tenant profile data
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
    const { email, name, password, role } = body;

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

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully',
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
    const { userId, role, resetPassword, subscriptionTier, subscriptionStatus } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
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
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      newPassword = password + '!';
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
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
      },
    });

    console.log(`User ${existingUser.email} updated:`, changes.join(', '));

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: changes.join(', '),
      newPassword: newPassword,
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

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} deleted successfully`,
    });

  } catch (error: any) {
    console.error('Admin user delete error:', error);
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete user: they have related records (properties, tenants, etc.)' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete user', debug: error.message },
      { status: 500 }
    );
  }
}
