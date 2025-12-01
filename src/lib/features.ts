import { prisma } from '@/lib/prisma';

interface FeatureAccess {
  hasAccess: boolean;
  limit?: number | null;
  reason?: string;
}

/**
 * Check if a user has access to a specific feature
 */
export async function checkFeatureAccess(
  userId: string,
  featureKey: string
): Promise<FeatureAccess> {
  try {
    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }

    // Super admins always have access
    if (user.role === 'SUPER_ADMIN') {
      return { hasAccess: true };
    }

    // Get feature flag
    const feature = await prisma.featureFlag.findUnique({
      where: { key: featureKey },
    });

    if (!feature) {
      // If feature doesn't exist, allow access (fail open for backwards compatibility)
      return { hasAccess: true };
    }

    // Check if feature is globally enabled
    if (!feature.isEnabled) {
      return { hasAccess: false, reason: 'Feature is disabled' };
    }

    // Check role-based access
    const roleAccess: Record<string, boolean> = {
      LANDLORD: feature.enabledForLandlords,
      TENANT: feature.enabledForTenants,
      PRO: feature.enabledForPros,
      ADMIN: true,
    };

    if (!roleAccess[user.role]) {
      return { hasAccess: false, reason: `Feature not available for ${user.role} role` };
    }

    // Check tier-based access
    const tierAccess: Record<string, { enabled: boolean; limit: number | null }> = {
      FREE: { enabled: feature.enabledForFree, limit: feature.freeTierLimit },
      PRO: { enabled: feature.enabledForPro, limit: feature.proTierLimit },
      ENTERPRISE: { enabled: feature.enabledForEnterprise, limit: feature.enterpriseTierLimit },
    };

    const userTierAccess = tierAccess[user.subscriptionTier];
    
    if (!userTierAccess?.enabled) {
      return { 
        hasAccess: false, 
        reason: `Feature requires ${feature.enabledForPro ? 'PRO' : 'ENTERPRISE'} subscription` 
      };
    }

    return { 
      hasAccess: true, 
      limit: userTierAccess.limit 
    };

  } catch (error) {
    console.error('Feature access check error:', error);
    // Fail open in case of errors
    return { hasAccess: true };
  }
}

/**
 * Get all features accessible to a user
 */
export async function getUserFeatures(userId: string): Promise<Record<string, FeatureAccess>> {
  try {
    const features = await prisma.featureFlag.findMany();
    const result: Record<string, FeatureAccess> = {};

    for (const feature of features) {
      result[feature.key] = await checkFeatureAccess(userId, feature.key);
    }

    return result;
  } catch (error) {
    console.error('Get user features error:', error);
    return {};
  }
}

/**
 * Middleware-style feature gate for API routes
 * Returns null if access granted, or NextResponse if denied
 */
export async function requireFeature(userId: string, featureKey: string) {
  const access = await checkFeatureAccess(userId, featureKey);
  
  if (!access.hasAccess) {
    return {
      allowed: false,
      error: access.reason || 'Feature not available',
    };
  }

  return {
    allowed: true,
    limit: access.limit,
  };
}
