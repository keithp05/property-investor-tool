# Property Data Refresh Feature

## Overview

RentalIQ automatically refreshes property data from Zillow on a monthly basis to keep property values, market rents, CMA analysis, and rental estimates up to date.

## Features

### 1. Manual Refresh Button

On any property details page, landlords can click the **"Refresh Data"** button to immediately fetch fresh data from Zillow including:

- Property details (bedrooms, bathrooms, square feet, year built)
- Estimated value (Zestimate)
- Market rent (Rent Zestimate)
- CMA (Comparative Market Analysis)
- Section 8 Fair Market Rent data

**Location:** Property Details Page → Top right corner (blue button with refresh icon)

### 2. Automated Monthly Refresh

All properties in the system are automatically refreshed on the 1st of every month at 2 AM UTC.

## Architecture

### API Endpoints

#### `/api/properties/refresh` (POST)
Refreshes a single property's data from Zillow.

**Request:**
```json
{
  "propertyId": "cly123456789"
}
```

**Response:**
```json
{
  "success": true,
  "property": { /* updated property data */ },
  "message": "Property data refreshed successfully"
}
```

#### `/api/cron/refresh-properties` (POST)
Cron job endpoint to refresh all properties in the system.

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Property refresh cron job completed",
  "totalProperties": 50,
  "successCount": 48,
  "failureCount": 2,
  "results": [
    {
      "propertyId": "abc123",
      "address": "123 Main St",
      "success": true,
      "estimatedValue": 250000,
      "marketRent": 1500
    }
  ]
}
```

#### `/api/cron/refresh-properties` (GET)
Check how many properties need refresh (older than 30 days).

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "totalProperties": 50,
  "needsRefreshCount": 12,
  "message": "12 of 50 properties need refresh"
}
```

### AWS Infrastructure

The monthly refresh is powered by:

1. **AWS EventBridge Scheduler** - Triggers cron job on 1st of every month at 2 AM UTC
2. **AWS Lambda** - Calls the API endpoint with proper authentication
3. **Next.js API Route** - Processes the refresh for all properties

## Deployment

### Prerequisites

1. Generate a secure cron secret:
```bash
openssl rand -base64 32
```

2. Add to environment variables:
```bash
CRON_SECRET=your-generated-secret
```

### Deploy Infrastructure

1. Package the Lambda function:
```bash
cd terraform/lambda
./package.sh
```

2. Initialize Terraform (if not already done):
```bash
cd terraform
terraform init
```

3. Create a `terraform.tfvars` file:
```hcl
cron_secret     = "your-generated-secret"
amplify_domain  = "https://your-app.amplifyapp.com"
```

4. Deploy the EventBridge and Lambda resources:
```bash
terraform plan
terraform apply
```

### Verify Deployment

1. Check EventBridge schedule:
```bash
aws scheduler get-schedule --name rentaliq-monthly-property-refresh
```

2. Check Lambda function:
```bash
aws lambda get-function --function-name rentaliq-property-refresh-cron
```

3. Test the cron endpoint manually:
```bash
curl -X POST https://your-app.amplifyapp.com/api/cron/refresh-properties \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

4. Check cron status:
```bash
curl -X GET https://your-app.amplifyapp.com/api/cron/refresh-properties \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Testing

### Test Manual Refresh

1. Navigate to any property details page
2. Click the **"Refresh Data"** button
3. Wait for the success message
4. Verify the property data is updated

### Test Automated Cron Job

1. Invoke the Lambda function manually:
```bash
aws lambda invoke \
  --function-name rentaliq-property-refresh-cron \
  --payload '{"cronSecret":"YOUR_CRON_SECRET"}' \
  response.json
```

2. Check the response:
```bash
cat response.json
```

3. View CloudWatch logs:
```bash
aws logs tail /aws/lambda/rentaliq-property-refresh-cron --follow
```

## Monitoring

### CloudWatch Logs

- **Lambda logs:** `/aws/lambda/rentaliq-property-refresh-cron`
- **Amplify logs:** `/aws/amplify/d3q1fuby25122q`

### Metrics to Monitor

1. **Success rate** - Percentage of properties successfully refreshed
2. **API response time** - Time to refresh each property
3. **Rate limit errors** - Zillow API rate limiting
4. **Failed properties** - Properties that couldn't be refreshed

### Alerts (Recommended)

Create CloudWatch alarms for:
- Lambda function errors
- High failure rate (>10%)
- Lambda timeout (>5 minutes)
- EventBridge schedule misfire

## Cost Estimation

### Monthly Costs

- **EventBridge Scheduler:** $0.00 (12 invocations/year < free tier)
- **Lambda:** ~$0.01 (assumes 100 properties, 300s runtime)
- **Zillow API calls:** $0.00 - $10.00 (depends on subscription)

**Total estimated cost:** $0.01 - $10.01/month

## Troubleshooting

### Issue: Cron job fails with "Unauthorized"

**Solution:** Verify `CRON_SECRET` environment variable matches in:
- Lambda function environment variables
- Next.js `.env` file
- Terraform variables

### Issue: Properties not refreshing

**Solution:**
1. Check CloudWatch logs for API errors
2. Verify Zillow API key is valid
3. Check rate limiting (add delay between requests)
4. Verify database connection

### Issue: Lambda timeout

**Solution:**
1. Increase Lambda timeout (currently 5 minutes)
2. Add pagination to process properties in batches
3. Reduce delay between API calls

### Issue: EventBridge not triggering

**Solution:**
1. Verify schedule is enabled
2. Check IAM permissions for EventBridge role
3. Verify Lambda permission allows EventBridge invocation

## Future Enhancements

1. **Batch processing** - Process properties in parallel batches for faster execution
2. **Selective refresh** - Only refresh properties that haven't been updated in 30+ days
3. **Notification system** - Email landlords when property values change significantly
4. **Error recovery** - Retry failed properties with exponential backoff
5. **Dashboard widget** - Show last refresh time and next scheduled refresh
6. **Manual bulk refresh** - Allow landlords to refresh all their properties at once
