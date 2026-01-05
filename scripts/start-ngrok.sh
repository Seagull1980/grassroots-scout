#!/bin/bash

# Simple script to start both ngrok tunnels for external testing

echo "🌐 Starting ngrok tunnels for external access..."

# Start backend tunnel in background
echo "🔧 Starting backend tunnel (port 3001)..."
ngrok http 3001 --region=us > /dev/null 2>&1 &
BACKEND_PID=$!

# Wait a moment
sleep 2

# Start frontend tunnel in background
echo "🎨 Starting frontend tunnel (port 5173)..."
ngrok http 5173 --region=us > /dev/null 2>&1 &
FRONTEND_PID=$!

# Wait for tunnels to establish
echo "⏳ Waiting for tunnels to establish..."
sleep 5

# Get tunnel information
echo "📋 Getting tunnel information..."
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | "\(.config.addr) -> \(.public_url)"' 2>/dev/null || {
    echo "ℹ️  To see tunnel URLs, visit: http://localhost:4040"
}

echo ""
echo "✅ Ngrok tunnels are running!"
echo "📊 Dashboard: http://localhost:4040"
echo ""
echo "🛑 To stop tunnels, run: pkill ngrok"

# Keep script running
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' SIGINT SIGTERM
wait
