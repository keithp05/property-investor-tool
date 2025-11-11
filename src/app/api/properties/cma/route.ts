import { NextRequest, NextResponse } from 'next/server';
import { generateCMA, getAreaRentAnalysis } from '@/services/cmaService';

/**
 * Generate Comparative Market Analysis for a property
 */
export async function POST(request: NextRequest) {
  try {
    const {
      address,
      city,
      state,
      zipCode,
      bedrooms,
      bathrooms,
      squareFeet,
      yearBuilt,
      propertyType,
    } = await request.json();

    // Validate required fields
    if (!address || !city || !state || !zipCode || !bedrooms || !bathrooms || !squareFeet) {
      return NextResponse.json(
        { success: false, error: 'Missing required property information' },
        { status: 400 }
      );
    }

    console.log(`📊 Generating CMA for ${address}, ${city}, ${state}`);

    // Generate CMA and area rent analysis in parallel
    const [cmaResult, rentAnalysis] = await Promise.all([
      generateCMA(
        address,
        city,
        state,
        zipCode,
        bedrooms,
        bathrooms,
        squareFeet,
        yearBuilt,
        propertyType || 'SINGLE_FAMILY'
      ),
      getAreaRentAnalysis(city, state, zipCode, bedrooms),
    ]);

    if (!cmaResult) {
      return NextResponse.json(
        { success: false, error: 'Unable to generate CMA - insufficient comparable properties' },
        { status: 404 }
      );
    }

    console.log(`✅ CMA generated: $${cmaResult.estimatedValue} value, $${cmaResult.estimatedRent}/mo rent`);

    return NextResponse.json({
      success: true,
      cma: cmaResult,
      areaRents: rentAnalysis,
    });
  } catch (error: any) {
    console.error('❌ CMA API error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to generate CMA' },
      { status: 500 }
    );
  }
}
