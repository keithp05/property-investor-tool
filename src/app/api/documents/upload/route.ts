import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Allow longer timeout for AI processing
export const maxDuration = 60;

/**
 * Document Upload and AI Analysis API
 * Handles: PDFs (text extraction), images (vision)
 * Uses OpenAI to extract structured data
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log('OpenAI API Key check:', apiKey ? 'Present' : 'NOT FOUND');
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured.' },
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
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      );
    }

    console.log('Processing ' + documentType + ': ' + file.name + ' (' + file.type + ')');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;
    const extractionPrompt = getExtractionPrompt(documentType);

    let extractedData;

    // Check if it's a PDF or an image
    if (mimeType === 'application/pdf') {
      // For PDFs, extract text and use text-based GPT
      console.log('Processing PDF with text extraction...');
      
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      const pdfText = pdfData.text;
      
      console.log('Extracted ' + pdfText.length + ' characters from PDF');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: extractionPrompt + '\n\nDocument text:\n' + pdfText.substring(0, 15000),
          },
        ],
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      extractedData = JSON.parse(response.choices[0].message.content || '{}');
      
    } else if (mimeType.startsWith('image/')) {
      // For images, use Vision API
      console.log('Processing image with Vision API...');
      
      const base64 = buffer.toString('base64');

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

      extractedData = JSON.parse(response.choices[0].message.content || '{}');
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload a PDF or image (JPG, PNG).' },
        { status: 400 }
      );
    }

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
    console.error('Document upload error:', error.message);
    
    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { success: false, error: 'OpenAI quota exceeded. Please check your billing.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}

function getExtractionPrompt(documentType: string): string {
  switch (documentType) {
    case 'comps':
      return 'Analyze this real estate document and extract ALL comparable properties in JSON format: { "comps": [ { "address": "street address", "city": "city", "state": "state", "zipCode": "zip", "price": number, "rentPrice": number, "bedrooms": number, "bathrooms": number, "sqft": number, "yearBuilt": number, "soldDate": "YYYY-MM-DD", "daysOnMarket": number, "pricePerSqft": number, "type": "sale or rental", "status": "sold/active/rented" } ], "summary": "brief summary" }. Extract ALL properties found.';

    case 'estimate':
      return 'Extract contractor estimate data in JSON: { "contractor": { "name": "company", "phone": "number", "email": "email" }, "estimateDate": "YYYY-MM-DD", "totalCost": number, "lineItems": [ { "category": "kitchen|bathroom|roofing|hvac|electrical|plumbing|flooring|paint|windows|landscaping|other", "description": "description", "cost": number } ], "notes": "notes" }';

    case 'inspection':
      return 'Extract inspection findings in JSON: { "inspectionDate": "YYYY-MM-DD", "inspector": "name", "propertyAddress": "address", "majorIssues": [ { "category": "roof|foundation|electrical|plumbing|hvac|structural|other", "description": "issue", "severity": "critical|major|minor", "estimatedCost": number } ], "minorIssues": ["list"], "summary": "summary" }';

    case 'repair_photo':
      return 'Analyze this repair photo and estimate costs in JSON: { "issueType": "kitchen|bathroom|roofing|hvac|electrical|plumbing|flooring|paint|windows|structural|other", "description": "what needs repair", "severity": "minor|moderate|major", "estimatedCost": { "low": number, "high": number, "average": number }, "scopeOfWork": "recommended repairs", "notes": "observations" }';

    default:
      return 'Extract all relevant real estate information in JSON format.';
  }
}
