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

    if (propertyType === 'tax-auction' || propertyType === 'zillow' || propertyType === 'standard') {
      // Build property object from URL parameters including deal inputs
      const purchasePrice = parseFloat(searchParams.get('price') || '0');
      const afterRepairValue = parseFloat(searchParams.get('afterRepairValue') || '0') || purchasePrice * 1.15;
      const estimatedRepairs = parseFloat(searchParams.get('estimatedRepairs') || '0');
      
      property = {
        id: propertyId,
        address: searchParams.get('address') || 'Unknown Address',
        city: searchParams.get('city') || 'San Antonio',
        state: searchParams.get('state') || 'TX',
        zipCode: searchParams.get('zipCode') || '78253',
        // Purchase & Deal Info
        purchasePrice: purchasePrice,
        afterRepairValue: afterRepairValue,
        estimatedRepairs: estimatedRepairs,
        // Property Details
        bedrooms: parseInt(searchParams.get('bedrooms') || '3'),
        bathrooms: parseFloat(searchParams.get('bathrooms') || '2'),
        squareFeet: parseInt(searchParams.get('squareFeet') || '1500'),
        yearBuilt: parseInt(searchParams.get('yearBuilt') || '2000'),
        // Financing Assumptions (for cash-on-cash calculations)
        downPaymentPercent: parseFloat(searchParams.get('downPaymentPercent') || '20'),
        interestRate: parseFloat(searchParams.get('interestRate') || '7.5'),
        loanTermYears: parseInt(searchParams.get('loanTermYears') || '30'),
      };
      
      console.log(`📊 Analyzing ${propertyType} property:`, property.address);
      console.log(`   Offer: $${purchasePrice.toLocaleString()}, ARV: $${afterRepairValue.toLocaleString()}, Repairs: $${estimatedRepairs.toLocaleString()}`);
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
      
      // Add deal inputs from URL params if provided (for existing properties)
      const afterRepairValue = parseFloat(searchParams.get('afterRepairValue') || '0');
      const estimatedRepairs = parseFloat(searchParams.get('estimatedRepairs') || '0');
      
      if (afterRepairValue > 0) {
        property.afterRepairValue = afterRepairValue;
      }
      if (estimatedRepairs > 0) {
        property.estimatedRepairs = estimatedRepairs;
      }
      
      // Override purchase price if provided (user's offer price)
      const offerPrice = parseFloat(searchParams.get('price') || '0');
      if (offerPrice > 0) {
        property.purchasePrice = offerPrice;
      }
    }

    // Generate CMA report with 5-expert AI analysis
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
