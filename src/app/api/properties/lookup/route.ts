import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Property Lookup Endpoint
 * Searches for a property by address and returns basic details from Zillow
 * Used in the landlord property addition flow to auto-populate form fields
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking up property:', address);

    let response: any = null;
    let usingBrightData = false;

    // Try RapidAPI Zillow first
    const statusTypes = ['ForSale', 'RecentlySold', 'ForRent'];

    for (const statusType of statusTypes) {
      try {
        response = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
          params: {
            location: address,
            status_type: statusType,
            page: 1,
          },
          headers: {
            'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          },
          timeout: 15000,
        });

        if (response.data?.props && response.data.props.length > 0) {
          console.log(`✅ Found property with RapidAPI (${statusType})`);
          break;
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.log(`⚠️  RapidAPI rate limited, will try Bright Data...`);
          break; // Exit loop to try Bright Data
        }
        console.log(`⚠️  Failed to search with ${statusType}:`, error.message);
        continue;
      }
    }

    // If RapidAPI failed or rate limited, try Bright Data with Zillow search
    if (!response || !response.data?.props || response.data.props.length === 0) {
      console.log('🌐 Trying Bright Data with Zillow search...');

      try {
        // First, construct a Zillow search URL from the address
        const searchAddress = address.replace(/[^\w\s,]/g, '').replace(/\s+/g, '-').toLowerCase();
        const zillowSearchUrl = `https://www.zillow.com/homes/${encodeURIComponent(searchAddress)}`;

        console.log(`📍 Bright Data search URL: ${zillowSearchUrl}`);

        // Trigger Bright Data scrape job
        const brightDataTrigger = await axios.post(
          `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${process.env.BRIGHT_DATA_DATASET_ID || 'gd_lfqkr8wm13ixtbd8f5'}&include_errors=true`,
          [
            {
              url: zillowSearchUrl
            }
          ],
          {
            headers: {
              'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        console.log(`📊 Bright Data trigger status: ${brightDataTrigger.status}`);

        // Extract snapshot_id from response
        let snapshotId = null;
        if (brightDataTrigger.data?.snapshot_id) {
          snapshotId = brightDataTrigger.data.snapshot_id;
        } else if (typeof brightDataTrigger.data === 'string') {
          snapshotId = brightDataTrigger.data;
        }

        if (snapshotId) {
          console.log(`🔄 Polling for results with snapshot ID: ${snapshotId}`);

          // Poll for results (max 20 seconds, check every 2 seconds)
          let attempts = 0;
          const maxAttempts = 10;
          let brightDataResults = null;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            attempts++;

            try {
              const snapshotResponse = await axios.get(
                `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
                  },
                  timeout: 5000,
                }
              );

              console.log(`🔍 Poll attempt ${attempts}: Status ${snapshotResponse.status}`);

              if (snapshotResponse.status === 200 && snapshotResponse.data) {
                brightDataResults = snapshotResponse.data;
                console.log(`✅ Bright Data results ready after ${attempts * 2} seconds`);
                break;
              }
            } catch (pollError: any) {
              if (pollError.response?.status === 404) {
                console.log(`⏳ Snapshot not ready yet (attempt ${attempts}/${maxAttempts})`);
                continue;
              } else {
                console.log(`⚠️  Poll error:`, pollError.message);
                break;
              }
            }
          }

          // Process results if we got them
          if (brightDataResults && Array.isArray(brightDataResults) && brightDataResults.length > 0) {
            const brightDataProperty = brightDataResults[0];
            console.log(`✅ Bright Data returned ${brightDataResults.length} properties`);

            // Extract street address - Bright Data returns it as an object or nested field
            let streetAddress = address; // fallback to search address
            if (typeof brightDataProperty.address === 'string') {
              streetAddress = brightDataProperty.address;
            } else if (brightDataProperty.address?.streetAddress) {
              streetAddress = brightDataProperty.address.streetAddress;
            } else if (brightDataProperty.streetAddress) {
              streetAddress = brightDataProperty.streetAddress;
            }

            // Convert Bright Data format to our format
            response = {
              data: {
                props: [{
                  address: streetAddress,
                  addressCity: brightDataProperty.city || brightDataProperty.address?.city,
                  addressState: brightDataProperty.state || brightDataProperty.address?.state,
                  addressZipcode: brightDataProperty.zipcode || brightDataProperty.zip_code || brightDataProperty.address?.zipcode,
                  bedrooms: brightDataProperty.bedrooms,
                  bathrooms: brightDataProperty.bathrooms,
                  livingArea: brightDataProperty.living_area || brightDataProperty.sqft || brightDataProperty.livingArea,
                  yearBuilt: brightDataProperty.year_built || brightDataProperty.yearBuilt,
                  propertyType: brightDataProperty.property_type || brightDataProperty.propertyType || 'SINGLE_FAMILY',
                  price: brightDataProperty.price || brightDataProperty.listing_price,
                  zestimate: brightDataProperty.zestimate,
                  zpid: brightDataProperty.zpid,
                  detailUrl: brightDataProperty.url || brightDataProperty.listing_url,
                }]
              }
            };
            usingBrightData = true;
            console.log(`✅ Found property with Bright Data`);
          } else {
            console.log(`⚠️  Bright Data polling timed out or returned no results`);
          }
        } else {
          console.log(`⚠️  No snapshot ID received from Bright Data`);
        }
      } catch (brightDataError: any) {
        console.log(`⚠️  Bright Data error:`, brightDataError.response?.status || brightDataError.message);
        if (brightDataError.response?.data) {
          console.log(`⚠️  Bright Data error details:`, JSON.stringify(brightDataError.response.data).substring(0, 200));
        }
      }
    }

    if (!response || !response.data?.props || response.data.props.length === 0) {
      console.log('⚠️  No properties found for address:', address);
      return NextResponse.json({
        success: false,
        error: 'Property not found. Please check the address and try again, or enter details manually.',
      });
    }

    // Get the first matching property
    const zillowData = response.data.props[0];
    console.log('✅ Found property:', zillowData.address);

    // Parse the address from Zillow response
    const addressParts = zillowData.address || address;
    const cityStateZip = zillowData.addressCity && zillowData.addressState && zillowData.addressZipcode
      ? {
          city: zillowData.addressCity,
          state: zillowData.addressState,
          zipCode: zillowData.addressZipcode,
        }
      : parseAddress(address);

    // Fetch additional property details if we have a ZPID
    let additionalDetails: any = {};
    if (zillowData.zpid) {
      try {
        console.log('📊 Fetching additional property details for ZPID:', zillowData.zpid);
        const detailsResponse = await axios.get('https://zillow-com1.p.rapidapi.com/property', {
          params: {
            zpid: zillowData.zpid,
          },
          headers: {
            'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
            'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          },
          timeout: 10000,
        });

        if (detailsResponse.data) {
          const details = detailsResponse.data;
          additionalDetails = {
            lotSize: details.lotSize || details.resoFacts?.lotSize,
            taxAssessedValue: details.taxAssessedValue,
            lastSoldPrice: details.lastSoldPrice,
            lastSoldDate: details.dateSold,
            hoaFee: details.monthlyHoaFee,
            heating: details.heating,
            cooling: details.cooling,
            parking: details.parkingFeatures,
            description: details.description,
            priceHistory: details.priceHistory,
          };
          console.log('✅ Fetched additional property details');
        }
      } catch (detailsError: any) {
        console.log('⚠️  Could not fetch additional details:', detailsError.message);
        // Continue without additional details
      }
    }

    // Fetch public records data for purchase history and mortgage info
    let publicRecordsData: any = {};
    try {
      console.log('🏛️  Fetching public records data...');
      const fullAddress = `${addressParts}, ${cityStateZip.city}, ${cityStateZip.state} ${cityStateZip.zipCode}`;
      const publicRecordsUrl = `https://www.zillow.com/homedetails/${encodeURIComponent(fullAddress.replace(/\s+/g, '-').toLowerCase())}_zpid/${zillowData.zpid || ''}_zpid/`;

      // Use Bright Data to scrape public records
      const publicRecordsTrigger = await axios.post(
        `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${process.env.BRIGHT_DATA_DATASET_ID || 'gd_lfqkr8wm13ixtbd8f5'}&include_errors=true`,
        [
          {
            url: publicRecordsUrl
          }
        ],
        {
          headers: {
            'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      let snapshotId = publicRecordsTrigger.data?.snapshot_id || publicRecordsTrigger.data;

      if (snapshotId) {
        // Poll for public records (max 10 seconds)
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            const snapshot = await axios.get(
              `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
              {
                headers: { 'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}` },
                timeout: 3000,
              }
            );

            if (snapshot.status === 200 && snapshot.data && Array.isArray(snapshot.data) && snapshot.data.length > 0) {
              const records = snapshot.data[0];
              publicRecordsData = {
                purchaseDate: records.last_sold_date || records.lastSoldDate || additionalDetails.lastSoldDate,
                purchasePrice: records.last_sold_price || records.lastSoldPrice || additionalDetails.lastSoldPrice,
                mortgageInfo: records.mortgage || records.loan_info,
                deedInfo: records.deed || records.deed_info,
                taxInfo: records.tax_history || records.property_tax,
              };
              console.log('✅ Public records data fetched from Zillow');
              break;
            }
          } catch (pollError: any) {
            if (pollError.response?.status === 404) {
              continue; // Still processing
            }
            break;
          }
        }
      }
    } catch (publicRecordsError: any) {
      console.log('⚠️  Could not fetch Zillow public records:', publicRecordsError.message);
      // Continue without Zillow public records
    }

    // Fetch County Tax Records
    let countyRecordsData: any = {};
    try {
      console.log('🏛️  Fetching county tax records...');

      // Determine county assessor URL based on state/county
      let countyUrl = '';
      const state = cityStateZip.state.toUpperCase();
      const city = cityStateZip.city.toLowerCase();

      // Texas County URLs
      if (state === 'TX') {
        if (city.includes('san antonio') || cityStateZip.zipCode.startsWith('782')) {
          // Bexar County (San Antonio)
          countyUrl = `https://bexar.trueprodigy.com/clientdb/Property.aspx?prop_id=&cid=110&addr=${encodeURIComponent(addressParts)}`;
        } else if (city.includes('houston') || cityStateZip.zipCode.startsWith('77')) {
          // Harris County (Houston)
          countyUrl = `https://publicaccess.hcad.org/search.html?addr=${encodeURIComponent(addressParts)}`;
        } else if (city.includes('dallas')) {
          // Dallas County
          countyUrl = `https://www.dallascad.org/SearchAddr.aspx?addr=${encodeURIComponent(addressParts)}`;
        } else if (city.includes('austin')) {
          // Travis County (Austin)
          countyUrl = `https://stage.wcad.org/property-search?addr=${encodeURIComponent(addressParts)}`;
        }
      }
      // Add more states/counties as needed

      if (countyUrl) {
        console.log(`📍 County records URL: ${countyUrl}`);

        // Use Bright Data to scrape county records
        const countyTrigger = await axios.post(
          `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${process.env.BRIGHT_DATA_DATASET_ID || 'gd_lfqkr8wm13ixtbd8f5'}&include_errors=true`,
          [
            {
              url: countyUrl
            }
          ],
          {
            headers: {
              'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );

        let countySnapshotId = countyTrigger.data?.snapshot_id || countyTrigger.data;

        if (countySnapshotId) {
          // Poll for county records (max 10 seconds)
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
              const countySnapshot = await axios.get(
                `https://api.brightdata.com/datasets/v3/snapshot/${countySnapshotId}?format=json`,
                {
                  headers: { 'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}` },
                  timeout: 3000,
                }
              );

              if (countySnapshot.status === 200 && countySnapshot.data) {
                const countyData = countySnapshot.data[0] || {};
                countyRecordsData = {
                  ownerName: countyData.owner_name || countyData.ownerName,
                  ownerAddress: countyData.owner_address || countyData.ownerAddress,
                  legalDescription: countyData.legal_description || countyData.legalDescription,
                  appraisedValue: countyData.appraised_value || countyData.appraisedValue,
                  assessedValue: countyData.assessed_value || countyData.assessedValue,
                  taxAmount: countyData.tax_amount || countyData.taxAmount,
                  taxYear: countyData.tax_year || countyData.taxYear,
                  exemptions: countyData.exemptions,
                  saleDate: countyData.sale_date || countyData.saleDate,
                  salePrice: countyData.sale_price || countyData.salePrice,
                  deedDate: countyData.deed_date || countyData.deedDate,
                  deedBook: countyData.deed_book || countyData.deedBook,
                  parcelNumber: countyData.parcel_number || countyData.parcelNumber,
                  lotSize: countyData.lot_size || countyData.lotSize,
                  yearBuilt: countyData.year_built || countyData.yearBuilt,
                };
                console.log('✅ County tax records fetched');
                break;
              }
            } catch (countyPollError: any) {
              if (countyPollError.response?.status === 404) {
                continue; // Still processing
              }
              break;
            }
          }
        }
      } else {
        console.log('⚠️  County assessor URL not configured for this location');
      }
    } catch (countyError: any) {
      console.log('⚠️  Could not fetch county records:', countyError.message);
      // Continue without county records
    }

    // Return structured property data
    const property = {
      address: addressParts,
      city: cityStateZip.city,
      state: cityStateZip.state,
      zipCode: cityStateZip.zipCode,

      // Basic property details
      bedrooms: zillowData.bedrooms || null,
      bathrooms: zillowData.bathrooms || null,
      squareFeet: zillowData.livingArea || null,
      yearBuilt: zillowData.yearBuilt || null,
      propertyType: zillowData.propertyType || 'SINGLE_FAMILY',
      estimatedValue: zillowData.price || zillowData.zestimate || null,

      // Additional details from extended API
      ...additionalDetails,

      // Public records data
      ...publicRecordsData,

      // County tax records
      countyRecords: countyRecordsData,

      // Zillow metadata
      zillowUrl: zillowData.detailUrl || null,
      zpid: zillowData.zpid || null,
    };

    return NextResponse.json({
      success: true,
      property,
      message: 'Property found successfully',
    });

  } catch (error: any) {
    console.error('❌ Property lookup error:', error.message);

    // Handle specific error types
    if (error.response?.status === 429) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.',
        },
        { status: 429 }
      );
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request timed out. Please try again.',
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to lookup property. Please try entering details manually.',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to parse address string into components
 * Format: "123 Main St, San Antonio, TX 78253"
 */
function parseAddress(fullAddress: string): { city: string; state: string; zipCode: string } {
  try {
    const parts = fullAddress.split(',').map(p => p.trim());

    if (parts.length >= 3) {
      const city = parts[parts.length - 2];
      const stateZip = parts[parts.length - 1].split(' ');
      const state = stateZip[0];
      const zipCode = stateZip[1] || '';

      return { city, state, zipCode };
    }

    // Fallback defaults
    return { city: '', state: '', zipCode: '' };
  } catch (error) {
    console.error('Address parsing error:', error);
    return { city: '', state: '', zipCode: '' };
  }
}
