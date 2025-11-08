# Multi-Factor Authentication (MFA) Implementation Plan

## Overview
Add MFA/2FA to enhance security for the Real Estate Investor Platform.

## MFA Options

### Option 1: TOTP (Time-Based One-Time Password) - Recommended
**Pros**:
- Works offline
- No SMS fees
- More secure than SMS
- Users can use Google Authenticator, Authy, Microsoft Authenticator

**Implementation**:
```bash
npm install otplib qrcode
```

**Database Changes**:
```prisma
model User {
  // ... existing fields

  // MFA
  mfaEnabled        Boolean  @default(false)
  mfaSecret         String?  // TOTP secret (encrypted)
  mfaBackupCodes    String[] // 10 one-time backup codes
}
```

**Flow**:
1. User enables MFA in settings
2. Generate TOTP secret and QR code
3. User scans QR with authenticator app
4. Verify with first code
5. Show 10 backup codes (save/download)
6. On login: prompt for 6-digit code after password

### Option 2: SMS/Email OTP
**Pros**:
- Familiar to users
- No app required

**Cons**:
- SMS costs money
- Email less secure
- Requires phone number

**Implementation**:
```bash
npm install twilio  # for SMS
# Use AWS SES for email
```

**Database Changes**:
```prisma
model User {
  // ... existing fields

  // MFA
  mfaEnabled        Boolean  @default(false)
  mfaMethod         MFAMethod @default(TOTP)  // TOTP, SMS, EMAIL
  mfaBackupCodes    String[]
}

model OTPVerification {
  id          String   @id @default(cuid())
  userId      String
  code        String   // 6-digit code
  type        String   // LOGIN, SETUP, RESET
  expiresAt   DateTime // 5 minutes
  verified    Boolean  @default(false)
  createdAt   DateTime @default(now())
}

enum MFAMethod {
  TOTP
  SMS
  EMAIL
}
```

## Implementation Steps (Phase 2)

### 1. Update Database Schema
```prisma
model User {
  // ... existing fields

  // MFA
  mfaEnabled        Boolean   @default(false)
  mfaSecret         String?   // TOTP secret (encrypted)
  mfaMethod         MFAMethod @default(TOTP)
  mfaBackupCodes    Json?     // Array of backup codes
  mfaVerifiedAt     DateTime?
}

enum MFAMethod {
  TOTP
  SMS
  EMAIL
}
```

### 2. Install Packages
```bash
npm install otplib qrcode @types/qrcode
```

### 3. Create MFA Setup Page (`/app/settings/mfa/page.tsx`)
- Toggle to enable MFA
- Generate QR code
- Verify setup with first code
- Display backup codes

### 4. Create MFA Service (`/src/services/mfaService.ts`)
```typescript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class MFAService {
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  static async generateQRCode(email: string, secret: string): Promise<string> {
    const otpauth = authenticator.keyuri(email, 'Real Estate Investor', secret);
    return await QRCode.toDataURL(otpauth);
  }

  static verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  static generateBackupCodes(count = 10): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
}
```

### 5. Update Login Flow (`/app/login/page.tsx`)
```typescript
// After password verification:
if (user.mfaEnabled) {
  // Show MFA code input
  const verifyMFA = await fetch('/api/auth/verify-mfa', {
    method: 'POST',
    body: JSON.stringify({ userId: user.id, token: mfaCode })
  });

  if (!verifyMFA.ok) {
    setError('Invalid MFA code');
    return;
  }
}
```

### 6. Create API Endpoints
- `POST /api/auth/mfa/setup` - Generate secret and QR code
- `POST /api/auth/mfa/verify-setup` - Verify first code and enable MFA
- `POST /api/auth/mfa/disable` - Disable MFA (requires password + MFA code)
- `POST /api/auth/verify-mfa` - Verify MFA code during login
- `POST /api/auth/mfa/backup-code` - Verify backup code

### 7. Backup Codes
- Generate 10 one-time use codes
- Store hashed in database
- Show to user ONCE after MFA setup
- Allow download as .txt file
- Can use if phone lost/app deleted

## Security Considerations

1. **Encrypt MFA Secret**: Use `crypto` to encrypt `mfaSecret` before storing
2. **Rate Limiting**: Limit MFA verification attempts (5 attempts, then lockout)
3. **Hash Backup Codes**: Store bcrypt hashed backup codes
4. **Audit Logging**: Log MFA events (enable, disable, failed attempts)
5. **Recovery Options**:
   - Backup codes (primary)
   - Admin override (for enterprise tier)
   - Email recovery link (with re-verification)

## User Experience

### Enabling MFA:
1. Go to Settings > Security
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with authenticator app
4. Enter 6-digit code to verify
5. Save 10 backup codes (download .txt)

### Login with MFA:
1. Enter email/password
2. Enter 6-digit code from app
3. (Optional) Check "Trust this device for 30 days"

### Lost Phone/App:
1. Click "Use backup code" on MFA screen
2. Enter one of 10 backup codes
3. Login successful
4. Backup code is consumed
5. (Optional) Disable and re-enable MFA to get new codes

## Feature Gating

- **FREE tier**: Basic password-only
- **PRO tier**: MFA available
- **ENTERPRISE tier**: MFA required + admin can enforce for all users

## Testing

```bash
# Test TOTP generation
const secret = MFAService.generateSecret();
const token = authenticator.generate(secret);
const isValid = MFAService.verifyToken(token, secret);
```

## Next Steps

**Phase 2 - After Authentication Working**:
1. Add MFA fields to User model
2. Install TOTP packages
3. Create MFA setup page
4. Update login flow
5. Add backup code system
6. Add "Trust this device" cookie option

**Estimated Time**: 4-6 hours
