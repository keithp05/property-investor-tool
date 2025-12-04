'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Check, X, AlertTriangle } from 'lucide-react';

export default function TestLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function testLogin() {
    if (!email || !password) return;
    
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Test failed');
        setResult(data);
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function getUserInfo() {
    if (!email) return;
    
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/test-login?email=${encodeURIComponent(email)}`);

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      setResult(data);
      
      if (!data.success) {
        setError(data.error || 'Failed to get user info');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin/users"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Password Test Tool</h1>
          <p className="text-gray-400">Debug login issues for users</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password to Test</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono"
            placeholder="Enter password from email or modal"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={getUserInfo}
            disabled={loading || !email}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Get User Info
          </button>
          <button
            onClick={testLogin}
            disabled={loading || !email || !password}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Test Password
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.loginWouldWork !== undefined && (
              <div className={`p-4 rounded-lg border ${result.loginWouldWork ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                <div className="flex items-center gap-3">
                  {result.loginWouldWork ? (
                    <Check className="h-6 w-6 text-green-400" />
                  ) : (
                    <X className="h-6 w-6 text-red-400" />
                  )}
                  <div>
                    <p className={`font-semibold ${result.loginWouldWork ? 'text-green-400' : 'text-red-400'}`}>
                      {result.loginWouldWork ? 'Password is CORRECT' : 'Password is WRONG'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {result.loginWouldWork ? 'This password should work for login' : 'This password will not work for login'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Debug Info</h3>
              <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(result.debug || result.user || result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
        <h3 className="text-sm font-medium text-yellow-400 mb-2">How to use this tool:</h3>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
          <li>Enter the user's email address</li>
          <li>Click "Get User Info" to verify the user exists</li>
          <li>Enter the password from the reset email or modal</li>
          <li>Click "Test Password" to verify it matches</li>
        </ol>
      </div>
    </div>
  );
}
