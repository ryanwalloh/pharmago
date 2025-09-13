#!/bin/bash

# PharmaGo Frontend Development Setup Script
# This script sets up the React frontend for local development

set -e  # Exit on any error

echo "🚀 Setting up PharmaGo Frontend for Local Development..."

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
if [ ! -f "web-frontend/package.json" ]; then
    print_error "Please run this script from the pharmago project root directory"
    exit 1
fi

# Navigate to web-frontend directory
cd web-frontend

print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    print_status "Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js found: $NODE_VERSION"

print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm found: v$NPM_VERSION"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_warning "node_modules directory already exists"
    read -p "Do you want to reinstall dependencies? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing existing node_modules..."
        rm -rf node_modules
        rm -f package-lock.json
    else
        print_status "Skipping dependency installation"
    fi
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed successfully"
else
    print_success "Dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating with default configuration..."
    cat > .env << EOF
# Google Maps API Key
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyANWzmzRztUKvOfJcg1SA5mA6GDl5ijjo4

# API configuration for local development
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_BACKEND_URL=http://localhost:8000

# Development settings
GENERATE_SOURCEMAP=true
CHOKIDAR_USEPOLLING=false
WATCHPACK_POLLING=false
EOF
    print_success ".env file created with default configuration"
else
    print_success ".env file already exists"
fi

# Check if backend is running
print_status "Checking if backend is accessible..."
if curl -s http://localhost:8000/api/v1/ > /dev/null 2>&1; then
    print_success "Backend is running and accessible"
else
    print_warning "Backend is not accessible at http://localhost:8000"
    print_status "Make sure to start the Django backend:"
    echo "  1. cd backend"
    echo "  2. source venv/bin/activate (or venv/Scripts/activate on Windows)"
    echo "  3. python manage.py runserver"
fi

print_success "Frontend setup completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Start the React development server: npm start"
echo "2. Open browser to: http://localhost:3000"
echo "3. Make sure backend is running on: http://localhost:8000"
echo ""
print_status "Development commands:"
echo "  npm start          - Start development server"
echo "  npm run build      - Build for production"
echo "  npm test           - Run tests"
echo "  npm run eject      - Eject from Create React App (not recommended)"
