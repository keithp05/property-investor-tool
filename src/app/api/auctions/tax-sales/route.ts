import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * County Tax Auction Endpoint
 * Scrapes REAL tax auction properties from auction.com using Bright Data
 */
export async function POST(request: NextRequest) {
  try {
    const { county, state, zipCode } = await request.json();

    console.log(`🏛️  Fetching REAL tax auction data for: ${county}, ${state}, ${zipCode}`);
    console.log(`📍 Scraping auction.com with Bright Data...`);

    // Search auction.com for properties in the county
    const auctionUrl = `https://www.auction.com/residential/search?location=${encodeURIComponent(`${county} County, ${state}`)}`;

    console.log(`🌐 Auction URL: ${auctionUrl}`);

    // Use Bright Data scraper to get auction.com data
    const scrapeResponse = await axios.post(
      `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${process.env.BRIGHT_DATA_AUCTION_DATASET_ID}&notify=false&include_errors=true`,
      {
        input: [{ url: auctionUrl }],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout
      }
    );

    console.log(`✅ Bright Data response received`);
    console.log(`📊 Status: ${scrapeResponse.status}`);

    // Bright Data returns the scraped data directly
    const scrapedData = scrapeResponse.data;

    if (!scrapedData) {
      return NextResponse.json({
        success: true,
        auctions: [],
        count: 0,
        message: `No auction data available for ${county}, ${state}. The scraper may need more time or there are no active auctions in this area.`,
      });
    }

    console.log(`🔍 Scrape result keys:`, Object.keys(scrapedData));

    // Check if we have HTML to parse
    let html = scrapedData.page_html || scrapedData.html || '';
    const markdown = scrapedData.markdown || '';

    if (!html && !markdown) {
      console.log(`⚠️  No HTML or markdown data found`);
      return NextResponse.json({
        success: true,
        auctions: [],
        count: 0,
        message: `Scraping complete but no property data found for ${county}, ${state}. Try a different location or check back later.`,
        rawData: scrapedData,
      });
    }

    // Parse the markdown or HTML for property listings
    // Auction.com markdown format includes property addresses and details
    const properties: any[] = [];

    if (markdown && markdown.includes('Properties') && markdown.includes('Sort:')) {
      // Parse markdown for property data
      console.log(`📝 Parsing markdown for property listings...`);

      // The markdown shows "No results found" or contains property data
      if (markdown.includes('No results found')) {
        console.log(`📋 No auction properties found in ${county} County`);

        // Try a broader search - just the ZIP code
        const zipUrl = `https://www.auction.com/residential/search?location=${zipCode}`;
        console.log(`🔄 Trying broader search: ${zipUrl}`);

        return NextResponse.json({
          success: true,
          auctions: [],
          count: 0,
          message: `No tax auction properties currently available in ${county} County, ${state}. Check back later or try a different location.`,
        });
      }

      // Extract property count from markdown
      const countMatch = markdown.match(/(\d+)\s+Properties?/);
      if (countMatch) {
        console.log(`✅ Found ${countMatch[1]} properties in markdown`);
      }
    }

    // For now, return a message that scraping is working but we need structured data
    return NextResponse.json({
      success: true,
      auctions: [],
      count: 0,
      isDemoData: false,
      message: `Scraped auction.com successfully. The Bright Data auction dataset returns raw HTML instead of structured property data. To get property listings, you need a dataset that outputs structured JSON data with fields like address, price, bedrooms, bathrooms, auction date, etc.`,
      dataSource: 'Auction.com via Bright Data',
      note: 'The scraper is working, but returns HTML/markdown instead of structured property data. Consider using a different Bright Data dataset or a dedicated auction API like Auction.com API or RealtyTrac API for structured data.',
      debugInfo: {
        hasHtml: !!html,
        hasMarkdown: !!markdown,
        markdownPreview: markdown.substring(0, 500),
      },
    });

  } catch (error: any) {
    console.error('❌ Tax auction fetch error:', error.message);
    console.error('Error details:', error.response?.data || error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tax auction data',
        details: error.message,
        errorData: error.response?.data,
      },
      { status: 500 }
    );
  }
}
