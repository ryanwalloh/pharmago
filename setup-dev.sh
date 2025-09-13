#!/bin/bash

# PharmaGo Backend Development Setup Script
# This script sets up the Django backend for local development

set -e  # Exit on any error

echo "🚀 Setting up PharmaGo Backend for Local Development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "backend/manage.py" ]; then
    print_error "Please run this script from the pharmago project root directory"
    exit 1
fi

# Navigate to backend directory
cd backend

print_status "Checking Python installation..."
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    print_error "Python is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

print_success "Python found: $($PYTHON_CMD --version)"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment already exists"
fi

# Activate virtual environment
print_status "Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install requirements
print_status "Installing Python dependencies..."
pip install -r requirements.txt

print_success "Dependencies installed successfully"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please create it with the provided configuration."
    print_status "Creating .env template..."
    cat > .env << EOF
DEBUG=1
SECRET_KEY=@lkf@7pbimd7=c_#5ake7_wxhvjle4s6!5s%kj^017tk&-)e!-

# Database configuration for local development
DB_NAME=pharmago
DB_USER=superpharmago
DB_PASSWORD=pharmagoldenkey
DB_HOST=localhost
DB_PORT=5432

# CORS and security settings
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# AWS S3 settings
AWS_ACCESS_KEY_ID=AKIA5RA7TEOC2ZAU5MG2
AWS_SECRET_ACCESS_KEY=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
AWS_STORAGE_BUCKET_NAME=pharmago-user-uploads
AWS_S3_REGION_NAME=ap-southeast-2

# Redis configuration for local development
REDIS_URL=redis://localhost:6379/1
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
EOF
    print_success ".env file created with default configuration"
else
    print_success ".env file already exists"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check database connection
print_status "Checking database connection..."
if python manage.py check --database default 2>/dev/null; then
    print_success "Database connection successful"
    
    # Run migrations
    print_status "Running database migrations..."
    python manage.py migrate
    print_success "Database migrations completed"
else
    print_warning "Cannot connect to database. Make sure Docker services are running:"
    print_status "Run: docker-compose -f docker-compose.services.yml up -d"
fi

# Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput
print_success "Static files collected"

print_success "Backend setup completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Start Docker services: docker-compose -f docker-compose.services.yml up -d"
echo "2. Run Django server: python manage.py runserver"
echo "3. Access admin at: http://localhost:8000/admin/"
echo ""
print_status "To activate virtual environment in future sessions:"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  source venv/Scripts/activate"
else
    echo "  source venv/bin/activate"
fi
