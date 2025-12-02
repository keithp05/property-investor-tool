import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';

// Default features
const DEFAULT_FEATURES = [
  { key: 'properties', name: 'Property Management', description: 'Add and manage rental properties', category: 'CORE', enabled: true },
  { key: 'documents', name: 'Document Storage', description: 'Upload and manage property documents', category: 'CORE', enabled: true },
  { key: 'photos', name: 'Photo Management', description: 'Upload property photos', category: 'CORE', enabled: true },
  { key: 'tenant_applications', name: 'Tenant Applications', description: 'Generate and manage rental applications', category: 'CORE', enabled: true },
  { key: 'lenders', name: 'Lender Directory', description: 'Track and manage lender contacts', category: 'PREMIUM', enabled: false },
  { key: 'ai_analysis', name: 'AI Property Analysis', description: '5-expert AI analysis for properties', category: 'PREMIUM', enabled: true },
  { key: 'pro_marketplace', name: 'Service Pro Marketplace', description: 'Connect with service professionals', category: 'PREMIUM', enabled: false },
  { key: 'plaid_integration', name: 'Bank Account Linking', description: 'Link bank accounts via Plaid', category: 'PREMIUM', enabled: false },
  { key: 'quickbooks_sync', name: 'QuickBooks Integration', description: 'Sync with QuickBooks', category: 'ENTERPRISE', enabled: false },
  { key: 'tenant_portal', name: 'Tenant Portal', description: 'Tenant self-service portal', category: 'CORE', enabled: true },
  { key: 'maintenance_requests', name: 'Maintenance Requests', description: 'Submit and track maintenance', category: 'CORE', enabled: true },
  { key: 'rent_collection', name: 'Online Rent Collection', description: 'Collect rent online via Stripe', category: 'PREMIUM', enabled: false },
  { key: 'background_checks', name: 'Background Checks', description: 'Run tenant background checks', category: 'PREMIUM', enabled: false },
  { key: 'dashboard_analytics', name: 'Dashboard Analytics', description: 'Net worth and portfolio analytics', category: 'CORE', enabled: true },
  { key: 'section8_lookup', name: 'Section 8 Info', description: 'Section 8 HUD information lookup', category: 'CORE', enabled: true },
];

/**
 * GET /api/admin/features
 * Get all feature flags
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get features from FeatureFlag table, fall back to defaults
    let features: any[] = [];
    let usingDefaults = false;

    try {
      features = await prisma.featureFlag.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    } catch (e) {
      // Table doesn't exist, use defaults
      console.log('FeatureFlag table not found, using defaults');
      usingDefaults = true;
      features = DEFAULT_FEATURES.map((f, i) => ({
        id: `default-${i}`,
        ...f,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    // If table exists but empty, seed it
    if (!usingDefaults && features.length === 0) {
      console.log('Seeding default feature flags...');
      for (const feature of DEFAULT_FEATURES) {
        try {
          await prisma.featureFlag.create({ data: feature });
        } catch (e) {
          console.error('Failed to seed feature:', feature.key);
        }
      }
      features = await prisma.featureFlag.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    }

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const feature of features) {
      const cat = feature.category || 'OTHER';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(feature);
    }

    return NextResponse.json({
      success: true,
      features,
      byCategory,
      usingDefaults,
    });

  } catch (error: any) {
    console.error('Admin features list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get features', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/features
 * Update a feature flag
 */
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, key, enabled, ...updates } = body;

    if (!id && !key) {
      return NextResponse.json({ success: false, error: 'Feature ID or key is required' }, { status: 400 });
    }

    try {
      const feature = await prisma.featureFlag.update({
        where: id ? { id } : { key },
        data: { enabled, ...updates },
      });

      return NextResponse.json({
        success: true,
        feature,
      });
    } catch (e: any) {
      // Table might not exist
      return NextResponse.json({
        success: false,
        error: 'FeatureFlag table not migrated. Run database migration first.',
        debug: e.message,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Admin feature update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feature', debug: error.message },
      { status: 500 }
    );
  }
}
