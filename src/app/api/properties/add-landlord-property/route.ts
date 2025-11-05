import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, zipCode, purchasePrice, purchaseDate, monthlyMortgage, monthlyRent } = body;

    console.log('📍 Adding landlord property:', address, city, state, zipCode);

    // Fetch property details from Zillow
    let propertyDetails: any = {
      bedrooms: 0,
      bathrooms: 0,
      squareFeet: undefined,
      yearBuilt: undefined,
      propertyType: 'SINGLE_FAMILY',
      estimatedValue: undefined,
    };

    try {
      const location = `${address}, ${city}, ${state} ${zipCode}`;
      console.log('🔍 Fetching property details from Zillow:', location);

      const response = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
        params: {
          location: location,
          status_type: 'ForSale',
          page: 1,
        },
        headers: {
          'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
        },
        timeout: 10000,
      });

      if (response.data?.props && response.data.props.length > 0) {
        const zillowData = response.data.props[0];
        console.log('✅ Found property on Zillow:', zillowData.address);

        propertyDetails = {
          bedrooms: zillowData.bedrooms || 0,
          bathrooms: zillowData.bathrooms || 0,
          squareFeet: zillowData.livingArea,
          yearBuilt: zillowData.yearBuilt,
          propertyType: zillowData.propertyType || 'SINGLE_FAMILY',
          estimatedValue: zillowData.price || zillowData.zestimate,
        };
      } else {
        console.log('⚠️  Property not found on Zillow, using defaults');
      }
    } catch (zillowError: any) {
      console.error('Zillow API error:', zillowError.message);
      // Continue with default values
    }

    // Create landlord property object
    const landlordProperty = {
      id: `landlord-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      address,
      city,
      state,
      zipCode,

      // Auto-fetched details
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
      squareFeet: propertyDetails.squareFeet,
      yearBuilt: propertyDetails.yearBuilt,
      propertyType: propertyDetails.propertyType,
      estimatedValue: propertyDetails.estimatedValue,

      // Landlord-provided info
      purchasePrice: purchasePrice ? parseInt(purchasePrice) : undefined,
      purchaseDate,
      monthlyMortgage: monthlyMortgage ? parseInt(monthlyMortgage) : undefined,
      monthlyRent: monthlyRent ? parseInt(monthlyRent) : undefined,

      // Status
      status: monthlyRent ? 'RENTED' : 'VACANT',
      currentTenant: undefined,
      leaseEndDate: undefined,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('✅ Landlord property created successfully');

    return NextResponse.json({
      success: true,
      property: landlordProperty,
      message: 'Property added successfully',
    });

  } catch (error: any) {
    console.error('❌ Error adding landlord property:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to add property',
      },
      { status: 500 }
    );
  }
}
