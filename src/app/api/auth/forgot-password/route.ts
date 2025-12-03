import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
import { sendEmail } from '@/lib/notifications';

const getJwtSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  return new TextEncoder().encode(secret || 'fallback-secret-key-for-development');
};

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  console.log('=== FORGOT PASSWORD REQUEST ===');
  
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Looking up user:', normalizedEmail);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    // If user not found, still return success (prevent email enumeration)
    if (!user) {
      console.log('User not found for email:', normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    console.log('User found:', user.id);

    // Generate JWT reset token (valid for 1 hour)
    const JWT_SECRET = getJwtSecret();
    const resetToken = await new SignJWT({ 
      type: 'password_reset',
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    console.log('Reset URL generated for:', user.email);

    // Send email using AWS SES
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - RentalIQ',
      body: `Hi ${user.name || 'there'},

You requested to reset your password for your RentalIQ account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Best regards,
RentalIQ Team`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #4F46E5; margin: 0; }
    .button { display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .button:hover { background-color: #4338CA; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
    .warning { background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 12px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🔐 Password Reset</h1>
      </div>
      <p>Hi ${user.name || 'there'},</p>
      <p>You requested to reset your password for your RentalIQ account.</p>
      <p>Click the button below to set a new password:</p>
      <center>
        <a href="${resetUrl}" class="button">Reset Password</a>
      </center>
      <div class="warning">
        ⏰ This link will expire in <strong>1 hour</strong>.
      </div>
      <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      <div class="footer">
        <p>© ${new Date().getFullYear()} RentalIQ. All rights reserved.</p>
        <p>If the button doesn't work, copy and paste this link:<br>
        <a href="${resetUrl}" style="color: #4F46E5; word-break: break-all;">${resetUrl}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`,
    });

    console.log('Email sent:', emailSent);
    console.log('==============================');
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
      emailSent, // For debugging
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request', debug: error.message },
      { status: 500 }
    );
  }
}
