import { NextRequest, NextResponse } from 'next/server';
import { getSection8FMR, isSection8Eligible } from '@/services/section8Service';

/**
 * Get Section 8 Fair Market Rent data by ZIP code and bedroom count
 */
export async function POST(request: NextRequest) {
  try {
    const { zipCode, bedrooms } = await request.json();

    if (!zipCode) {
      return NextResponse.json(
        { success: false, error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    console.log(`🏛️  Fetching Section 8 FMR for ZIP ${zipCode}, ${bedrooms || 3} bedrooms`);

    const section8Data = await getSection8FMR(zipCode, bedrooms || 3);

    if (!section8Data) {
      return NextResponse.json(
        { success: false, error: 'Section 8 data not available for this ZIP code' },
        { status: 404 }
      );
    }

    console.log(`✅ Section 8 FMR: $${section8Data.fmrForBedrooms}/month`);

    return NextResponse.json({
      success: true,
      data: section8Data,
    });
  } catch (error: any) {
    console.error('❌ Section 8 FMR API error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Section 8 data' },
      { status: 500 }
    );
  }
}
