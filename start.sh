#!/bin/sh

echo "Starting Gestion Volets on port 3157..."

# Log environment variables for debugging
echo "Environment variables:"
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"

# Force the application to use port 3157 explicitly
export PORT=3157

# Start the application
echo "Starting node application on port 3157..."
exec node server.js 