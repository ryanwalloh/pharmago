#!/usr/bin/env python
"""
One-time script to import FDA medicines to Railway database
Run with: python import_to_railway.py
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

# Import after Django setup
from import_full_dataset import import_medicines_full

if __name__ == "__main__":
    csv_path = 'drug_products.csv'
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found: {csv_path}")
        print("Current directory:", os.getcwd())
        print("Files in directory:", os.listdir('.'))
        sys.exit(1)
    
    print("🚀 Starting FDA medicines import to Railway...")
    print(f"📄 Using CSV file: {csv_path}")
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

