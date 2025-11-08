import { NextRequest, NextResponse } from 'next/server';
import { propertyAnalysisService } from '@/services/propertyAnalysisService';
import { demoDataService } from '@/services/demoDataService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    console.log('📊 Analyzing property:', propertyId);

    // Get property data from request body
    const property = await request.json();

    // Generate CMA report
    const cmaReport = await propertyAnalysisService.generateCMAReport(property);

    return NextResponse.json({
      success: true,
      report: cmaReport,
    });
  } catch (error: any) {
    console.error('❌ Error generating CMA report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate CMA report',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const { searchParams } = new URL(request.url);

    // Check if this is a tax auction property (from URL params)
    const propertyType = searchParams.get('type');

    let property: any;

    if (propertyType === 'tax-auction') {
      // Build property object from URL parameters
      property = {
        id: propertyId,
        address: searchParams.get('address') || 'Unknown Address',
        city: searchParams.get('city') || 'San Antonio',
        state: searchParams.get('state') || 'TX',
        zipCode: searchParams.get('zipCode') || '78253',
        purchasePrice: parseFloat(searchParams.get('price') || '0'),
        bedrooms: parseInt(searchParams.get('bedrooms') || '3'),
        bathrooms: parseFloat(searchParams.get('bathrooms') || '2'),
        squareFeet: parseInt(searchParams.get('squareFeet') || '1500'),
        yearBuilt: parseInt(searchParams.get('yearBuilt') || '2000'),
      };
      console.log('📊 Analyzing tax auction property:', property.address);
    } else {
      // For demo purposes, get property from demo data service
      // In production, this would fetch from database
      const properties = demoDataService.getDemoProperties('San Antonio', 'TX', 20);
      property = properties.find(p => p.id === propertyId);

      if (!property) {
        return NextResponse.json(
          { success: false, error: 'Property not found' },
          { status: 404 }
        );
      }
    }

    // Generate CMA report with 3-expert AI analysis
    const cmaReport = await propertyAnalysisService.generateCMAReport(property);

    return NextResponse.json({
      success: true,
      report: cmaReport,
    });
  } catch (error: any) {
    console.error('❌ Error generating CMA report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate CMA report',
      },
      { status: 500 }
    );
  }
}
