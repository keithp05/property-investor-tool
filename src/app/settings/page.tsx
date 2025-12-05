'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Loader2, Shield, ShieldCheck, ShieldOff, Key, 
  Eye, EyeOff, X, Check, AlertTriangle, Copy,
  Calendar, Link2, Unlink, CheckCircle2, XCircle
} from 'lucide-react';

// Calendar provider icons
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#F25022" d="M1 1h10v10H1z"/>
    <path fill="#00A4EF" d="M1 13h10v10H1z"/>
    <path fill="#7FBA00" d="M13 1h10v10H13z"/>
    <path fill="#FFB900" d="M13 13h10v10H13z"/>
  </svg>
);

interface CalendarStatus {
  google: {
    connected: boolean;
    email?: string;
    connectedAt?: string;
  };
  microsoft: {
    connected: boolean;
    email?: string;
    connectedAt?: string;
  };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<string | null>(null);

  // Calendar State
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    google: { connected: false },
    microsoft: { connected: false },
  });
  const [calendarLoading, setCalendarLoading] = useState<'google' | 'microsoft' | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MFA Setup
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify'>('qr');
  const [mfaSecret, setMfaSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [copied, setCopied] = useState(false);

  // MFA Disable
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadMfaStatus();
      loadCalendarStatus();
      handleCalendarCallback();
    }
  }, [status]);

  // Handle calendar OAuth callback messages
  function handleCalendarCallback() {
    const calendarResult = searchParams.get('calendar');
    const provider = searchParams.get('provider');
    const message = searchParams.get('message');

    if (calendarResult === 'success') {
      setCalendarMessage({
        type: 'success',
        text: `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar connected successfully!`,
      });
      // Clear URL params
      router.replace('/settings');
    } else if (calendarResult === 'error') {
      setCalendarMessage({
        type: 'error',
        text: message || 'Failed to connect calendar',
      });
      router.replace('/settings');
    }

    // Clear message after 5 seconds
    if (calendarResult) {
      setTimeout(() => setCalendarMessage(null), 5000);
    }
  }

  async function loadMfaStatus() {
    try {
      const response = await fetch('/api/user/mfa');
      const data = await response.json();
      
      if (data.success) {
        setMfaEnabled(data.mfaEnabled);
        setMfaVerifiedAt(data.mfaVerifiedAt);
      }
    } catch (err) {
      console.error('Failed to load MFA status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendarStatus() {
    try {
      const response = await fetch('/api/calendar');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setCalendarStatus(data);
    } catch (err) {
      console.error('Failed to load calendar status:', err);
    }
  }

  async function connectCalendar(provider: 'google' | 'microsoft') {
    setCalendarLoading(provider);
    
    try {
      const response = await fetch(`/api/calendar/${provider}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to connect ${provider} calendar`);
      }
      
      // Redirect to OAuth
      window.location.href = data.authUrl;
    } catch (err: any) {
      setCalendarMessage({
        type: 'error',
        text: err.message || `Failed to connect ${provider} calendar`,
      });
      setCalendarLoading(null);
    }
  }

  async function disconnectCalendar(provider: 'google' | 'microsoft') {
    if (!confirm(`Are you sure you want to disconnect your ${provider === 'google' ? 'Google' : 'Microsoft'} Calendar?`)) {
      return;
    }

    setCalendarLoading(provider);
    
    try {
      const response = await fetch('/api/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect calendar');
      }
      
      setCalendarStatus(prev => ({
        ...prev,
        [provider]: { connected: false },
      }));
      
      setCalendarMessage({
        type: 'success',
        text: `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar disconnected`,
      });
    } catch (err: any) {
      setCalendarMessage({
        type: 'error',
        text: err.message || 'Failed to disconnect calendar',
      });
    } finally {
      setCalendarLoading(null);
    }
  }

  async function startMfaSetup() {
    setSetupLoading(true);
    setSetupError('');

    try {
      const response = await fetch('/api/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });

      const data = await response.json();

      if (data.success) {
        setMfaSecret(data.secret);
        setOtpauthUrl(data.otpauthUrl);
        setShowMfaSetup(true);
        setSetupStep('qr');
      } else {
        setSetupError(data.error || 'Failed to start MFA setup');
      }
    } catch (err) {
      setSetupError('Network error');
    } finally {
      setSetupLoading(false);
    }
  }

  async function verifyMfa() {
    if (verifyCode.length !== 6) return;

    setSetupLoading(true);
    setSetupError('');

    try {
      const response = await fetch('/api/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: verifyCode }),
      });

      const data = await response.json();

      if (data.success) {
        setMfaEnabled(true);
        setMfaVerifiedAt(new Date().toISOString());
        setShowMfaSetup(false);
        setVerifyCode('');
      } else {
        setSetupError(data.error || 'Verification failed');
      }
    } catch (err) {
      setSetupError('Network error');
    } finally {
      setSetupLoading(false);
    }
  }

  async function disableMfa() {
    if (!disablePassword) return;

    setDisableLoading(true);
    setDisableError('');

    try {
      const response = await fetch('/api/user/mfa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await response.json();

      if (data.success) {
        setMfaEnabled(false);
        setMfaVerifiedAt(null);
        setShowDisable(false);
        setDisablePassword('');
      } else {
        setDisableError(data.error || 'Failed to disable MFA');
      }
    } catch (err) {
      setDisableError('Network error');
    } finally {
      setDisableLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(mfaSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        {/* Calendar Message Toast */}
        {calendarMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            calendarMessage.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {calendarMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{calendarMessage.text}</span>
            <button 
              onClick={() => setCalendarMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{session?.user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-gray-900">{session?.user?.name || 'Not set'}</p>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Security</h2>

          {/* MFA */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${mfaEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                {mfaEnabled ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : (
                  <Shield className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Two-Factor Authentication (2FA)</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {mfaEnabled 
                    ? `Enabled since ${new Date(mfaVerifiedAt!).toLocaleDateString()}`
                    : 'Add an extra layer of security to your account'
                  }
                </p>
              </div>
            </div>
            <div>
              {mfaEnabled ? (
                <button
                  onClick={() => setShowDisable(true)}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={startMfaSetup}
                  disabled={setupLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center gap-2"
                >
                  {setupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Enable 2FA
                </button>
              )}
            </div>
          </div>

          {setupError && !showMfaSetup && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {setupError}
            </div>
          )}
        </div>

        {/* Calendar Integrations Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Calendar Integrations</h2>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            Connect your calendar to sync property showings, maintenance appointments, lease signings, and rent reminders.
          </p>

          <div className="space-y-4">
            {/* Google Calendar */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <GoogleIcon />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Google Calendar</h3>
                  {calendarStatus.google.connected ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Connected as {calendarStatus.google.email}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Not connected</p>
                  )}
                </div>
              </div>
              <div>
                {calendarStatus.google.connected ? (
                  <button
                    onClick={() => disconnectCalendar('google')}
                    disabled={calendarLoading === 'google'}
                    className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition text-sm font-medium flex items-center gap-2"
                  >
                    {calendarLoading === 'google' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connectCalendar('google')}
                    disabled={calendarLoading === 'google'}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
                  >
                    {calendarLoading === 'google' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* Microsoft Calendar */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <MicrosoftIcon />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Microsoft Outlook</h3>
                  {calendarStatus.microsoft.connected ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Connected as {calendarStatus.microsoft.email}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Not connected</p>
                  )}
                </div>
              </div>
              <div>
                {calendarStatus.microsoft.connected ? (
                  <button
                    onClick={() => disconnectCalendar('microsoft')}
                    disabled={calendarLoading === 'microsoft'}
                    className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition text-sm font-medium flex items-center gap-2"
                  >
                    {calendarLoading === 'microsoft' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connectCalendar('microsoft')}
                    disabled={calendarLoading === 'microsoft'}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
                  >
                    {calendarLoading === 'microsoft' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Calendar Features Info */}
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
            <h4 className="font-medium text-indigo-900 mb-2">What syncs to your calendar?</h4>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• Property showings with prospective tenants</li>
              <li>• Maintenance appointments</li>
              <li>• Lease signing meetings</li>
              <li>• Rent due date reminders</li>
              <li>• Lease expiration notifications</li>
              <li>• Property inspections (move-in, move-out, HQS)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MFA Setup Modal */}
      {showMfaSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Enable Two-Factor Authentication</h2>
              <button onClick={() => setShowMfaSetup(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {setupStep === 'qr' ? (
                <>
                  <p className="text-gray-600 text-sm mb-6">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>

                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                      {otpauthUrl && (
                        <QRCodeSVG
                          value={otpauthUrl}
                          size={200}
                          level="M"
                          includeMargin={true}
                        />
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-xs text-gray-500 mb-2">Or enter this code manually:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border break-all">
                        {mfaSecret}
                      </code>
                      <button
                        onClick={copySecret}
                        className={`p-2 rounded transition ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setSetupStep('verify')}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                  >
                    Continue
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-sm mb-6">
                    Enter the 6-digit code from your authenticator app to verify.
                  </p>

                  {setupError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      {setupError}
                    </div>
                  )}

                  <div className="mb-6">
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSetupStep('qr')}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={verifyMfa}
                      disabled={setupLoading || verifyCode.length !== 6}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                    >
                      {setupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Verify
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disable MFA Modal */}
      {showDisable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Disable Two-Factor Authentication</h2>
              <button onClick={() => setShowDisable(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-3 mb-6 p-4 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Disabling 2FA will make your account less secure. You'll need to enter your password to confirm.
                </p>
              </div>

              {disableError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {disableError}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm your password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDisable(false);
                    setDisablePassword('');
                    setDisableError('');
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={disableMfa}
                  disabled={disableLoading || !disablePassword}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                >
                  {disableLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  Disable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
