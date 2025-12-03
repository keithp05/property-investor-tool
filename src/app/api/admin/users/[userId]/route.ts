import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';

// Default features available in the system
const ALL_FEATURES = [
  // Core Features (Free)
  { key: 'properties', name: 'Property Management', category: 'CORE', defaultTier: 'FREE' },
  { key: 'documents', name: 'Document Storage', category: 'CORE', defaultTier: 'FREE' },
  { key: 'photos', name: 'Property Photos', category: 'CORE', defaultTier: 'FREE' },
  { key: 'tenant_applications', name: 'Tenant Applications', category: 'CORE', defaultTier: 'FREE' },
  { key: 'tenant_portal', name: 'Tenant Portal', category: 'CORE', defaultTier: 'FREE' },
  { key: 'maintenance_requests', name: 'Maintenance Requests', category: 'CORE', defaultTier: 'FREE' },
  { key: 'dashboard_analytics', name: 'Dashboard Analytics', category: 'CORE', defaultTier: 'FREE' },
  { key: 'section8_lookup', name: 'Section 8 Lookup', category: 'CORE', defaultTier: 'FREE' },
  
  // Premium Features (Pro)
  { key: 'ai_analysis', name: 'AI Property Analysis', category: 'PREMIUM', defaultTier: 'PRO' },
  { key: 'lenders', name: 'Lender Management', category: 'PREMIUM', defaultTier: 'PRO' },
  { key: 'pro_marketplace', name: 'Pro Marketplace', category: 'PREMIUM', defaultTier: 'PRO' },
  { key: 'plaid_integration', name: 'Bank Integration (Plaid)', category: 'PREMIUM', defaultTier: 'PRO' },
  { key: 'rent_collection', name: 'Online Rent Collection', category: 'PREMIUM', defaultTier: 'PRO' },
  { key: 'background_checks', name: 'Background Checks', category: 'PREMIUM', defaultTier: 'PRO' },
  
  // Enterprise Features
  { key: 'quickbooks_sync', name: 'QuickBooks Integration', category: 'ENTERPRISE', defaultTier: 'ENTERPRISE' },
  { key: 'accounting_sync', name: 'Accounting Sync', category: 'ENTERPRISE', defaultTier: 'ENTERPRISE' },
  { key: 'advanced_reports', name: 'Advanced Reports', category: 'ENTERPRISE', defaultTier: 'ENTERPRISE' },
  { key: 'api_access', name: 'API Access', category: 'ENTERPRISE', defaultTier: 'ENTERPRISE' },
  { key: 'white_label', name: 'White Label', category: 'ENTERPRISE', defaultTier: 'ENTERPRISE' },
  { key: 'multi_company', name: 'Multi-Company Support', category: 'ENTERPRISE', defaultTier: 'ENTERPRISE' },
];

// Determine if a feature is enabled by default based on user's tier
function isFeatureEnabledByTier(featureKey: string, userTier: string): boolean {
  const feature = ALL_FEATURES.find(f => f.key === featureKey);
  if (!feature) return false;
  
  const tierOrder = ['FREE', 'PRO', 'ENTERPRISE'];
  const userTierIndex = tierOrder.indexOf(userTier);
  const featureTierIndex = tierOrder.indexOf(feature.defaultTier);
  
  return userTierIndex >= featureTierIndex;
}

/**
 * GET /api/admin/users/[userId]/features
 * Get features for a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;

    // Get user with their subscription tier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Try to get user feature overrides from a JSON field or separate table
    // For now, we'll use defaults based on tier
    let featureOverrides: Record<string, boolean> = {};
    
    // TODO: Once migration is done, fetch from UserFeatureOverride table
    // try {
    //   const overrides = await prisma.userFeatureOverride.findMany({
    //     where: { userId },
    //   });
    //   featureOverrides = Object.fromEntries(overrides.map(o => [o.featureKey, o.enabled]));
    // } catch (e) {
    //   console.log('UserFeatureOverride table not available');
    // }

    // Build feature list with enabled status
    const features = ALL_FEATURES.map(feature => {
      const enabledByTier = isFeatureEnabledByTier(feature.key, user.subscriptionTier);
      const hasOverride = feature.key in featureOverrides;
      const enabled = hasOverride ? featureOverrides[feature.key] : enabledByTier;
      
      return {
        ...feature,
        enabled,
        enabledByTier,
        hasOverride,
        overrideValue: hasOverride ? featureOverrides[feature.key] : null,
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
      },
      features,
      note: 'Feature overrides require database migration. Currently showing tier-based defaults.',
    });

  } catch (error: any) {
    console.error('Get user features error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user features', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[userId]/features
 * Update feature overrides for a user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const { featureKey, enabled } = await request.json();

    if (!featureKey || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'featureKey and enabled (boolean) are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // TODO: Once migration is done, save to UserFeatureOverride table
    // await prisma.userFeatureOverride.upsert({
    //   where: { userId_featureKey: { userId, featureKey } },
    //   create: { userId, featureKey, enabled },
    //   update: { enabled },
    // });

    // For now, return a message indicating the limitation
    console.log(`Feature override requested: ${user.email} - ${featureKey} = ${enabled}`);

    return NextResponse.json({
      success: true,
      message: `Feature ${featureKey} set to ${enabled} for ${user.email}`,
      warning: 'Feature overrides require database migration. This change will not persist until migration is complete.',
    });

  } catch (error: any) {
    console.error('Update user features error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user features', debug: error.message },
      { status: 500 }
    );
  }
}
