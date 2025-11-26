import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Allow longer timeout for AI processing
export const maxDuration = 60;

/**
 * Document Upload and AI Analysis API
 * Handles: Images (comp packets, estimates, inspection reports, repair photos)
 * Uses OpenAI Vision for image analysis
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI inside the function to ensure env vars are available
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log('OpenAI API Key check:', apiKey ? 'Present' : 'NOT FOUND');
    
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
        { success: false, error: `File too large. Maximum size is 10MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 413 }
      );
    }

    console.log(`Processing ${documentType} document: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    const mimeType = file.type;
    
    // Check for supported image types
    const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const isImage = supportedTypes.includes(mimeType);
    const isPDF = mimeType === 'application/pdf';

    if (isPDF) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'PDF files are not currently supported. Please take a screenshot or photo of your document and upload as an image (PNG, JPG, or WEBP).' 
        },
        { status: 400 }
      );
    }

    if (!isImage) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${mimeType}. Please upload an image (PNG, JPG, GIF, or WEBP).` },
        { status: 400 }
      );
    }

    // Convert file to buffer and base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    const extractionPrompt = getExtractionPrompt(documentType);

    console.log('Analyzing image with OpenAI Vision...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: extractionPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
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
    
    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      return NextResponse.json(
        { success: false, error: 'OpenAI rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('MIME')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an image (PNG, JPG, GIF, or WEBP).' },
        { status: 400 }
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
      return `Analyze this real estate comparable sales/rental document and extract ALL property data in JSON format.

For each comparable property found, extract:
{
  "comps": [
    {
      "address": "full street address",
      "city": "city name",
      "state": "state",
      "zipCode": "zip code",
      "price": number (sold price or asking price),
      "rentPrice": number (monthly rent if rental comp),
      "bedrooms": number,
      "bathrooms": number,
      "sqft": number,
      "yearBuilt": number,
      "soldDate": "YYYY-MM-DD" (if sold),
      "daysOnMarket": number,
      "pricePerSqft": number,
      "type": "sale" or "rental",
      "status": "sold", "active", "rented", etc.
    }
  ],
  "summary": "Brief summary of comps found"
}

Extract ALL properties visible in the document. Include rental comps and sales comps separately if both are present.`;

    case 'estimate':
      return `Analyze this contractor estimate or repair quote and extract cost breakdowns in JSON format:

{
  "contractor": {
    "name": "company name",
    "phone": "phone number",
    "email": "email if visible"
  },
  "estimateDate": "YYYY-MM-DD",
  "totalCost": number,
  "lineItems": [
    {
      "category": "kitchen" | "bathroom" | "roofing" | "hvac" | "electrical" | "plumbing" | "flooring" | "paint" | "windows" | "landscaping" | "other",
      "description": "detailed description",
      "cost": number,
      "quantity": number,
      "unit": "sqft, each, etc."
    }
  ],
  "notes": "any additional notes or exclusions"
}

Extract all line items and categorize them appropriately.`;

    case 'inspection':
      return `Analyze this property inspection report and extract key findings in JSON format:

{
  "inspectionDate": "YYYY-MM-DD",
  "inspector": "inspector name/company",
  "propertyAddress": "full address",
  "majorIssues": [
    {
      "category": "roof" | "foundation" | "electrical" | "plumbing" | "hvac" | "structural" | "other",
      "description": "issue description",
      "severity": "critical" | "major" | "minor",
      "estimatedCost": number (if mentioned)
    }
  ],
  "minorIssues": ["list of minor issues"],
  "summary": "overall inspection summary"
}`;

    case 'repair_photo':
      return `Analyze this property repair/condition photo and provide a cost estimate in JSON format:

{
  "issueType": "kitchen" | "bathroom" | "roofing" | "hvac" | "electrical" | "plumbing" | "flooring" | "paint" | "windows" | "structural" | "landscaping" | "other",
  "description": "detailed description of what needs repair",
  "severity": "minor" | "moderate" | "major",
  "estimatedCost": {
    "low": number (conservative estimate),
    "high": number (high estimate),
    "average": number (average estimate)
  },
  "scopeOfWork": "recommended repairs and scope",
  "notes": "any additional observations"
}

Provide realistic cost estimates based on typical contractor rates in the US.`;

    default:
      return `Analyze this document and extract all relevant real estate property information in JSON format.`;
  }
}
