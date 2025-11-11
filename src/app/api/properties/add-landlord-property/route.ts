import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import axios from 'axios';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      address,
      city,
      state,
      zipCode,
      purchasePrice,
      purchaseDate,
      monthlyMortgage,
      monthlyRent,
      mortgageBalance,
      mortgageRate,
      mortgageTerm,
      lenderName,
      loanNumber,
      status
    } = body;

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

    // Save property to database
    const property = await prisma.property.create({
      data: {
        landlordId: landlordProfile.id,
        address,
        city,
        state,
        zipCode,

        // Auto-fetched details from Zillow
        bedrooms: propertyDetails.bedrooms || 0,
        bathrooms: propertyDetails.bathrooms || 0,
        squareFeet: propertyDetails.squareFeet,
        yearBuilt: propertyDetails.yearBuilt,
        propertyType: propertyDetails.propertyType,
        estimatedValue: propertyDetails.estimatedValue,

        // Landlord-provided info
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        monthlyMortgage: monthlyMortgage ? parseFloat(monthlyMortgage) : null,
        monthlyRent: monthlyRent ? parseFloat(monthlyRent) : null,

        // Mortgage details
        mortgageBalance: mortgageBalance ? parseFloat(mortgageBalance) : null,
        mortgageRate: mortgageRate ? parseFloat(mortgageRate) : null,
        mortgageTerm: mortgageTerm ? parseInt(mortgageTerm) * 12 : null, // Convert years to months
        lenderName: lenderName || null,
        loanNumber: loanNumber || null,

        // Status - Use provided status (VACANT or MAINTENANCE), defaults to VACANT
        status: status || 'VACANT',
      },
    });

    console.log('✅ Property saved to database:', property.id);

    // Return property data for UI
    return NextResponse.json({
      success: true,
      property: {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        yearBuilt: property.yearBuilt,
        propertyType: property.propertyType,
        estimatedValue: property.estimatedValue ? parseFloat(property.estimatedValue.toString()) : null,
        purchasePrice: property.purchasePrice ? parseFloat(property.purchasePrice.toString()) : null,
        purchaseDate: property.purchaseDate?.toISOString().split('T')[0],
        monthlyMortgage: property.monthlyMortgage ? parseFloat(property.monthlyMortgage.toString()) : null,
        monthlyRent: property.monthlyRent ? parseFloat(property.monthlyRent.toString()) : null,
        status: property.status,
      },
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
