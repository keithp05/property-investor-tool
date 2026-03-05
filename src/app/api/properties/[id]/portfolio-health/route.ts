import { NextRequest, NextResponse } from 'next/server';
import { propertyAnalysisService } from '@/services/propertyAnalysisService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    console.log('📊 Generating Portfolio Health Report for:', propertyId);

    // Get property data from request body
    const property = await request.json();

    // Generate Portfolio Health Report
    const portfolioReport = await propertyAnalysisService.generatePortfolioHealthReport(property);

    return NextResponse.json({
      success: true,
      report: portfolioReport,
    });
  } catch (error: any) {
    console.error('❌ Error generating Portfolio Health Report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate Portfolio Health Report',
      },
      { status: 500 }
    );
  }
}
