import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserFeatures, checkFeatureAccess } from '@/lib/features';

/**
 * GET /api/features
 * Get all features accessible to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const featureKey = searchParams.get('key');

    // If specific feature requested, return just that
    if (featureKey) {
      const access = await checkFeatureAccess(userId, featureKey);
      return NextResponse.json({
        success: true,
        feature: featureKey,
        ...access,
      });
    }

    // Otherwise return all features
    const features = await getUserFeatures(userId);

    return NextResponse.json({
      success: true,
      features,
    });

  } catch (error: any) {
    console.error('Get features error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get features', details: error.message },
      { status: 500 }
    );
  }
}
