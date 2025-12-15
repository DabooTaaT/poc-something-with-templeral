#!/bin/bash

# Database Migration Script
# Usage: ./scripts/migrate.sh

set -e

echo "🚀 Running database migrations..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Database connection details
DB_CONTAINER="workflow_postgres"
DB_USER="workflow_user"
DB_NAME="workflow_db"
MIGRATIONS_DIR="$PROJECT_ROOT/internal/db/migrations"

# Check if container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "❌ Error: PostgreSQL container '$DB_CONTAINER' is not running"
    echo "   Please start the container first: docker-compose up -d"
    exit 1
fi

echo "📊 Connected to database: $DB_NAME"
echo ""

# Run each migration file in order
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        filename=$(basename "$migration_file")
        echo "▶ Running migration: $filename"
        
        if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration_file"; then
            echo "✅ Migration completed: $filename"
        else
            echo "❌ Migration failed: $filename"
            exit 1
        fi
        echo ""
    fi
done

echo "✅ All migrations completed successfully!"
echo ""

# Show created tables
echo "📋 Database tables:"
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt"

echo ""
echo "🎉 Database migration complete!"

