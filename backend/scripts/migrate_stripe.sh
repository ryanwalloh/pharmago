#!/bin/bash
# Stripe Payment Fields Migration Script
# This script applies the Stripe payment integration migrations

echo "🔄 Running Stripe payment fields migration..."

# Navigate to backend directory
cd "$(dirname "$0")/.." || exit

# Run migrations
python manage.py migrate orders 0006_add_payment_fields

echo "✅ Stripe payment fields migration completed!"
echo ""
echo "New fields added to Order model:"
echo "  - payment_method (cod, card, gcash, paymaya, bank_transfer)"
echo "  - stripe_payment_intent_id (for Stripe transactions)"
echo "  - stripe_payment_status (payment tracking)"
echo ""
echo "📝 Note: Railway will automatically run migrations on deployment"

