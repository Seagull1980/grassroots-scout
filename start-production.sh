#!/bin/bash

echo "🚀 Starting The Grassroots Scout in production mode..."

# Start backend server in background
echo "📡 Starting main backend server..."
cd backend && node server.js &
BACKEND_PID=$!

# Start team roster server in background  
echo "👥 Starting team roster server..."
node team-roster-server.js &
ROSTER_PID=$!

# Start playing history server in background
echo "📊 Starting playing history server..."
node playing-history-server.js &
HISTORY_PID=$!

cd ..

# Serve the built React app
echo "🌐 Starting frontend server..."
npx serve -s dist -l ${PORT:-3000}

# Cleanup on exit
trap "kill $BACKEND_PID $ROSTER_PID $HISTORY_PID" EXIT
