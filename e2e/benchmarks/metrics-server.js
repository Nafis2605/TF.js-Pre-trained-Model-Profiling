/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const CSV_FILE_PATH = path.join(__dirname, 'benchmark_results.csv');

// CSV Headers
const CSV_HEADERS = [
  'timestamp',
  'model',
  'backend',
  'numRuns',
  'Average Latency (ms)',
  'Average Latency Excl First (ms)',
  'Min Latency (ms)',
  'Max Latency (ms)',
  'Time to First Output (ms)',
  'End-to-End Latency (ms)',
  'Kernel Launch Latency (ms)',
  'Synchronization Overhead (ms)',
  'Kernel Execution Time (ms)',
  'Per-Operator Latency (ms)',
  'Number of Kernels',
  'Compilation Time (ms)',
  'Peak Memory Usage (MB)',
  'Memory Bandwidth (GB/s)',
  'Leaked Tensors',
  'Operator Fusion Rate (%)',
  // Top 5 aggregated kernels by execution time
  'Kernel_1_Name',
  'Kernel_1_Time_ms',
  'Kernel_2_Name',
  'Kernel_2_Time_ms',
  'Kernel_3_Name',
  'Kernel_3_Time_ms',
  'Kernel_4_Name',
  'Kernel_4_Time_ms',
  'Kernel_5_Name',
  'Kernel_5_Time_ms'
];

/**
 * Escapes a value for CSV format
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

/**
 * Creates a CSV row from metrics object
 */
function createCSVRow(metrics) {
  return CSV_HEADERS.map(header => escapeCSVValue(metrics[header] || '')).join(',');
}

/**
 * Ensures the CSV file exists with headers
 */
function ensureCSVFile() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    fs.writeFileSync(CSV_FILE_PATH, CSV_HEADERS.join(',') + '\n', 'utf8');
    console.log(`Created CSV file: ${CSV_FILE_PATH}`);
  }
}

/**
 * Appends metrics to the CSV file
 */
function appendMetricsToCSV(metrics) {
  ensureCSVFile();
  const csvRow = createCSVRow(metrics) + '\n';
  fs.appendFileSync(CSV_FILE_PATH, csvRow, 'utf8');
  console.log(`Metrics appended to ${CSV_FILE_PATH}`);
}

/**
 * Reads the entire CSV file
 */
function readCSVFile() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    return '';
  }
  return fs.readFileSync(CSV_FILE_PATH, 'utf8');
}

/**
 * Handles incoming requests
 */
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle metrics save endpoint
  if (pathname === '/api/metrics' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const metrics = JSON.parse(body);

        // Debug logging
        console.log('Received metrics:', {
          timestamp: metrics.timestamp,
          model: metrics.model,
          kernelCount: metrics['Number of Kernels'],
          kernel1_Name: metrics['Kernel_1_Name'],
          kernel1_Time: metrics['Kernel_1_Time_ms'],
          allKeys: Object.keys(metrics).slice(0, 35) // First 35 keys
        });

        appendMetricsToCSV(metrics);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Metrics saved successfully',
          filePath: CSV_FILE_PATH
        }));
      } catch (error) {
        console.error('Error saving metrics:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  // Handle metrics retrieval endpoint
  if (pathname === '/api/metrics' && req.method === 'GET') {
    try {
      const csvContent = readCSVFile();
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end(csvContent);
    } catch (error) {
      console.error('Error reading metrics:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

// Create and start the server
const PORT = 3001;
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Metrics server listening on http://localhost:${PORT}`);
  console.log(`CSV file location: ${CSV_FILE_PATH}`);
  ensureCSVFile();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nMetrics server shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
