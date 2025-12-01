'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, AlertCircle, Key } from 'lucide-react';

export default function VerifyMfaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    
    if (!useBackupCode && code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (err) {
      setError('Failed to verify');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verify MFA</h1>
          <p className="text-gray-400 mt-2">
            {useBackupCode 
              ? 'Enter one of your backup codes' 
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <form onSubmit={handleVerify} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            {useBackupCode ? (
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-xl font-mono tracking-widest placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl font-mono tracking-widest placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={6}
                autoFocus
              />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!useBackupCode && code.length !== 6)}
            className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
              setError('');
            }}
            className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code instead'}
          </button>
        </form>

        <button
          onClick={() => router.push('/admin/login')}
          className="w-full mt-6 text-gray-500 hover:text-gray-400 text-sm transition-colors"
        >
          ← Back to admin login
        </button>
      </div>
    </div>
  );
}
