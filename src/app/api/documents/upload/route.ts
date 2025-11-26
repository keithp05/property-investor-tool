import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Route segment config - increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Allow larger request bodies and longer timeout for AI processing
export const maxDuration = 60;

/**
 * Document Upload and AI Analysis API
 * Handles: PDFs, images (comp packets, estimates, inspection reports, repair photos)
 * Uses OpenAI Vision to extract structured data
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI inside the function to ensure env vars are available
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log('OpenAI API Key check:', apiKey ? 'Present (' + apiKey.substring(0, 10) + '...)' : 'NOT FOUND');
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY not found in environment');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured. Please check environment variables.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('type') as string;
    const propertyId = formData.get('propertyId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB. Your file: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB' },
        { status: 413 }
      );
    }

    console.log('Processing ' + documentType + ' document: ' + file.name + ' (' + (file.size / 1024).toFixed(2) + ' KB)');

    // Convert file to base64 for OpenAI Vision
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;

    // Determine extraction prompt based on document type
    const extractionPrompt = getExtractionPrompt(documentType);

    console.log('Analyzing document with OpenAI Vision...');

    // Use OpenAI Vision to analyze the document
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: extractionPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:' + mimeType + ';base64,' + base64,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const extractedData = JSON.parse(response.choices[0].message.content || '{}');

    console.log('Document analyzed successfully');

    const documentMetadata = {
      id: Date.now().toString(),
      propertyId,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      documentType,
      uploadedAt: new Date().toISOString(),
      extractedData,
    };

    return NextResponse.json({
      success: true,
      document: documentMetadata,
      extractedData,
    });

  } catch (error: any) {
    console.error('Document upload error:', error);
    console.error('Error message:', error.message);
    
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'Invalid OpenAI API key. Please check your configuration.' },
        { status: 500 }
      );
    }
    
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { success: false, error: 'OpenAI rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process document',
      },
      { status: 500 }
    );
  }
}

function getExtractionPrompt(documentType: string): string {
  switch (documentType) {
    case 'comps':
      return 'Analyze this real estate comparable sales/rental document and extract ALL property data in JSON format. For each comparable property found, extract: { "comps": [ { "address": "full street address", "city": "city name", "state": "state", "zipCode": "zip code", "price": number, "rentPrice": number, "bedrooms": number, "bathrooms": number, "sqft": number, "yearBuilt": number, "soldDate": "YYYY-MM-DD", "daysOnMarket": number, "pricePerSqft": number, "type": "sale" or "rental", "status": "sold", "active", "rented" } ], "summary": "Brief summary" }. Extract ALL properties visible.';

    case 'estimate':
      return 'Analyze this contractor estimate and extract cost breakdowns in JSON: { "contractor": { "name": "company", "phone": "number", "email": "email" }, "estimateDate": "YYYY-MM-DD", "totalCost": number, "lineItems": [ { "category": "kitchen|bathroom|roofing|hvac|electrical|plumbing|flooring|paint|windows|other", "description": "description", "cost": number, "quantity": number, "unit": "sqft" } ], "notes": "notes" }';

    case 'inspection':
      return 'Analyze this inspection report and extract findings in JSON: { "inspectionDate": "YYYY-MM-DD", "inspector": "name", "propertyAddress": "address", "majorIssues": [ { "category": "roof|foundation|electrical|plumbing|hvac|structural|other", "description": "issue", "severity": "critical|major|minor", "estimatedCost": number } ], "minorIssues": ["list"], "summary": "summary" }';

    case 'repair_photo':
      return 'Analyze this repair photo and estimate costs in JSON: { "issueType": "kitchen|bathroom|roofing|hvac|electrical|plumbing|flooring|paint|windows|structural|other", "description": "what needs repair", "severity": "minor|moderate|major", "estimatedCost": { "low": number, "high": number, "average": number }, "scopeOfWork": "recommended repairs", "notes": "observations" }. Provide realistic US contractor rates.';

    default:
      return 'Analyze this document and extract all relevant real estate property information in JSON format.';
  }
}
