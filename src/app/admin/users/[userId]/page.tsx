'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowLeft, Check, X, AlertTriangle, 
  Crown, Shield, Zap, Package, ToggleLeft, ToggleRight,
  User, Building2, CreditCard, RefreshCw
} from 'lucide-react';

interface Feature {
  key: string;
  name: string;
  category: string;
  defaultTier: string;
  enabled: boolean;
  enabledByTier: boolean;
  hasOverride: boolean;
  overrideValue: boolean | null;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

export default function UserFeaturesPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUserFeatures();
  }, [userId]);

  async function loadUserFeatures() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setFeatures(data.features);
        if (data.note) {
          setMessage({ type: 'warning', text: data.note });
        }
      } else {
        setError(data.error || 'Failed to load user features');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFeature(featureKey: string, enabled: boolean) {
    setSaving(featureKey);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey, enabled }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setFeatures(features.map(f => 
          f.key === featureKey 
            ? { ...f, enabled, hasOverride: true, overrideValue: enabled }
            : f
        ));
        
        if (data.warning) {
          setMessage({ type: 'warning', text: data.warning });
        } else {
          setMessage({ type: 'success', text: data.message });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update feature' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setSaving(null);
    }
  }

  const coreFeatures = features.filter(f => f.category === 'CORE');
  const premiumFeatures = features.filter(f => f.category === 'PREMIUM');
  const enterpriseFeatures = features.filter(f => f.category === 'ENTERPRISE');

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-1">Error</h3>
              <p className="text-gray-300">{error}</p>
              <button 
                onClick={loadUserFeatures}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin/users"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">User Features</h1>
          <p className="text-gray-400">Manage feature access for this user</p>
        </div>
        <button
          onClick={loadUserFeatures}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* User Info Card */}
      {user && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{user.name || 'No name'}</h2>
                <p className="text-gray-400">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase mb-1">Role</p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  user.role === 'LANDLORD' ? 'bg-blue-500/20 text-blue-400' :
                  user.role === 'TENANT' ? 'bg-green-500/20 text-green-400' :
                  user.role === 'PRO' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase mb-1">Subscription</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.subscriptionTier === 'ENTERPRISE' ? 'bg-yellow-500/20 text-yellow-400' :
                    user.subscriptionTier === 'PRO' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {user.subscriptionTier}
                  </span>
                  {user.subscriptionStatus === 'ACTIVE' && (
                    <Crown className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' :
          message.type === 'warning' ? 'bg-yellow-900/20 border-yellow-800 text-yellow-400' :
          'bg-red-900/20 border-red-800 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Feature Sections */}
      <div className="space-y-6">
        {/* Core Features */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-white">Core Features</h3>
              <p className="text-xs text-gray-500">Included in Free tier</p>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {coreFeatures.map(feature => (
              <FeatureRow 
                key={feature.key}
                feature={feature}
                saving={saving === feature.key}
                onToggle={(enabled) => toggleFeature(feature.key, enabled)}
              />
            ))}
          </div>
        </div>

        {/* Premium Features */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
            <Zap className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="font-semibold text-white">Premium Features</h3>
              <p className="text-xs text-gray-500">Pro tier ($29/mo)</p>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {premiumFeatures.map(feature => (
              <FeatureRow 
                key={feature.key}
                feature={feature}
                saving={saving === feature.key}
                onToggle={(enabled) => toggleFeature(feature.key, enabled)}
              />
            ))}
          </div>
        </div>

        {/* Enterprise Features */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
            <Crown className="h-5 w-5 text-yellow-400" />
            <div>
              <h3 className="font-semibold text-white">Enterprise Features</h3>
              <p className="text-xs text-gray-500">Enterprise tier (Custom pricing)</p>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {enterpriseFeatures.map(feature => (
              <FeatureRow 
                key={feature.key}
                feature={feature}
                saving={saving === feature.key}
                onToggle={(enabled) => toggleFeature(feature.key, enabled)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ 
  feature, 
  saving, 
  onToggle 
}: { 
  feature: Feature; 
  saving: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-white font-medium">{feature.name}</p>
          {feature.hasOverride && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
              Override
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {feature.enabledByTier 
            ? `Included in ${feature.defaultTier} tier` 
            : `Requires ${feature.defaultTier} tier`
          }
        </p>
      </div>
      <button
        onClick={() => onToggle(!feature.enabled)}
        disabled={saving}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          feature.enabled ? 'bg-green-600' : 'bg-gray-700'
        } ${saving ? 'opacity-50' : ''}`}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
        ) : (
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            feature.enabled ? 'left-7' : 'left-1'
          }`} />
        )}
      </button>
    </div>
  );
}
