#!/bin/bash
#
# Development API Server Startup Script
# This script starts the API server with proper development environment variables
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Starting API Server (Development)    ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Set default environment variables for development
export DATABASE_URL=${DATABASE_URL:-"postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable"}
export TEMPORAL_HOST=${TEMPORAL_HOST:-"localhost:7233"}
export API_PORT=${API_PORT:-"8080"}

# IMPORTANT: Set CORS to allow frontend origin
# Remove any existing CORS_ALLOWED_ORIGINS to use the default
unset CORS_ALLOWED_ORIGINS

echo -e "${GREEN}✓${NC} Environment Configuration:"
echo -e "  ${YELLOW}DATABASE_URL:${NC} ${DATABASE_URL}"
echo -e "  ${YELLOW}TEMPORAL_HOST:${NC} ${TEMPORAL_HOST}"
echo -e "  ${YELLOW}API_PORT:${NC} ${API_PORT}"
echo -e "  ${YELLOW}CORS_ALLOWED_ORIGINS:${NC} (using defaults: http://localhost:3000,http://127.0.0.1:3000)"
echo ""

# Check if postgres is running
if ! nc -z localhost 5432 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC}  PostgreSQL doesn't seem to be running on localhost:5432"
    echo -e "   You may need to start it with: ${BLUE}docker-compose up -d postgres${NC}"
    echo ""
fi

# Check if temporal is running
if ! nc -z localhost 7233 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC}  Temporal doesn't seem to be running on localhost:7233"
    echo -e "   You may need to start it with: ${BLUE}docker-compose up -d temporal${NC}"
    echo ""
fi

echo -e "${GREEN}✓${NC} Starting API server..."
echo ""

# Start the API server
cd "$(dirname "$0")/.." || exit 1
go run cmd/api/main.go

