import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Maps Places Autocomplete API (Legacy)
 * Uses the older but free Places API Autocomplete endpoint
 * Returns address suggestions as the user types
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || input.length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    console.log('🗺️  Fetching address suggestions for:', input);

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY not set');
      return NextResponse.json(
        {
          success: false,
          error: 'API key not configured',
          suggestions: [],
        },
        { status: 500 }
      );
    }

    // Use Google Places API Autocomplete (old but free endpoint)
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.append('input', input);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('types', 'address');
    url.searchParams.append('components', 'country:us'); // Restrict to US

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS' || !data.predictions) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    if (data.status !== 'OK') {
      console.error('❌ Google Maps API error:', data.status, data.error_message);
      return NextResponse.json(
        {
          success: false,
          error: data.error_message || 'API request failed',
          suggestions: [],
        },
        { status: 500 }
      );
    }

    // Format suggestions for easier use in UI
    const suggestions = data.predictions
      .map((prediction: any) => {
        return {
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || '',
          secondaryText: prediction.structured_formatting?.secondary_text || '',
        };
      })
      .slice(0, 5); // Limit to 5 suggestions

    console.log(`✅ Found ${suggestions.length} address suggestions`);

    return NextResponse.json({
      success: true,
      suggestions,
    });

  } catch (error: any) {
    console.error('❌ Google Maps autocomplete error:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch address suggestions',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}
