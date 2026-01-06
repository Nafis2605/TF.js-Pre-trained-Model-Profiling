#!/usr/bin/env node

/**
 * Test script to verify the metrics server is working correctly
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_METRICS = {
  timestamp: new Date().toISOString(),
  model: 'MobileNetV3',
  backend: 'webgl',
  numRuns: 50,
  'Average Latency (ms)': '25.43',
  'Average Latency Excl First (ms)': '24.12',
  'Min Latency (ms)': '23.89',
  'Max Latency (ms)': '27.56',
  'Time to First Output (ms)': '35.21',
  'End-to-End Latency (ms)': '27.56',
  'Kernel Launch Latency (ms)': '10.09',
  'Synchronization Overhead (ms)': '1.45',
  'Kernel Execution Time (ms)': '18.75',
  'Per-Operator Latency (ms)': '0.234',
  'Number of Kernels': '80',
  'Compilation Time (ms)': '15.60',
  'Peak Memory Usage (MB)': '256.45',
  'Memory Bandwidth (GB/s)': '12.34',
  'Leaked Tensors': '0',
  'Operator Fusion Rate (%)': '33.33'
};

function sendMetrics(metrics, callback) {
  const postData = JSON.stringify(metrics);

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/metrics',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        callback(null, response);
      } catch (e) {
        callback(e);
      }
    });
  });

  req.on('error', (e) => {
    callback(e);
  });

  req.write(postData);
  req.end();
}

console.log('');
console.log('===========================================');
console.log('Metrics Server Test');
console.log('===========================================');
console.log('');

console.log('Sending test metrics to http://localhost:3001/api/metrics');
console.log('');

sendMetrics(TEST_METRICS, (err, response) => {
  if (err) {
    console.error('❌ Error: Could not connect to metrics server');
    console.error('   Make sure metrics-server.js is running on port 3001');
    console.error('   Command: node metrics-server.js');
    console.error('');
    console.error('   Error details:', err.message);
    process.exit(1);
  }

  if (response.success) {
    console.log('✓ Successfully sent metrics to server');
    console.log('  File path:', response.filePath);
    console.log('');

    // Check if CSV file was created
    const csvPath = response.filePath;
    if (fs.existsSync(csvPath)) {
      const stats = fs.statSync(csvPath);
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');

      console.log('✓ CSV file created/updated');
      console.log('  File:', csvPath);
      console.log('  Size:', stats.size, 'bytes');
      console.log('  Lines:', lines.length);
      console.log('');

      console.log('✓ CSV Content Preview:');
      console.log('');
      lines.forEach((line, index) => {
        if (index <= 3) { // Show header + first data row
          console.log('  ' + line.substring(0, 100) + (line.length > 100 ? '...' : ''));
        }
      });
      console.log('');

      console.log('===========================================');
      console.log('✓ All tests passed!');
      console.log('===========================================');
      console.log('');
      console.log('The metrics server is working correctly.');
      console.log('Metrics will be automatically saved when you run benchmarks.');
      console.log('');
    } else {
      console.error('❌ CSV file was not created');
      process.exit(1);
    }
  } else {
    console.error('❌ Server error:', response.error);
    process.exit(1);
  }
});
