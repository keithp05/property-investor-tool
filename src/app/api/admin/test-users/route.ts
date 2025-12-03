import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/notifications';

/**
 * POST /api/admin/test-users
 * Create multiple test users at once
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { users, sendWelcomeEmails } = await request.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Users array required' }, { status: 400 });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const userData of users) {
      const { email, name, password, role } = userData;

      if (!email) {
        errors.push({ email, error: 'Email required' });
        continue;
      }

      try {
        // Check if user exists
        const existing = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (existing) {
          errors.push({ email, error: 'User already exists' });
          continue;
        }

        // Generate password if not provided
        const userPassword = password || generatePassword();
        const hashedPassword = await bcrypt.hash(userPassword, 12);

        // Create user
        const newUser = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            name: name || null,
            password: hashedPassword,
            role: role || 'TENANT',
          },
        });

        // Create profile based on role
        if (role === 'LANDLORD') {
          await prisma.landlordProfile.create({
            data: { userId: newUser.id },
          });
        } else if (role === 'TENANT' || !role) {
          await prisma.tenantProfile.create({
            data: { userId: newUser.id },
          });
        }

        results.push({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          password: userPassword, // Return plain password for admin
        });

        // Send welcome email if requested
        if (sendWelcomeEmails) {
          await sendEmail({
            to: email,
            subject: 'Welcome to RentalIQ - Your Test Account',
            body: `Hi ${name || 'there'},

You've been added as a tester for RentalIQ!

Login Details:
Email: ${email}
Password: ${userPassword}

Login at: ${process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com'}/login

Please change your password after logging in.

Best regards,
RentalIQ Team`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials { background-color: #EEF2FF; border: 1px solid #C7D2FE; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .credentials code { background-color: white; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 Welcome to RentalIQ!</h1>
    </div>
    <div class="content">
      <p>Hi ${name || 'there'},</p>
      <p>You've been added as a tester for RentalIQ!</p>
      
      <div class="credentials">
        <h3>Your Login Details:</h3>
        <p><strong>Email:</strong> <code>${email}</code></p>
        <p><strong>Password:</strong> <code>${userPassword}</code></p>
        <p><strong>Role:</strong> ${role || 'TENANT'}</p>
      </div>
      
      <center>
        <a href="${process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com'}/login" class="button">Login Now</a>
      </center>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">⚠️ Please change your password after logging in.</p>
      
      <p>Best regards,<br><strong>RentalIQ Team</strong></p>
    </div>
  </div>
</body>
</html>`,
          });
        }

      } catch (err: any) {
        errors.push({ email, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      created: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: users.length,
        created: results.length,
        failed: errors.length,
      },
    });

  } catch (error: any) {
    console.error('Create test users error:', error);
    return NextResponse.json(
      { error: 'Failed to create test users', details: error.message },
      { status: 500 }
    );
  }
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '!';
}

/**
 * GET /api/admin/test-users
 * Get sample user data template
 */
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    template: {
      users: [
        { email: 'landlord@test.com', name: 'Test Landlord', role: 'LANDLORD' },
        { email: 'tenant@test.com', name: 'Test Tenant', role: 'TENANT' },
        { email: 'pro@test.com', name: 'Test Pro', role: 'PRO' },
      ],
      sendWelcomeEmails: true,
    },
    roles: ['TENANT', 'LANDLORD', 'PRO', 'ADMIN'],
    note: 'Passwords will be auto-generated if not provided',
  });
}
