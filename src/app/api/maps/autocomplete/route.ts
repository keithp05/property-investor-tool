import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Maps Places Autocomplete API (New)
 * Uses the new Places API (Text Search) with autocomplete
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

    // Use new Places API (Autocomplete) - https://developers.google.com/maps/documentation/places/web-service/autocomplete
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['street_address', 'premise'],
        locationBias: {
          circle: {
            center: {
              latitude: 37.7749,
              longitude: -122.4194
            },
            radius: 5000000.0 // 5000 km to cover entire US
          }
        },
        languageCode: 'en',
      }),
    });

    const data = await response.json();

    if (!data.suggestions || data.suggestions.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    if (data.error) {
      console.error('❌ Google Maps API error:', data.error);
      return NextResponse.json(
        {
          success: false,
          error: data.error.message || 'API request failed',
          suggestions: [],
        },
        { status: 500 }
      );
    }

    // Format suggestions for easier use in UI
    const suggestions = data.suggestions
      .filter((s: any) => s.placePrediction)
      .map((suggestion: any) => {
        const pred = suggestion.placePrediction;
        return {
          placeId: pred.placeId,
          description: pred.text?.text || '',
          mainText: pred.structuredFormat?.mainText?.text || '',
          secondaryText: pred.structuredFormat?.secondaryText?.text || '',
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
