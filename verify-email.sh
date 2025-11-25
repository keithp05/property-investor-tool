#!/bin/bash
# Quick script to verify an email address in AWS SES (for testing in sandbox mode)

if [ -z "$1" ]; then
  echo "Usage: ./verify-email.sh email@example.com"
  exit 1
fi

EMAIL=$1

echo "📧 Sending verification email to: $EMAIL"
aws ses verify-email-identity --email-address "$EMAIL" --region us-east-1

if [ $? -eq 0 ]; then
  echo "✅ Verification email sent to $EMAIL"
  echo "📬 Check the inbox and click the verification link from AWS"
  echo ""
  echo "To check status:"
  echo "  aws ses get-identity-verification-attributes --identities $EMAIL --region us-east-1"
else
  echo "❌ Failed to send verification email"
fi
