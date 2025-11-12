import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

/**
 * Cron job to refresh property data monthly
 * This endpoint should be called by AWS EventBridge on a monthly schedule
 *
 * Security: Verify the request is from AWS EventBridge using a secret token
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Monthly property refresh cron job started');

    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get all properties
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        landlordId: true,
        lastValueUpdate: true,
      },
    });

    console.log(`📊 Found ${properties.length} properties to refresh`);

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    // Refresh each property
    for (const property of properties) {
      try {
        console.log(`🔍 Refreshing property: ${property.address}`);

        // Fetch fresh data from Zillow
        const location = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;

        const zillowResponse = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
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

        // Extract property details
        let propertyDetails: any = null;

        if (zillowResponse.data?.props && zillowResponse.data.props.length > 0) {
          propertyDetails = zillowResponse.data.props[0];
        } else {
          console.error(`❌ No property data found for ${property.address}`);
          failureCount++;
          results.push({
            propertyId: property.id,
            address: property.address,
            success: false,
            error: 'No property data found on Zillow',
          });
          continue;
        }

        // Update property with fresh data
        await prisma.property.update({
          where: { id: property.id },
          data: {
            estimatedValue: propertyDetails.zestimate || propertyDetails.price,
            marketRent: propertyDetails.rentZestimate,
            currentValue: propertyDetails.zestimate || propertyDetails.price,
            lastValueUpdate: new Date(),
          },
        });

        console.log(`✅ Successfully refreshed ${property.address}`);
        successCount++;
        results.push({
          propertyId: property.id,
          address: property.address,
          success: true,
          estimatedValue: propertyDetails.zestimate || propertyDetails.price,
          marketRent: propertyDetails.rentZestimate,
        });

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`❌ Error refreshing ${property.address}:`, error);
        failureCount++;
        results.push({
          propertyId: property.id,
          address: property.address,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`✅ Cron job completed: ${successCount} successes, ${failureCount} failures`);

    return NextResponse.json({
      success: true,
      message: 'Property refresh cron job completed',
      totalProperties: properties.length,
      successCount,
      failureCount,
      results,
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run cron job',
      details: error.message,
    }, { status: 500 });
  }
}

// Allow GET requests to check cron job status
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Get count of properties that need refresh (older than 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const needsRefreshCount = await prisma.property.count({
    where: {
      OR: [
        { lastValueUpdate: null },
        { lastValueUpdate: { lt: thirtyDaysAgo } },
      ],
    },
  });

  const totalProperties = await prisma.property.count();

  return NextResponse.json({
    success: true,
    totalProperties,
    needsRefreshCount,
    message: `${needsRefreshCount} of ${totalProperties} properties need refresh`,
  });
}
