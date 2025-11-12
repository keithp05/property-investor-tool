#!/bin/bash
# Package Lambda function for deployment

cd "$(dirname "$0")"

echo "📦 Packaging Lambda function..."

# Create zip file
zip -j property-refresh-cron.zip index.js

echo "✅ Lambda function packaged: property-refresh-cron.zip"
