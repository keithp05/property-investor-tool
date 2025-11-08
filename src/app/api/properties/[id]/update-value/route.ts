import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { propertyAnalysisService } from '@/services/propertyAnalysisService';

/**
 * Update property estimated value by fetching from Zillow and running through 3-expert AI analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const { id: propertyId } = await params;

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      return NextResponse.json(
        { success: false, error: 'Landlord profile not found' },
        { status: 403 }
      );
    }

    // Fetch property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.landlordId !== landlordProfile.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this property' },
        { status: 403 }
      );
    }

    console.log('🏠 Fetching Zillow data for property:', property.address);

    // Fetch property data from Zillow using Bright Data Realtor scraper
    const zillowData = await fetchZillowData(property);

    console.log('📊 Running 3-expert AI analysis...');

    // Generate CMA report with 3-expert AI analysis
    // IMPORTANT: Use database bedrooms if available, since Zillow scraper may get wrong property
    const cmaReport = await propertyAnalysisService.generateCMAReport({
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      price: zillowData.price || property.estimatedValue,
      bedrooms: property.bedrooms || zillowData.bedrooms || 0, // Database first!
      bathrooms: property.bathrooms || zillowData.bathrooms || 0, // Database first!
      squareFeet: property.squareFeet || zillowData.squareFeet || 0, // Database first!
      yearBuilt: zillowData.yearBuilt,
      propertyType: zillowData.propertyType || 'SINGLE_FAMILY',
      listingType: 'FOR_SALE',
      daysOnMarket: zillowData.daysOnMarket,
      zestimate: zillowData.zestimate,
      rentZestimate: zillowData.rentZestimate,
    });

    // Update property with new estimated value from AI analysis
    // Use estimatedValue from CMA report (this is the market value)
    const newEstimatedValue = cmaReport.estimatedValue || zillowData.zestimate || zillowData.price || property.estimatedValue;

    console.log('📊 CMA Report Values:', {
      estimatedValue: cmaReport.estimatedValue,
      estimatedRent: cmaReport.estimatedRent,
      zillowPrice: zillowData.price,
      zillowZestimate: zillowData.zestimate,
    });

    const newMarketRent = cmaReport.estimatedRent || zillowData.rentZestimate || property.marketRent;

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        estimatedValue: newEstimatedValue,
        marketRent: newMarketRent,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Property value updated:', updatedProperty.estimatedValue);
    console.log('✅ Market rent updated:', updatedProperty.marketRent);

    return NextResponse.json({
      success: true,
      property: updatedProperty,
      analysis: cmaReport,
      zillowData,
    });

  } catch (error: any) {
    console.error('❌ Error updating property value:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update property value',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch property data from Zillow using Bright Data Realtor scraper
 */
async function fetchZillowData(property: any) {
  try {
    const BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_TOKEN;

    if (!BRIGHT_DATA_TOKEN) {
      console.warn('⚠️ Bright Data API token not configured, using property data as-is');
      return {
        price: property.estimatedValue,
        zestimate: property.estimatedValue,
      };
    }

    // Build Realtor.com URL (Zillow alternative since Zillow API is restricted)
    const searchAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;
    const encodedAddress = encodeURIComponent(searchAddress);
    const realtorUrl = `https://www.realtor.com/realestateandhomes-search/${encodedAddress}`;

    console.log('🔍 Fetching from Realtor.com:', realtorUrl);

    // Use Bright Data Realtor scraper
    const response = await fetch('https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_m517agnc1jppzwgtmw&notify=false&include_errors=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [{ url: realtorUrl }]
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Failed to fetch from Realtor.com, using property data');
      return {
        price: property.estimatedValue,
        zestimate: property.estimatedValue,
      };
    }

    const data = await response.json();

    // Parse the response (Bright Data returns an array)
    if (data && data.length > 0) {
      const propertyData = data[0];

      return {
        price: propertyData.price || property.estimatedValue,
        zestimate: propertyData.price || property.estimatedValue,
        rentZestimate: propertyData.rent_estimate,
        bedrooms: propertyData.beds,
        bathrooms: propertyData.baths,
        squareFeet: propertyData.sqft,
        yearBuilt: propertyData.year_built,
        propertyType: propertyData.property_type,
        daysOnMarket: propertyData.days_on_market,
      };
    }

    return {
      price: property.estimatedValue,
      zestimate: property.estimatedValue,
    };

  } catch (error) {
    console.error('❌ Error fetching Zillow data:', error);
    return {
      price: property.estimatedValue,
      zestimate: property.estimatedValue,
    };
  }
}
