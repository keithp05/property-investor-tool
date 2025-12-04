'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, Shield, ArrowLeft, Mail } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'mfa' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string | null } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid link - no token provided');
      return;
    }

    verifyToken();
  }, [token]);

  async function verifyToken() {
    try {
      const response = await fetch(`/api/auth/magic-link/verify?token=${token}`);
      const data = await response.json();

      if (!data.success) {
        setStatus('error');
        setError(data.error || 'Invalid or expired link');
        return;
      }

      setUserInfo({ email: data.email, name: data.name });

      if (data.mfaRequired) {
        setStatus('mfa');
      } else {
        // No MFA required, complete sign in
        await completeSignIn();
      }
    } catch (err: any) {
      setStatus('error');
      setError('Failed to verify link. Please try again.');
    }
  }

  async function completeSignIn(mfaCodeValue?: string) {
    setSubmitting(true);
    
    try {
      const result = await signIn('magic-link', {
        token,
        mfaCode: mfaCodeValue || '',
        redirect: false,
      });

      if (result?.error) {
        if (status === 'mfa') {
          setError('Invalid verification code');
          setSubmitting(false);
          return;
        }
        setStatus('error');
        setError('Authentication failed. Please request a new link.');
        return;
      }

      setStatus('success');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setError('Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!mfaCode || mfaCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    await completeSignIn(mfaCode);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-500 mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Verifying your link...</h1>
            <p className="text-gray-600">Please wait while we verify your sign-in link.</p>
          </div>
        )}

        {/* MFA Required State */}
        {status === 'mfa' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center">
              <Shield className="h-12 w-12 mx-auto text-white mb-3" />
              <h1 className="text-xl font-semibold text-white">Two-Factor Authentication</h1>
            </div>
            
            <div className="p-8">
              {userInfo && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{userInfo.name || 'User'}</p>
                    <p className="text-sm text-gray-500">{userInfo.email}</p>
                  </div>
                </div>
              )}

              <p className="text-gray-600 mb-6">
                Enter the 6-digit code from your authenticator app to complete sign in.
              </p>

              <form onSubmit={handleMfaSubmit}>
                <div className="mb-4">
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || mfaCode.length !== 6}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">You're signed in!</h1>
            <p className="text-gray-600 mb-4">Redirecting you to your dashboard...</p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Invalid or Expired</h1>
              <p className="text-gray-600">{error || 'This sign-in link is no longer valid.'}</p>
            </div>

            <div className="space-y-3">
              <Link
                href="/login?method=magic-link"
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Mail className="h-5 w-5" />
                Request New Link
              </Link>
              <Link
                href="/login"
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
