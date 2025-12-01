'use client';

import { useState } from 'react';
import { Settings, Save, Loader2, AlertTriangle, Check } from 'lucide-react';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Placeholder settings
  const [settings, setSettings] = useState({
    platformName: 'RentalIQ',
    supportEmail: 'support@rentaliq.com',
    maintenanceMode: false,
    allowSignups: true,
    requireEmailVerification: true,
    defaultTrialDays: 14,
    applicationFee: 50,
  });

  async function saveSettings() {
    setSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Platform configuration and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saved ? (
            <Check className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform Name</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* Access Control */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Access Control</h2>
          <div className="space-y-4">
            <ToggleSetting
              label="Maintenance Mode"
              description="Disable access to the platform for non-admin users"
              enabled={settings.maintenanceMode}
              onChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
              warning
            />
            <ToggleSetting
              label="Allow New Signups"
              description="Allow new users to create accounts"
              enabled={settings.allowSignups}
              onChange={(v) => setSettings({ ...settings, allowSignups: v })}
            />
            <ToggleSetting
              label="Require Email Verification"
              description="Users must verify email before accessing the platform"
              enabled={settings.requireEmailVerification}
              onChange={(v) => setSettings({ ...settings, requireEmailVerification: v })}
            />
          </div>
        </div>

        {/* Billing Settings */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Billing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default Trial Days</label>
              <input
                type="number"
                value={settings.defaultTrialDays}
                onChange={(e) => setSettings({ ...settings, defaultTrialDays: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Application Fee ($)</label>
              <input
                type="number"
                value={settings.applicationFee}
                onChange={(e) => setSettings({ ...settings, applicationFee: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-gray-900 rounded-xl border border-red-900/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <p className="text-white font-medium">Reset All Feature Flags</p>
                <p className="text-sm text-gray-500">Reset all features to default settings</p>
              </div>
              <button className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors">
                Reset
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <p className="text-white font-medium">Clear Audit Logs</p>
                <p className="text-sm text-gray-500">Delete all audit log entries</p>
              </div>
              <button className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors">
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
  warning,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
      <div>
        <p className={`font-medium ${warning && enabled ? 'text-orange-400' : 'text-white'}`}>{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled 
            ? warning 
              ? 'bg-orange-500' 
              : 'bg-green-500' 
            : 'bg-gray-700'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
