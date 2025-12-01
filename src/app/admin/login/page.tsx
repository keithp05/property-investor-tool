'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Loader2, Smartphone, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type Step = 'password' | 'mfa-setup' | 'mfa-verify';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Password step
  const [password, setPassword] = useState('');
  
  // MFA setup step
  const [mfaSecret, setMfaSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [copied, setCopied] = useState(false);
  
  // MFA verify step
  const [mfaCode, setMfaCode] = useState('');

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.needsMfaSetup) {
        // Need to set up MFA
        await setupMfa();
      } else {
        // MFA already set up, go to verify
        setStep('mfa-verify');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  async function setupMfa() {
    try {
      const res = await fetch('/api/admin/mfa/setup', {
        method: 'POST',
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'MFA setup failed');
        return;
      }

      setMfaSecret(data.secret);
      setOtpauthUri(data.otpauthUri);
      setStep('mfa-setup');
    } catch (err) {
      setError('MFA setup error');
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Verification failed');
        return;
      }

      // Success! Redirect to admin
      router.push('/admin');
    } catch (err) {
      setError('Verification error');
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(mfaSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-gray-500 mt-1">RentalIQ System Administration</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    Continue
                  </>
                )}
              </button>
            </form>
          )}

          {/* MFA Setup Step */}
          {step === 'mfa-setup' && (
            <div className="space-y-6">
              <div className="text-center">
                <Smartphone className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-white">Set Up Two-Factor Authentication</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={otpauthUri} size={180} />
                </div>
              </div>

              {/* Manual Entry */}
              <div>
                <p className="text-xs text-gray-500 text-center mb-2">
                  Or enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm text-purple-400 font-mono break-all">
                    {mfaSecret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Verify Code */}
              <form onSubmit={handleMfaVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter 6-digit code from app
                  </label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest font-mono placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={6}
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* MFA Verify Step (existing setup) */}
          {step === 'mfa-verify' && (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center mb-4">
                <Smartphone className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-white">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Enter the code from your authenticator app
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest font-mono placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('password');
                  setPassword('');
                  setMfaCode('');
                  setError('');
                }}
                className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Back to password
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Protected by two-factor authentication
        </p>
      </div>
    </div>
  );
}
