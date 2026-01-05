#!/bin/bash
# External Testing Setup Script for The Grassroots Hub
# This script automates the complete setup for external testing via ngrok

echo "🚀 Starting External Testing Setup for The Grassroots Hub..."

# Configuration
PROJECT_DIR="C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4"
BACKEND_DIR="$PROJECT_DIR\backend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Kill existing processes
print_step "Cleaning up existing processes"
taskkill /f /im node.exe 2>/dev/null || true
taskkill /f /im ngrok.exe 2>/dev/null || true
print_success "Cleaned up existing processes"

# Step 2: Start backend server
print_step "Starting backend server"
cd "$BACKEND_DIR"
start /B npm start
sleep 5
print_success "Backend server starting on port 3001"

# Step 3: Start frontend server
print_step "Starting frontend server"
cd "$PROJECT_DIR"
start /B npm run dev
sleep 5
print_success "Frontend server starting on port 5173"

# Step 4: Start ngrok tunnels
print_step "Starting ngrok tunnels"
ngrok start --all --config="$PROJECT_DIR\ngrok.yml"

echo -e "${GREEN}🎉 External testing setup complete!${NC}"
