#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."

DB_HOST=""
DB_PORT=""

if [ -n "${DATABASE_URL}" ]; then
  DB_HOST="$(node -e "const u=new URL(process.env.DATABASE_URL); process.stdout.write(u.hostname)")"
  DB_PORT="$(node -e "const u=new URL(process.env.DATABASE_URL); process.stdout.write(u.port || '5432')")"
fi

if [ -n "${DB_HOST}" ] && [ -n "${DB_PORT}" ]; then
  echo "Checking TCP ${DB_HOST}:${DB_PORT}..."
  while ! nc -z "${DB_HOST}" "${DB_PORT}"; do
    sleep 1
  done
  echo "Database is ready!"
else
  echo "DATABASE_URL is not set or could not be parsed; skipping DB wait"
fi

# Apply database migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
exec "$@"
