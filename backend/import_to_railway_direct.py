#!/usr/bin/env python
"""
Direct import script that uses DATABASE_URL environment variable
Bypasses .env file
"""

import os
import sys
import django

# Force DATABASE_URL to be used (override .env)
if 'DATABASE_URL' not in os.environ:
    print("❌ ERROR: DATABASE_URL environment variable not set!")
    print("Run: set DATABASE_URL=postgresql://...")
    sys.exit(1)

# Remove .env loading by setting this before Django loads
os.environ.setdefault('DJANGO_READ_DOT_ENV_FILE', 'False')

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')

# Override database settings before Django initializes
os.environ['DEBUG'] = 'False'

django.setup()

# Import after Django setup
from import_full_dataset import import_medicines_full

if __name__ == "__main__":
    csv_path = 'drug_products.csv'
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found: {csv_path}")
        print("Current directory:", os.getcwd())
        sys.exit(1)
    
    print("🚀 Starting FDA medicines import to Railway...")
    print(f"📄 Using CSV file: {csv_path}")
    print(f"🔗 Database: {os.environ['DATABASE_URL'][:50]}...")
    print("-" * 50)
    
    try:
        import_medicines_full(csv_path)
        print("-" * 50)
        print("✅ Import completed successfully!")
    except Exception as e:
        print(f"❌ Import failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

