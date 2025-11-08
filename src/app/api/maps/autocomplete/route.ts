import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Google Maps Places Autocomplete API
 * Returns address suggestions as the user types
 */
export async function POST(request: NextRequest) {
  try {
    const { input, locationBias } = await request.json();

    if (!input || input.length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    console.log('🗺️  Fetching address suggestions for:', input);

    // Default to US if no location bias provided
    const defaultLocationBias = locationBias || {
      circle: {
        center: {
          latitude: 39.8283, // Center of US
          longitude: -98.5795,
        },
        radius: 5000000, // 5000km radius (covers entire US)
      },
    };

    const response = await axios.post(
      'https://google-map-places-new-v2.p.rapidapi.com/v1/places:autocomplete',
      {
        input: input,
        locationBias: defaultLocationBias,
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
        includedRegionCodes: ['US'], // Restrict to US addresses
        languageCode: 'en',
        regionCode: 'US',
        inputOffset: input.length,
        includeQueryPredictions: false,
        sessionToken: '', // Could implement session token for billing optimization
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.placeId',
          'x-rapidapi-host': 'google-map-places-new-v2.p.rapidapi.com',
          'x-rapidapi-key': process.env.GOOGLE_MAPS_API_KEY || '',
        },
        timeout: 5000,
      }
    );

    if (!response.data?.suggestions || response.data.suggestions.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    // Format suggestions for easier use in UI
    const suggestions = response.data.suggestions
      .filter((s: any) => s.placePrediction)
      .map((suggestion: any) => {
        const prediction = suggestion.placePrediction;
        return {
          placeId: prediction.placeId,
          description: prediction.text?.text || '',
          mainText: prediction.structuredFormat?.mainText?.text || '',
          secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
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

    // Handle specific errors
    if (error.response?.status === 429) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again.',
          suggestions: [],
        },
        { status: 429 }
      );
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request timed out.',
          suggestions: [],
        },
        { status: 504 }
      );
    }

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
