#!/bin/bash
#
# Development Worker Startup Script
# This script starts the Temporal worker with proper development environment variables
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Starting Temporal Worker (Development)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Set default environment variables for development
export DATABASE_URL=${DATABASE_URL:-"postgres://workflow_user:workflow_pass@localhost:5432/workflow_db?sslmode=disable"}
export TEMPORAL_HOST=${TEMPORAL_HOST:-"localhost:7233"}

echo -e "${GREEN}✓${NC} Environment Configuration:"
echo -e "  ${YELLOW}DATABASE_URL:${NC} ${DATABASE_URL}"
echo -e "  ${YELLOW}TEMPORAL_HOST:${NC} ${TEMPORAL_HOST}"
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

echo -e "${GREEN}✓${NC} Starting Temporal worker..."
echo ""

# Start the worker
cd "$(dirname "$0")/.." || exit 1
go run cmd/worker/main.go

