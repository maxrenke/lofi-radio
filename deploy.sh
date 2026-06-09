#!/bin/bash

# Lofi Radio Self-Host Deployment Script
# This script automates the deployment of lofi-radio with Docker

set -e  # Exit on any error

echo "🎵 Lofi Radio Self-Host Deployment"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Create deployment directory
DEPLOY_DIR="lofi-radio-deployment"
echo "📁 Creating deployment directory: $DEPLOY_DIR"

# Clean up existing deployment if it exists
if [ -d "$DEPLOY_DIR" ]; then
    echo "🧹 Cleaning up existing deployment..."
    cd "$DEPLOY_DIR"
    if [ -f "docker-compose.yml" ]; then
        docker compose down --volumes 2>/dev/null || true
    fi
    cd ..
    rm -rf "$DEPLOY_DIR"
fi

mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Clone the original lofi-radio repository
echo "📥 Cloning lofi-radio repository..."
git clone https://github.com/joan-tomas-1995/lofi-radio.git

# Copy Docker files from parent directory
echo "📋 Copying Docker configuration files..."
cp ../Dockerfile lofi-radio/
cp ../docker-compose.yml lofi-radio/
cp ../nginx.conf lofi-radio/
cp ../.dockerignore lofi-radio/

# Navigate to app directory
cd lofi-radio

# Build and start the application
echo "🏗️  Building and starting the application..."
docker compose up -d --build

# Wait for the application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Check if the container is running
if docker compose ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Your Lofi Radio is now running!"
    echo "📱 Access it at: http://localhost:3000"
    echo ""
    echo "🔧 Management commands:"
    echo "  View logs:    docker compose logs -f lofi-radio"
    echo "  Stop app:     docker compose down"
    echo "  Restart app:  docker compose restart"
    echo "  Update app:   git pull && docker compose up --build -d"
    echo ""
    echo "📂 App location: $(pwd)"
else
    echo "❌ Deployment failed. Check the logs:"
    docker compose logs lofi-radio
    exit 1
fi
