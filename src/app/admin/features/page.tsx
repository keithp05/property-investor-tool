'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X, Check, Trash2 } from 'lucide-react';

interface Feature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  enabledForFree: boolean;
  enabledForPro: boolean;
  enabledForEnterprise: boolean;
  enabledForLandlords: boolean;
  enabledForTenants: boolean;
  enabledForPros: boolean;
  freeTierLimit: number | null;
  proTierLimit: number | null;
  enterpriseTierLimit: number | null;
  category: string | null;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeature, setNewFeature] = useState({
    key: '',
    name: '',
    description: '',
    category: 'CORE',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  async function loadFeatures() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/features');
      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
      }
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFeature(featureId: string, field: string, value: boolean) {
    try {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: featureId, [field]: value }),
      });
      
      if (response.ok) {
        // Update local state immediately
        setFeatures(features.map(f => 
          f.id === featureId ? { ...f, [field]: value } : f
        ));
      }
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    }
  }

  async function addFeature() {
    if (!newFeature.key || !newFeature.name) {
      alert('Key and name are required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeature),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowAddModal(false);
        setNewFeature({ key: '', name: '', description: '', category: 'CORE' });
        loadFeatures();
      } else {
        alert('Failed to add feature: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to add feature:', err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteFeature(featureId: string) {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
      const response = await fetch(`/api/admin/features?id=${featureId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadFeatures();
      }
    } catch (err) {
      console.error('Failed to delete feature:', err);
    }
  }

  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    const cat = feature.category || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const categoryOrder = ['CORE', 'PREMIUM', 'ENTERPRISE', 'BETA', 'OTHER'];
  const sortedCategories = Object.keys(groupedFeatures).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Feature Flags</h1>
          <p className="text-gray-400">Control feature access by tier and role</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Feature
        </button>
      </div>

      {/* Features by Category */}
      <div className="space-y-8">
        {sortedCategories.map((category) => (
          <div key={category}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CategoryBadge category={category} />
              {category} Features
            </h2>
            <div className="space-y-4">
              {groupedFeatures[category].map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  onToggle={toggleFeature}
                  onDelete={deleteFeature}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Feature Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Add Feature Flag</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Key (unique identifier)</label>
                <input
                  type="text"
                  value={newFeature.key}
                  onChange={(e) => setNewFeature({ ...newFeature, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., advanced_analytics"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                <input
                  type="text"
                  value={newFeature.name}
                  onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                  placeholder="e.g., Advanced Analytics"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                  placeholder="What does this feature do?"
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={newFeature.category}
                  onChange={(e) => setNewFeature({ ...newFeature, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="CORE">Core</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="BETA">Beta</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addFeature}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Feature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ 
  feature, 
  onToggle, 
  onDelete 
}: { 
  feature: Feature; 
  onToggle: (id: string, field: string, value: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-white">{feature.name}</h3>
            <code className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{feature.key}</code>
          </div>
          {feature.description && (
            <p className="text-sm text-gray-500">{feature.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Master Toggle */}
          <Toggle
            enabled={feature.isEnabled}
            onChange={(v) => onToggle(feature.id, 'isEnabled', v)}
            label="Enabled"
          />
          <button
            onClick={() => onDelete(feature.id)}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tier Toggles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-800">
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase">By Tier</p>
          <Checkbox
            checked={feature.enabledForFree}
            onChange={(v) => onToggle(feature.id, 'enabledForFree', v)}
            label="Free"
          />
          <Checkbox
            checked={feature.enabledForPro}
            onChange={(v) => onToggle(feature.id, 'enabledForPro', v)}
            label="Pro"
          />
          <Checkbox
            checked={feature.enabledForEnterprise}
            onChange={(v) => onToggle(feature.id, 'enabledForEnterprise', v)}
            label="Enterprise"
          />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase">By Role</p>
          <Checkbox
            checked={feature.enabledForLandlords}
            onChange={(v) => onToggle(feature.id, 'enabledForLandlords', v)}
            label="Landlords"
          />
          <Checkbox
            checked={feature.enabledForTenants}
            onChange={(v) => onToggle(feature.id, 'enabledForTenants', v)}
            label="Tenants"
          />
          <Checkbox
            checked={feature.enabledForPros}
            onChange={(v) => onToggle(feature.id, 'enabledForPros', v)}
            label="Service Pros"
          />
        </div>
        {(feature.freeTierLimit || feature.proTierLimit) && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Limits</p>
            {feature.freeTierLimit && (
              <p className="text-sm text-gray-400">Free: <span className="text-white">{feature.freeTierLimit}</span></p>
            )}
            {feature.proTierLimit && (
              <p className="text-sm text-gray-400">Pro: <span className="text-white">{feature.proTierLimit}</span></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ 
  enabled, 
  onChange, 
  label 
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void; 
  label?: string;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-700'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function Checkbox({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean; 
  onChange: (v: boolean) => void; 
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-500"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    CORE: 'bg-blue-500/20 text-blue-400',
    PREMIUM: 'bg-purple-500/20 text-purple-400',
    ENTERPRISE: 'bg-yellow-500/20 text-yellow-400',
    BETA: 'bg-orange-500/20 text-orange-400',
    OTHER: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[category] || styles.OTHER}`}>
      {category}
    </span>
  );
}
