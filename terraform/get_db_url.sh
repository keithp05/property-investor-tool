#!/bin/bash
ENDPOINT=$(terraform output -json | python3 -c "import sys, json; print(json.load(sys.stdin)['rds_endpoints']['value']['lab']['address'])")
PASSWORD=$(terraform state show 'random_password.db_password["lab"]' | grep "result " | awk '{print $3}' | tr -d '"')

echo "DATABASE_URL for Amplify:"
echo "postgresql://rentaliq_admin:${PASSWORD}@${ENDPOINT}:5432/rentaliq"
