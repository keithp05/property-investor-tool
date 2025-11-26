import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Document Upload and AI Analysis API
 * Handles: PDFs, images (comp packets, estimates, inspection reports, repair photos)
 * Uses OpenAI Vision to extract structured data
 */
export async function POST(request: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('type') as string; // 'comps' | 'estimate' | 'inspection' | 'repair_photo'
    const propertyId = formData.get('propertyId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📄 Processing ${documentType} document: ${file.name}`);

    // Convert file to base64 for OpenAI Vision
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;

    // Determine extraction prompt based on document type
    const extractionPrompt = getExtractionPrompt(documentType);

    console.log('🤖 Analyzing document with OpenAI Vision...');

    // Use OpenAI Vision to analyze the document
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Latest vision model
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

    console.log('✅ Document analyzed successfully');
    console.log('Extracted data:', extractedData);

    // Store the document metadata (in production, upload to S3/storage)
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
    console.error('❌ Document upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process document',
      },
      { status: 500 }
    );
  }
}

/**
 * Get AI extraction prompt based on document type
 */
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
      "category": "kitchen" | "bathroom" | "roofing" | "hvac" | "electrical" | "plumbing" | "flooring" | "paint" | "windows" | "other",
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
  "issueType": "kitchen" | "bathroom" | "roofing" | "hvac" | "electrical" | "plumbing" | "flooring" | "paint" | "windows" | "structural" | "other",
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
