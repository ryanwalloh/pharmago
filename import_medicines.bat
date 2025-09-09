@echo off
echo Starting medicine import...
docker-compose exec backend python manage.py load_fda_medicines --source philippine_fda --file data/drug_products.csv --limit 10
echo Import completed!
pause
