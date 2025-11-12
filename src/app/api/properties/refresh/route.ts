import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Refresh property data - Starting...');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json({ success: false, error: 'Property ID is required' }, { status: 400 });
    }

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 403 });
    }

    // Verify property belongs to user
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    if (property.landlordId !== landlordProfile.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    console.log('🔍 Fetching fresh data from Zillow for:', property.address);

    // Fetch fresh data from Zillow
    const zillowResponse = await fetch(
      `https://zillow-com1.p.rapidapi.com/propertyExtendedSearch?location=${encodeURIComponent(
        `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
      )}`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
        },
      }
    );

    if (!zillowResponse.ok) {
      console.error('❌ Zillow API error:', zillowResponse.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch property data from Zillow'
      }, { status: 500 });
    }

    const zillowData = await zillowResponse.json();
    console.log('📦 Zillow response:', JSON.stringify(zillowData, null, 2));

    // Extract property details
    let propertyDetails: any = null;

    if (zillowData && Array.isArray(zillowData) && zillowData.length > 0) {
      propertyDetails = zillowData[0];
    } else if (zillowData && typeof zillowData === 'object') {
      propertyDetails = zillowData;
    }

    if (!propertyDetails) {
      return NextResponse.json({
        success: false,
        error: 'No property data found on Zillow'
      }, { status: 404 });
    }

    console.log('✅ Property details found:', {
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
      zestimate: propertyDetails.zestimate,
      rentZestimate: propertyDetails.rentZestimate,
    });

    // Fetch CMA data
    let cmaData = null;
    try {
      console.log('🔍 Fetching CMA data...');
      const cmaResponse = await fetch(
        `https://zillow-com1.p.rapidapi.com/similarSales?zpid=${propertyDetails.zpid}`,
        {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          },
        }
      );

      if (cmaResponse.ok) {
        cmaData = await cmaResponse.json();
        console.log('✅ CMA data fetched:', cmaData ? 'Success' : 'No data');
      }
    } catch (error) {
      console.error('⚠️ CMA fetch failed:', error);
    }

    // Fetch Section 8 data
    let section8Data = null;
    try {
      console.log('🔍 Fetching Section 8 FMR data...');

      // Get county from property data or use a geocoding service
      const countyName = propertyDetails.county || property.city;
      const statecode = property.state;

      const section8Response = await fetch(
        `https://www.huduser.gov/hudapi/public/fmr/data/${statecode}?year=2024`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUD_USER_TOKEN || ''}`,
          },
        }
      );

      if (section8Response.ok) {
        const allCounties = await section8Response.json();
        // Find matching county
        section8Data = allCounties?.data?.find((county: any) =>
          county.county_name?.toLowerCase().includes(countyName.toLowerCase())
        );
        console.log('✅ Section 8 data fetched:', section8Data ? 'Success' : 'No data');
      }
    } catch (error) {
      console.error('⚠️ Section 8 fetch failed:', error);
    }

    // Update property with fresh data
    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        bedrooms: propertyDetails.bedrooms || property.bedrooms,
        bathrooms: propertyDetails.bathrooms || property.bathrooms,
        squareFeet: propertyDetails.livingArea || property.squareFeet,
        yearBuilt: propertyDetails.yearBuilt || property.yearBuilt,
        propertyType: propertyDetails.homeType || property.propertyType,
        estimatedValue: propertyDetails.zestimate || propertyDetails.price || property.estimatedValue,
        marketRent: propertyDetails.rentZestimate || property.marketRent,
        currentValue: propertyDetails.zestimate || propertyDetails.price || property.currentValue,
        lastValueUpdate: new Date(),
      },
    });

    console.log('✅ Property updated successfully');

    return NextResponse.json({
      success: true,
      property: updatedProperty,
      message: 'Property data refreshed successfully',
    });

  } catch (error: any) {
    console.error('❌ Error refreshing property data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh property data',
      details: error.message,
    }, { status: 500 });
  }
}
