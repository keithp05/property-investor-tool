'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, AlertCircle, CheckCircle, Copy, Check } from 'lucide-react';

export default function SetupMfaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [step, setStep] = useState<'setup' | 'backup' | 'verify'>('setup');

  useEffect(() => {
    generateMfaSecret();
  }, []);

  async function generateMfaSecret() {
    try {
      const response = await fetch('/api/admin/auth/setup-mfa', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setBackupCodes(data.backupCodes);
      } else {
        setError(data.error || 'Failed to generate MFA secret');
        if (data.redirect) {
          router.push(data.redirect);
        }
      }
    } catch (err) {
      setError('Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndEnable() {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const response = await fetch('/api/admin/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify code');
    } finally {
      setVerifying(false);
    }
  }

  function copyToClipboard(text: string, type: 'secret' | 'backup') {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">MFA Enabled!</h1>
          <p className="text-gray-400">Redirecting to admin portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set Up MFA</h1>
          <p className="text-gray-400 mt-2">
            Multi-factor authentication is required to access the admin portal
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['setup', 'backup', 'verify'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-purple-600 text-white' : 
                ['setup', 'backup', 'verify'].indexOf(step) > i ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500'
              }`}>
                {['setup', 'backup', 'verify'].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && <div className={`w-12 h-0.5 ${['setup', 'backup', 'verify'].indexOf(step) > i ? 'bg-green-600' : 'bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Scan QR Code */}
          {step === 'setup' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">1. Scan QR Code</h2>
                <p className="text-sm text-gray-400">
                  Use an authenticator app like Google Authenticator, Authy, or 1Password to scan this QR code.
                </p>
              </div>

              {qrCode && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl">
                    <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400 mb-2">Or enter this secret manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm text-purple-400 font-mono break-all">
                    {secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(secret, 'secret')}
                    className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedSecret ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('backup')}
                className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Save Backup Codes */}
          {step === 'backup' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">2. Save Backup Codes</h2>
                <p className="text-sm text-gray-400">
                  Save these backup codes in a secure place. You can use them to access your account if you lose your authenticator.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="px-3 py-2 bg-gray-700 rounded text-sm text-white font-mono text-center">
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={() => copyToClipboard(backupCodes.join('\n'), 'backup')}
                  className="w-full py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  {copiedBackup ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copiedBackup ? 'Copied!' : 'Copy All Codes'}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('setup')}
                  className="flex-1 py-3 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('verify')}
                  className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  I've Saved These
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Verify */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">3. Verify Setup</h2>
                <p className="text-sm text-gray-400">
                  Enter the 6-digit code from your authenticator app to complete setup.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl font-mono tracking-widest placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('backup')}
                  className="flex-1 py-3 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={verifyAndEnable}
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Enable MFA'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
