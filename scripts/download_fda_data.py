#!/usr/bin/env python3
"""
Script to download FDA Orange Book data
"""

import requests
import csv
import json
import os
from datetime import datetime

def download_orange_book():
    """Download FDA Orange Book data"""
    
    # FDA Orange Book URLs (these may change, check FDA website)
    urls = {
        'orange_book': 'https://www.fda.gov/media/76860/download',  # Example URL
        'drugs_fda': 'https://www.fda.gov/media/76860/download'     # Example URL
    }
    
    print("Downloading FDA Orange Book data...")
    
    # Create data directory
    os.makedirs('data/fda', exist_ok=True)
    
    for name, url in urls.items():
        try:
            print(f"Downloading {name}...")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Save the file
            filename = f"data/fda/{name}_{datetime.now().strftime('%Y%m%d')}.csv"
            with open(filename, 'wb') as f:
                f.write(response.content)
            
            print(f"Downloaded {filename}")
            
        except requests.exceptions.RequestException as e:
            print(f"Error downloading {name}: {e}")
            print("Please manually download from FDA website:")
            print("https://www.fda.gov/drugs/drug-approvals-and-databases/approved-drug-products-therapeutic-equivalence-evaluations-orange-book")

def create_sample_data():
    """Create sample FDA data for testing"""
    
    print("Creating sample FDA data...")
    
    # Sample Orange Book data
    sample_data = [
        {
            'Drug Name': 'Paracetamol',
            'Generic Name': 'Acetaminophen',
            'Dosage Form': 'TABLET',
            'Strength': '500mg',
            'Drug Class': 'ANALGESICS',
            'NDC': '12345-678-90',
            'Manufacturer': 'Generic Pharma Inc.'
        },
        {
            'Drug Name': 'Ibuprofen',
            'Generic Name': 'Ibuprofen',
            'Dosage Form': 'TABLET',
            'Strength': '400mg',
            'Drug Class': 'ANALGESICS',
            'NDC': '12345-678-91',
            'Manufacturer': 'Generic Pharma Inc.'
        },
        {
            'Drug Name': 'Amoxicillin',
            'Generic Name': 'Amoxicillin',
            'Dosage Form': 'CAPSULE',
            'Strength': '250mg',
            'Drug Class': 'ANTIBIOTICS',
            'NDC': '12345-678-92',
            'Manufacturer': 'Generic Pharma Inc.'
        },
        {
            'Drug Name': 'Loratadine',
            'Generic Name': 'Loratadine',
            'Dosage Form': 'TABLET',
            'Strength': '10mg',
            'Drug Class': 'ANTIHISTAMINES',
            'NDC': '12345-678-93',
            'Manufacturer': 'Generic Pharma Inc.'
        },
        {
            'Drug Name': 'Omeprazole',
            'Generic Name': 'Omeprazole',
            'Dosage Form': 'CAPSULE',
            'Strength': '20mg',
            'Drug Class': 'ANTACIDS',
            'NDC': '12345-678-94',
            'Manufacturer': 'Generic Pharma Inc.'
        }
    ]
    
    # Save sample data
    os.makedirs('data/fda', exist_ok=True)
    filename = 'data/fda/sample_orange_book.csv'
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        fieldnames = sample_data[0].keys()
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sample_data)
    
    print(f"Created sample data: {filename}")

if __name__ == "__main__":
    print("FDA Data Download Script")
    print("=======================")
    
    # Try to download real data, fallback to sample
    try:
        download_orange_book()
    except Exception as e:
        print(f"Could not download real data: {e}")
        print("Creating sample data instead...")
        create_sample_data()
    
    print("\nNext steps:")
    print("1. Run: python manage.py generate_sample_medicines --count 100")
    print("2. Or run: python manage.py load_fda_medicines --source orange_book --file data/fda/sample_orange_book.csv")
