'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, Shield, ShieldCheck, ShieldOff, Key, 
  Eye, EyeOff, X, Check, AlertTriangle, Copy, CheckCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<string | null>(null);

  // MFA Setup
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify'>('qr');
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
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
    }
  }, [status]);

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
        setQrCodeUrl(data.qrCodeUrl);
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-lg border" />
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
