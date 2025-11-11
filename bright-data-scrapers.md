# Bright Data Scraper Configurations

Use these templates in your Bright Data dashboard to set up scrapers.

## 1. Zillow Property Details Scraper

**Dataset ID:** Use existing or create new
**Target URL:** `https://www.zillow.com/homedetails/{address}_zpid/{zpid}_zpid/`

**Fields to Extract:**
```javascript
{
  "zpid": "{{zpid}}",
  "address": "{{streetAddress}}",
  "city": "{{city}}",
  "state": "{{state}}",
  "zipcode": "{{zipcode}}",
  "price": "{{price}}",
  "zestimate": "{{zestimate}}",
  "rentZestimate": "{{rentZestimate}}",
  "bedrooms": "{{bedrooms}}",
  "bathrooms": "{{bathrooms}}",
  "squareFeet": "{{livingArea}}",
  "yearBuilt": "{{yearBuilt}}",
  "lotSize": "{{lotSize}}",
  "propertyType": "{{homeType}}",
  "taxAssessedValue": "{{taxAssessedValue}}",
  "hoaFee": "{{monthlyHoaFee}}",
  "priceHistory": "{{priceHistory}}",
  "nearbyHomes": "{{nearbyHomes}}"
}
```

## 2. Redfin Property Scraper

**Target URL:** `https://www.redfin.com/city/{city}/filter/property-type=house`

**Fields to Extract:**
```javascript
{
  "address": "{{address.streetAddress}}",
  "city": "{{address.city}}",
  "state": "{{address.state}}",
  "zipCode": "{{address.zip}}",
  "price": "{{price.value}}",
  "beds": "{{beds}}",
  "baths": "{{baths}}",
  "sqft": "{{sqft}}",
  "yearBuilt": "{{yearBuilt}}",
  "propertyType": "{{propertyType}}",
  "url": "{{url}}"
}
```

## 3. Realtor.com Property Scraper

**Target URL:** `https://www.realtor.com/realestateandhomes-search/{city}_{state}`

**Fields to Extract:**
```javascript
{
  "address": "{{location.address.line}}",
  "city": "{{location.address.city}}",
  "state": "{{location.address.state_code}}",
  "zipCode": "{{location.address.postal_code}}",
  "price": "{{list_price}}",
  "beds": "{{description.beds}}",
  "baths": "{{description.baths}}",
  "sqft": "{{description.sqft}}",
  "lotSize": "{{description.lot_sqft}}",
  "yearBuilt": "{{description.year_built}}",
  "propertyType": "{{description.type}}",
  "daysOnMarket": "{{description.sold_date}}"
}
```

## 4. Airbnb Short-Term Rental Scraper

**Target URL:** `https://www.airbnb.com/s/{city}--{state}/homes`

**Fields to Extract:**
```javascript
{
  "listing_id": "{{id}}",
  "title": "{{title}}",
  "price_per_night": "{{pricing.rate.amount}}",
  "bedrooms": "{{bedrooms}}",
  "bathrooms": "{{bathrooms}}",
  "accommodates": "{{person_capacity}}",
  "rating": "{{avg_rating}}",
  "review_count": "{{review_count}}",
  "superhost": "{{host.is_superhost}}",
  "amenities": "{{amenities}}",
  "url": "{{url}}",
  "image_url": "{{photos[0].picture}}",
  "monthly_price_factor": "{{pricing.monthly_price_factor}}"
}
```

## 5. County Records Scraper (Bexar County Example)

**Target URL:** `https://bexar.trueautomation.com/clientdb/Property.aspx?cid=1&prop_id={property_id}`

**Fields to Extract:**
```javascript
{
  "parcel_number": "{{parcel_number}}",
  "owner_name": "{{owner_name}}",
  "owner_address": "{{owner_mailing_address}}",
  "situs_address": "{{situs_address}}",
  "appraised_value": "{{appraised_value}}",
  "market_value": "{{market_value}}",
  "assessed_value": "{{assessed_value}}",
  "tax_amount": "{{tax_amount}}",
  "last_sale_date": "{{last_sale_date}}",
  "last_sale_price": "{{last_sale_price}}",
  "legal_description": "{{legal_description}}",
  "property_class": "{{property_class}}",
  "year_built": "{{year_built}}",
  "building_sqft": "{{building_sqft}}",
  "land_sqft": "{{land_sqft}}"
}
```

## 6. Foreclosure Auction Scraper

**Target URLs:**
- `https://www.auction.com/residential/tx/{city}`
- `https://www.foreclosure.com/tx/{city}`
- `https://www.zillow.com/homes/for_sale/{city}-tx/aucfsbo_lt/`

**Fields to Extract:**
```javascript
{
  "auction_id": "{{auction_id}}",
  "address": "{{address}}",
  "city": "{{city}}",
  "state": "{{state}}",
  "zipcode": "{{zipcode}}",
  "auction_date": "{{auction_date}}",
  "auction_time": "{{auction_time}}",
  "opening_bid": "{{opening_bid}}",
  "estimated_value": "{{estimated_value}}",
  "beds": "{{beds}}",
  "baths": "{{baths}}",
  "sqft": "{{sqft}}",
  "foreclosure_type": "{{foreclosure_type}}",
  "lender": "{{lender_name}}",
  "case_number": "{{case_number}}",
  "url": "{{url}}"
}
```

## 7. Sex Offender Registry Scraper

**Target URL:** `https://www.nsopw.gov/search?addressOrZip={zipcode}`

**Fields to Extract:**
```javascript
{
  "name": "{{name}}",
  "age": "{{age}}",
  "gender": "{{gender}}",
  "address": "{{address}}",
  "city": "{{city}}",
  "state": "{{state}}",
  "zipcode": "{{zipcode}}",
  "offenses": "{{offenses}}",
  "registration_date": "{{registration_date}}",
  "risk_level": "{{risk_level}}",
  "photo_url": "{{photo_url}}"
}
```

## 8. VRBO/HomeAway Scraper

**Target URL:** `https://www.vrbo.com/search/keywords:{city}-{state}`

**Fields to Extract:**
```javascript
{
  "listing_id": "{{listingId}}",
  "title": "{{headline}}",
  "price_per_night": "{{averageNightlyRate}}",
  "bedrooms": "{{bedrooms}}",
  "bathrooms": "{{bathrooms}}",
  "sleeps": "{{sleeps}}",
  "rating": "{{guestRating}}",
  "review_count": "{{reviewCount}}",
  "amenities": "{{amenities}}",
  "url": "{{detailsUrl}}",
  "image_url": "{{images[0].url}}"
}
```

---

## How to Set Up in Bright Data:

1. **Go to Bright Data Dashboard** → "Data Collector"
2. **Click "New Collector"**
3. **Select "Website"** as source type
4. **Enter Target URL** from above
5. **Configure Fields** using the JSON templates above
6. **Test the scraper** with a sample URL
7. **Save Dataset** and copy the Dataset ID
8. **Add Dataset ID** to your `.env` file

Example:
```bash
BRIGHT_DATA_ZILLOW_DATASET_ID="gd_abc123xyz"
BRIGHT_DATA_AIRBNB_DATASET_ID="gd_def456uvw"
BRIGHT_DATA_COUNTY_DATASET_ID="gd_ghi789rst"
```

## API Usage Example:

```javascript
// Trigger scraper
const response = await fetch('https://api.brightdata.com/datasets/v3/trigger', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BRIGHT_DATA_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    dataset_id: 'gd_your_dataset_id',
    include_errors: true,
    discover_by: [
      { url: 'https://www.zillow.com/homedetails/8302-Chivalry-St-San-Antonio-TX-78254/26432431_zpid/' }
    ]
  })
});

const { snapshot_id } = await response.json();

// Poll for results
const results = await fetch(
  `https://api.brightdata.com/datasets/v3/snapshot/${snapshot_id}?format=json`,
  {
    headers: { 'Authorization': `Bearer ${BRIGHT_DATA_API_TOKEN}` }
  }
);

const data = await results.json();
```

---

## Cost Optimization Tips:

1. **Cache results** - Store scraped data in database to avoid re-scraping
2. **Batch requests** - Scrape multiple properties in one job
3. **Use rate limiting** - Spread out requests to stay within free tier
4. **Prioritize free APIs** - Use RapidAPI Zillow first, Bright Data as fallback
5. **Set timeouts** - Don't wait more than 30 seconds for results

---

## Current Integration Status:

✅ RapidAPI Zillow - Working
✅ Free property lookup - Implemented
✅ County records service - Created
✅ Airbnb scraper - Created
✅ Area rating (Crime + Sex Offenders) - Created
⏳ Bright Data datasets - Need to be configured in dashboard
