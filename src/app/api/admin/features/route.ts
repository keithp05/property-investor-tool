import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper to check if user is super admin
async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'SUPER_ADMIN';
}

// Helper to log admin actions
async function logAdminAction(adminId: string, adminEmail: string, action: string, targetType?: string, targetId?: string, details?: any) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        adminEmail,
        action,
        targetType,
        targetId,
        details,
      },
    });
  } catch (e) {
    console.error('Failed to log admin action:', e);
  }
}

// Default features to seed if none exist
const DEFAULT_FEATURES = [
  { key: 'properties', name: 'Property Management', description: 'Add and manage rental properties', category: 'CORE', enabledForFree: true, enabledForTenants: false, freeTierLimit: 2, proTierLimit: 25 },
  { key: 'documents', name: 'Document Storage', description: 'Upload and manage property documents', category: 'CORE', enabledForFree: true, enabledForTenants: true, freeTierLimit: 10, proTierLimit: 100 },
  { key: 'photos', name: 'Photo Management', description: 'Upload property photos', category: 'CORE', enabledForFree: true, enabledForTenants: false },
  { key: 'tenant_applications', name: 'Tenant Applications', description: 'Generate and manage rental applications', category: 'CORE', enabledForFree: true, enabledForTenants: true },
  { key: 'lenders', name: 'Lender Directory', description: 'Track and manage lender contacts', category: 'PREMIUM', enabledForFree: false, enabledForTenants: false },
  { key: 'ai_analysis', name: 'AI Property Analysis', description: '5-expert AI analysis for properties', category: 'PREMIUM', enabledForFree: false, enabledForTenants: false },
  { key: 'pro_marketplace', name: 'Service Pro Marketplace', description: 'Connect with service professionals', category: 'PREMIUM', enabledForFree: false, enabledForPros: true },
  { key: 'plaid_integration', name: 'Bank Account Linking', description: 'Link bank accounts via Plaid', category: 'PREMIUM', enabledForFree: false, enabledForTenants: false },
  { key: 'quickbooks_sync', name: 'QuickBooks Integration', description: 'Sync with QuickBooks', category: 'ENTERPRISE', enabledForFree: false, enabledForPro: true, enabledForTenants: false },
  { key: 'tenant_portal', name: 'Tenant Portal', description: 'Tenant self-service portal', category: 'CORE', enabledForFree: true, enabledForTenants: true, enabledForLandlords: true },
  { key: 'maintenance_requests', name: 'Maintenance Requests', description: 'Submit and track maintenance', category: 'CORE', enabledForFree: true, enabledForTenants: true },
  { key: 'rent_collection', name: 'Online Rent Collection', description: 'Collect rent online via Stripe', category: 'PREMIUM', enabledForFree: false, enabledForTenants: true },
  { key: 'background_checks', name: 'Background Checks', description: 'Run tenant background checks', category: 'PREMIUM', enabledForFree: false, enabledForTenants: true },
  { key: 'dashboard_analytics', name: 'Dashboard Analytics', description: 'Net worth and portfolio analytics', category: 'CORE', enabledForFree: true, enabledForTenants: false },
  { key: 'section8_lookup', name: 'Section 8 Info', description: 'Section 8 HUD information lookup', category: 'CORE', enabledForFree: true, enabledForTenants: false },
];

/**
 * GET /api/admin/features
 * Get all feature flags
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    if (!(await isSuperAdmin(userId))) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    // Get all features
    let features = await prisma.featureFlag.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    // If no features exist, seed defaults
    if (features.length === 0) {
      console.log('Seeding default feature flags...');
      for (const feature of DEFAULT_FEATURES) {
        await prisma.featureFlag.create({
          data: feature,
        });
      }
      features = await prisma.featureFlag.findMany({
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
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
    });

  } catch (error: any) {
    console.error('Admin features list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get features', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/features
 * Create a new feature flag
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const adminEmail = session.user.email || '';
    
    if (!(await isSuperAdmin(adminId))) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { key, name, description, category, ...settings } = body;

    if (!key || !name) {
      return NextResponse.json({ success: false, error: 'Key and name are required' }, { status: 400 });
    }

    // Check if key already exists
    const existing = await prisma.featureFlag.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Feature with this key already exists' }, { status: 400 });
    }

    const feature = await prisma.featureFlag.create({
      data: {
        key,
        name,
        description,
        category,
        ...settings,
      },
    });

    await logAdminAction(adminId, adminEmail, 'FEATURE_CREATED', 'FeatureFlag', feature.id, { key, name });

    return NextResponse.json({
      success: true,
      feature,
    });

  } catch (error: any) {
    console.error('Admin feature create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create feature', details: error.message },
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const adminEmail = session.user.email || '';
    
    if (!(await isSuperAdmin(adminId))) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Feature ID is required' }, { status: 400 });
    }

    const feature = await prisma.featureFlag.update({
      where: { id },
      data: updates,
    });

    await logAdminAction(adminId, adminEmail, 'FEATURE_UPDATED', 'FeatureFlag', id, updates);

    return NextResponse.json({
      success: true,
      feature,
    });

  } catch (error: any) {
    console.error('Admin feature update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feature', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/features
 * Delete a feature flag
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const adminEmail = session.user.email || '';
    
    if (!(await isSuperAdmin(adminId))) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Feature ID is required' }, { status: 400 });
    }

    const feature = await prisma.featureFlag.findUnique({ where: { id } });
    
    await prisma.featureFlag.delete({ where: { id } });

    await logAdminAction(adminId, adminEmail, 'FEATURE_DELETED', 'FeatureFlag', id, { key: feature?.key });

    return NextResponse.json({
      success: true,
      message: 'Feature deleted',
    });

  } catch (error: any) {
    console.error('Admin feature delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feature', details: error.message },
      { status: 500 }
    );
  }
}
