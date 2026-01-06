#!/bin/bash

# Start metrics server in background
echo "Starting metrics server on port 3001..."
node metrics-server.js &
METRICS_PID=$!

# Start HTTP server in background
echo "Starting HTTP server on port 8080..."
npx http-server . -p 8080 &
HTTP_PID=$!

echo ""
echo "=========================================="
echo "Benchmark Setup Complete!"
echo "=========================================="
echo "HTTP Server:    http://localhost:8080"
echo "Metrics Server: http://localhost:3001"
echo "CSV Output:     ./benchmark_results.csv"
echo ""
echo "Metrics will be automatically saved to benchmark_results.csv after each benchmark run."
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================="
echo ""

# Wait for both processes
wait $METRICS_PID $HTTP_PID
