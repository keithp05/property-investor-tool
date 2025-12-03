'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, RefreshCw, Check, X, DollarSign, Crown, Zap } from 'lucide-react';

interface Feature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  enabled: boolean;
  tier?: string;
  isPaid?: boolean;
  price?: number;
}

export default function FeaturesPage() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, Feature[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  async function loadFeatures() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/features');
      
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features || []);
        setByCategory(data.byCategory || {});
        setUsingDefaults(data.usingDefaults || false);
      } else {
        setError(data.error || 'Failed to load features');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFeature(feature: Feature) {
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: feature.id, 
          key: feature.key,
          enabled: !feature.enabled 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setFeatures(features.map(f => 
          f.id === feature.id ? { ...f, enabled: !f.enabled } : f
        ));
        setMessage(`${feature.name} ${!feature.enabled ? 'enabled' : 'disabled'}`);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(`Failed to update: ${err.message}`);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Feature Flags</h1>
        <p className="text-gray-400">Control feature access by subscription tier</p>
      </div>

      {/* Using Defaults Warning */}
      {usingDefaults && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 text-sm">
            ⚠️ Using default feature configuration. Database migration required for persistent changes.
          </p>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 mb-6">
          <p className="text-green-400 text-sm">{message}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400">{error}</p>
              <button onClick={loadFeatures} className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded text-sm">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* CORE Features - Free Tier */}
          <FeatureSection 
            title="Core Features" 
            subtitle="Included in Free tier"
            icon={<Check className="h-5 w-5" />}
            color="blue"
            features={byCategory['CORE'] || []}
            onToggle={toggleFeature}
            readOnly={usingDefaults}
          />

          {/* PREMIUM Features - Pro Tier */}
          <FeatureSection 
            title="Premium Features" 
            subtitle="Pro tier ($29/mo)"
            icon={<Zap className="h-5 w-5" />}
            color="purple"
            features={byCategory['PREMIUM'] || []}
            onToggle={toggleFeature}
            readOnly={usingDefaults}
          />

          {/* ENTERPRISE Features - Paid Add-ons */}
          <FeatureSection 
            title="Enterprise Add-ons" 
            subtitle="Optional paid features"
            icon={<DollarSign className="h-5 w-5" />}
            color="yellow"
            features={byCategory['ENTERPRISE'] || []}
            onToggle={toggleFeature}
            readOnly={usingDefaults}
            showPricing
          />
        </div>
      )}
    </div>
  );
}

function FeatureSection({
  title,
  subtitle,
  icon,
  color,
  features,
  onToggle,
  readOnly,
  showPricing,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'yellow';
  features: Feature[];
  onToggle: (f: Feature) => void;
  readOnly?: boolean;
  showPricing?: boolean;
}) {
  const colors = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', iconBg: 'bg-yellow-500/20' },
  };
  const c = colors[color];

  if (features.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${c.iconBg} ${c.text}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Feature</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
              {showPricing && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {features.map((feature) => (
              <tr key={feature.id} className="hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{feature.name}</p>
                    <code className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-500">{feature.key}</code>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {feature.description}
                </td>
                {showPricing && (
                  <td className="px-4 py-3">
                    {feature.isPaid && feature.price ? (
                      <span className="text-yellow-400 font-medium">${feature.price}/mo</span>
                    ) : (
                      <span className="text-gray-500">Included</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => !readOnly && onToggle(feature)}
                    disabled={readOnly}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${feature.enabled ? 'bg-green-500' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      feature.enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
