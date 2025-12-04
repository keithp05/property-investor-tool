import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@resend.dev';
const APP_NAME = 'RealEstate Investor';

interface EmailResult {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * Send a password reset email with a new password
 */
export async function sendPasswordResetEmail(
  to: string,
  newPassword: string,
  userName?: string
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured - skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Your ${APP_NAME} Password Has Been Reset`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px;">Password Reset</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Hi${userName ? ` ${userName}` : ''},
              </p>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Your password has been reset by an administrator. Here is your new password:
              </p>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 0 0 24px;">
                <code style="font-size: 20px; font-weight: bold; color: #7c3aed; letter-spacing: 1px;">${newPassword}</code>
              </div>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Please log in and change your password immediately for security.
              </p>
              <a href="${process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com'}/login" 
                 style="display: block; background: #7c3aed; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600;">
                Log In Now
              </a>
            </div>
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                If you didn't request this password reset, please contact support immediately.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log('Password reset email sent to:', to, 'id:', data?.id);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Email error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a forgot password email with reset link
 */
export async function sendForgotPasswordEmail(
  to: string,
  resetUrl: string,
  userName?: string
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured - skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Reset Your ${APP_NAME} Password`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px;">Reset Your Password</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Hi${userName ? ` ${userName}` : ''},
              </p>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              <a href="${resetUrl}" 
                 style="display: block; background: #7c3aed; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600; margin: 0 0 24px;">
                Reset Password
              </a>
              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
                This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Having trouble? Copy and paste this link into your browser:<br>
                <span style="color: #6b7280; word-break: break-all;">${resetUrl}</span>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log('Forgot password email sent to:', to, 'id:', data?.id);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Email error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(
  to: string,
  password: string,
  userName?: string
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured - skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Welcome to ${APP_NAME}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ${APP_NAME}!</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Hi${userName ? ` ${userName}` : ''},
              </p>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Your account has been created. Here are your login credentials:
              </p>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Email</p>
                <p style="margin: 0 0 16px; color: #1f2937; font-weight: 600;">${to}</p>
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Password</p>
                <code style="font-size: 18px; font-weight: bold; color: #7c3aed;">${password}</code>
              </div>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Please change your password after your first login.
              </p>
              <a href="${process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com'}/login" 
                 style="display: block; background: #7c3aed; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600;">
                Log In Now
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log('Welcome email sent to:', to, 'id:', data?.id);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Email error:', err);
    return { success: false, error: err.message };
  }
}
