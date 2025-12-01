import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminSession {
  id: string;
  adminId: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    mfaEnabled: boolean;
  };
}

/**
 * Get current admin session from cookies
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return null;
    }

    const session = await prisma.adminSession.findUnique({
      where: { token: sessionToken },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            mfaEnabled: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await prisma.adminSession.delete({ where: { id: session.id } });
      return null;
    }

    // Check if admin is still active
    if (!session.admin.isActive) {
      await prisma.adminSession.delete({ where: { id: session.id } });
      return null;
    }

    return {
      id: session.id,
      adminId: session.adminId,
      admin: session.admin,
    };
  } catch (error) {
    console.error('Error getting admin session:', error);
    return null;
  }
}

/**
 * Verify admin credentials and create session
 */
export async function adminLogin(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string; requiresMfa?: boolean; sessionToken?: string }> {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!admin.isActive) {
      return { success: false, error: 'Account is disabled. Contact a super admin.' };
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if MFA is enabled
    if (admin.mfaEnabled) {
      // Return flag that MFA is required - token will be created after MFA verification
      return { success: true, requiresMfa: true };
    }

    // Create session
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        token: sessionToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    return { success: true, sessionToken };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

/**
 * Admin logout - delete session
 */
export async function adminLogout(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (sessionToken) {
      await prisma.adminSession.deleteMany({
        where: { token: sessionToken },
      });
    }

    return true;
  } catch (error) {
    console.error('Admin logout error:', error);
    return false;
  }
}

/**
 * Create a new admin user (only super admins can do this)
 */
export async function createAdminUser(
  createdById: string,
  data: {
    email: string;
    password: string;
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'BILLING';
  }
): Promise<{ success: boolean; error?: string; admin?: any }> {
  try {
    // Check if creator is a super admin
    const creator = await prisma.adminUser.findUnique({
      where: { id: createdById },
      select: { role: true },
    });

    if (!creator || creator.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Only super admins can create admin accounts' };
    }

    // Check if email already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return { success: false, error: 'An admin with this email already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create admin
    const admin = await prisma.adminUser.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        role: data.role,
        createdBy: createdById,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return { success: true, admin };
  } catch (error) {
    console.error('Create admin error:', error);
    return { success: false, error: 'Failed to create admin account' };
  }
}

/**
 * Create the first super admin (only works if no admins exist)
 */
export async function createFirstSuperAdmin(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; admin?: any }> {
  try {
    // Check if any admin exists
    const adminCount = await prisma.adminUser.count();

    if (adminCount > 0) {
      return { success: false, error: 'Admin accounts already exist. Use the admin portal to create new admins.' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create first super admin
    const admin = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'SUPER_ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return { success: true, admin };
  } catch (error) {
    console.error('Create first super admin error:', error);
    return { success: false, error: 'Failed to create super admin account' };
  }
}

/**
 * Check if current admin has required role
 */
export function hasAdminRole(
  adminRole: string,
  requiredRoles: ('SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'BILLING')[]
): boolean {
  return requiredRoles.includes(adminRole as any);
}

/**
 * Log admin action
 */
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        adminEmail,
        action,
        targetType,
        targetId,
        details,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
