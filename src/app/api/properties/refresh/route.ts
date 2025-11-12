import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

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
    const location = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;
    console.log('📡 Fetching property details from Zillow:', location);

    let propertyDetails: any = null;
    let zpid: string | null = null;

    try {
      // Step 1: Try to get ZPID first (search without status_type to include ALL properties)
      console.log('🔍 Step 1: Searching for property ZPID...');
      try {
        const zpidResponse = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
          params: {
            location: location,
            page: 1,
            // NO status_type - search all properties, not just ForSale
          },
          headers: {
            'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          },
          timeout: 10000,
        });

        console.log('📦 ZPID search response:', zpidResponse.status);

        // Extract ZPID from response
        if (zpidResponse.data?.zpid) {
          zpid = zpidResponse.data.zpid.toString();
          console.log('✅ Found ZPID (direct):', zpid);
        } else if (zpidResponse.data?.props && zpidResponse.data.props.length > 0) {
          zpid = zpidResponse.data.props[0].zpid?.toString();
          console.log('✅ Found ZPID (from props array):', zpid);
        }
      } catch (zpidError: any) {
        console.log('⚠️ ZPID search failed:', zpidError.message);
      }

      // Step 2: If we have ZPID, fetch full property details using /property endpoint
      if (zpid) {
        console.log('🔍 Step 2: Fetching full property details with ZPID:', zpid);
        const propertyResponse = await axios.get('https://zillow-com1.p.rapidapi.com/property', {
          params: {
            zpid: zpid,
          },
          headers: {
            'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          },
          timeout: 10000,
        });

        if (propertyResponse.data) {
          propertyDetails = propertyResponse.data;
          console.log('✅ Full property details fetched:', {
            address: propertyDetails.address,
            bedrooms: propertyDetails.bedrooms,
            bathrooms: propertyDetails.bathrooms,
            zestimate: propertyDetails.zestimate,
            rentZestimate: propertyDetails.rentZestimate,
          });
        }
      }

      // Step 3: Fallback - try direct search if ZPID method failed
      if (!propertyDetails) {
        console.log('🔍 Step 3: Trying direct propertyExtendedSearch as fallback...');
        const zillowResponse = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
          params: {
            location: location,
            page: 1,
          },
          headers: {
            'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          },
          timeout: 10000,
        });

        if (zillowResponse.data?.props && zillowResponse.data.props.length > 0) {
          propertyDetails = zillowResponse.data.props[0];
          console.log('✅ Property found via direct search fallback');
        }
      }

      // If still no property found after all attempts
      if (!propertyDetails) {
        console.log('⚠️ No property found after all attempts');
        console.log('Search location:', location);
        return NextResponse.json({
          success: false,
          error: 'Property not found on Zillow. The address may not be in Zillow\'s database or the format may not match exactly.',
          details: {
            searchedAddress: location,
            suggestion: 'Verify the address is correct and matches Zillow.com exactly, or manually update property details.'
          }
        }, { status: 404 });
      }
    } catch (error: any) {
      console.error('❌ Zillow API error:', error.response?.status, error.response?.data || error.message);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch property data from Zillow: ${error.message}`,
        details: error.response?.data
      }, { status: 500 });
    }

    // Fetch CMA data (optional - skip if zpid not available)
    let cmaData = null;
    if (propertyDetails.zpid) {
      try {
        console.log('🔍 Fetching CMA data for zpid:', propertyDetails.zpid);
        const cmaResponse = await axios.get('https://zillow-com1.p.rapidapi.com/similarSales', {
          params: {
            zpid: propertyDetails.zpid,
          },
          headers: {
            'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          },
          timeout: 10000,
        });

        if (cmaResponse.data) {
          cmaData = cmaResponse.data;
          console.log('✅ CMA data fetched:', cmaData ? 'Success' : 'No data');
        }
      } catch (error) {
        console.error('⚠️ CMA fetch failed:', error);
      }
    } else {
      console.log('⚠️ No zpid available, skipping CMA fetch');
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
