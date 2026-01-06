#!/bin/bash
# Quick Start Guide for TF.js Benchmark with Automatic CSV Export

echo "=========================================="
echo "TF.js Benchmark - Auto CSV Export Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js detected"
echo ""

# Check if the metrics server exists
if [ ! -f "metrics-server.js" ]; then
    echo "❌ metrics-server.js not found in current directory"
    exit 1
fi

echo "✓ metrics-server.js found"
echo ""

echo "Starting servers..."
echo ""

# Function to check if port is in use and kill if necessary
free_port() {
    local port=$1
    local pid=$(lsof -i :$port 2>/dev/null | grep -v COMMAND | awk '{print $2}' | head -1)
    if [ ! -z "$pid" ]; then
        echo "⚠️  Port $port is already in use (PID: $pid). Freeing it..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Free ports before starting
free_port 3001
free_port 8080

# Start metrics server
echo "🚀 Starting Metrics Server on port 3001..."
node metrics-server.js &
METRICS_PID=$!
sleep 2

# Check if metrics server started successfully
if ! kill -0 $METRICS_PID 2>/dev/null; then
    echo "❌ Failed to start metrics server"
    exit 1
fi

echo "✓ Metrics Server started (PID: $METRICS_PID)"
echo ""

# Start HTTP server
echo "🚀 Starting HTTP Server on port 8080..."
if command -v npx &> /dev/null; then
    npx http-server . -p 8080 &
    HTTP_PID=$!
else
    echo "❌ npm/npx not found. Please install Node.js with npm."
    kill $METRICS_PID
    exit 1
fi

sleep 2

if ! kill -0 $HTTP_PID 2>/dev/null; then
    echo "❌ Failed to start HTTP server"
    echo "⚠️  Trying alternative port 8081..."
    npx http-server . -p 8081 &
    HTTP_PID=$!
    sleep 2

    if ! kill -0 $HTTP_PID 2>/dev/null; then
        echo "❌ Failed to start HTTP server on both ports"
        kill $METRICS_PID
        exit 1
    fi

    echo "✓ HTTP Server started on port 8081 (PID: $HTTP_PID)"
else
    echo "✓ HTTP Server started on port 8080 (PID: $HTTP_PID)"
fi
echo ""

echo "=========================================="
echo "✓ All Services Running!"
echo "=========================================="
echo ""
echo "📍 Open in your browser:"
echo "   http://localhost:8080/local-benchmark/index.html"
echo ""
echo "📊 CSV Output:"
echo "   ./benchmark_results.csv"
echo ""
echo "📡 Servers:"
echo "   Metrics API:  http://localhost:3001/api/metrics"
echo "   HTTP Server:  http://localhost:8080"
echo ""
echo "ℹ️  After each benchmark run, metrics will be automatically"
echo "    appended to benchmark_results.csv"
echo ""
echo "⌨️  Press Ctrl+C to stop all servers"
echo "=========================================="
echo ""

# Trap Ctrl+C to clean up
trap "echo ''; echo 'Shutting down servers...'; kill $METRICS_PID $HTTP_PID 2>/dev/null; echo 'Done.'; exit 0" INT

# Keep script running
wait $METRICS_PID $HTTP_PID
