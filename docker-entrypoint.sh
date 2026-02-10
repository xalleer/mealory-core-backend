#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "Database is ready!"

# Apply database migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
exec "$@"
