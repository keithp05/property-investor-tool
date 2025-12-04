import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';
import bcrypt from 'bcryptjs';

/**
 * POST /api/admin/test-login
 * Test if a password works for a user (admin only, for debugging)
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('=== TEST LOGIN DEBUG ===');
    console.log('Testing email:', normalizedEmail);
    console.log('Testing password:', password);
    console.log('Testing password length:', password.length);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });

    if (!user) {
      console.log('User not found for email:', normalizedEmail);
      
      // Check if user exists with different case
      const allUsers = await prisma.user.findMany({
        select: { email: true },
        where: { email: { contains: email.split('@')[0], mode: 'insensitive' } }
      });
      
      return NextResponse.json({ 
        success: false, 
        error: 'User not found',
        debug: { 
          normalizedEmail,
          similarEmails: allUsers.map(u => u.email),
        }
      });
    }

    console.log('Found user:', user.email);
    console.log('Stored hash:', user.password);
    console.log('Stored hash length:', user.password?.length);

    if (!user.password) {
      return NextResponse.json({ 
        success: false, 
        error: 'User has no password set'
      });
    }

    // Test the password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', passwordMatch);

    // Also try hashing the password and comparing hashes (for debugging)
    const testHash = await bcrypt.hash(password, 12);
    console.log('Test hash of input password:', testHash);

    return NextResponse.json({
      success: true,
      loginWouldWork: passwordMatch,
      debug: {
        userFound: true,
        userEmail: user.email,
        storedHashLength: user.password.length,
        storedHashPrefix: user.password.substring(0, 29),
        passwordMatch,
        inputPasswordLength: password.length,
        inputPassword: password, // For debugging only - remove in production!
      }
    });

  } catch (error: any) {
    console.error('Test login error:', error);
    return NextResponse.json(
      { success: false, error: 'Test failed', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/test-login
 * Get user's current password hash info (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email parameter required' 
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found'
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasPassword: !!user.password,
        passwordHashLength: user.password?.length,
        passwordHashPrefix: user.password?.substring(0, 29),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });

  } catch (error: any) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed', debug: error.message },
      { status: 500 }
    );
  }
}
