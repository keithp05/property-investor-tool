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
 * GET /api/admin/users/[userId]
 * Get user details and features
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

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

    // Get user feature overrides from the database
    let featureOverrides: Record<string, boolean> = {};
    
    try {
      const overrides = await prisma.userFeatureOverride.findMany({
        where: { userId },
      });
      featureOverrides = Object.fromEntries(overrides.map(o => [o.featureKey, o.enabled]));
    } catch (e: any) {
      // Table might not exist yet if migration hasn't run
      console.log('UserFeatureOverride table not available:', e.message);
    }

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
 * PATCH /api/admin/users/[userId]
 * Update feature overrides for a user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
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
      select: { id: true, email: true, subscriptionTier: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if this matches the tier default - if so, remove the override
    const enabledByTier = isFeatureEnabledByTier(featureKey, user.subscriptionTier);
    
    if (enabled === enabledByTier) {
      // Remove the override since it matches the default
      try {
        await prisma.userFeatureOverride.delete({
          where: {
            userId_featureKey: { userId, featureKey }
          }
        });
        console.log(`Removed override for ${user.email} - ${featureKey} (matches tier default)`);
      } catch (e: any) {
        // Override might not exist, that's fine
        if (e.code !== 'P2025') {
          throw e;
        }
      }
    } else {
      // Upsert the override
      await prisma.userFeatureOverride.upsert({
        where: {
          userId_featureKey: { userId, featureKey }
        },
        create: {
          userId,
          featureKey,
          enabled,
        },
        update: {
          enabled,
        },
      });
      console.log(`Set override for ${user.email} - ${featureKey} = ${enabled}`);
    }

    return NextResponse.json({
      success: true,
      message: `Feature ${featureKey} set to ${enabled} for ${user.email}`,
    });

  } catch (error: any) {
    console.error('Update user features error:', error);
    
    // Check if it's a table doesn't exist error
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'Feature overrides table not found. Please run database migrations.',
        debug: error.message,
      }, { status: 500 });
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update user features', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Remove all feature overrides for a user (reset to tier defaults)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Delete all overrides for this user
    const result = await prisma.userFeatureOverride.deleteMany({
      where: { userId }
    });

    console.log(`Removed ${result.count} feature overrides for ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Removed ${result.count} feature overrides for ${user.email}`,
    });

  } catch (error: any) {
    console.error('Delete user features error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset user features', debug: error.message },
      { status: 500 }
    );
  }
}
