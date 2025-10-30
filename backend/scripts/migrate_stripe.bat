@echo off
REM Stripe Payment Fields Migration Script
REM This script applies the Stripe payment integration migrations

echo ========================================
echo  Stripe Payment Migration
echo ========================================
echo.

cd /d "%~dp0.."

echo Running migrations...
python manage.py migrate orders 0006_add_payment_fields

echo.
echo ========================================
echo  Migration Completed!
echo ========================================
echo.
echo New fields added to Order model:
echo   - payment_method (cod, card, gcash, paymaya, bank_transfer)
echo   - stripe_payment_intent_id (for Stripe transactions)
echo   - stripe_payment_status (payment tracking)
echo.
echo NOTE: Railway will automatically run migrations on deployment
echo.
pause

