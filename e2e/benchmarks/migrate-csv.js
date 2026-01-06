/**
 * Migration script to update benchmark_results.csv with new kernel columns
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE_PATH = path.join(__dirname, 'benchmark_results.csv');
const BACKUP_FILE_PATH = path.join(__dirname, 'benchmark_results.backup.csv');

// Old headers (20 columns) and new headers (30 columns)
const OLD_HEADERS = [
  'timestamp', 'model', 'backend', 'numRuns',
  'Average Latency (ms)', 'Average Latency Excl First (ms)',
  'Min Latency (ms)', 'Max Latency (ms)',
  'Time to First Output (ms)', 'End-to-End Latency (ms)',
  'Kernel Launch Latency (ms)', 'Synchronization Overhead (ms)',
  'Kernel Execution Time (ms)', 'Per-Operator Latency (ms)',
  'Number of Kernels', 'Compilation Time (ms)',
  'Peak Memory Usage (MB)', 'Memory Bandwidth (GB/s)',
  'Leaked Tensors', 'Operator Fusion Rate (%)'
];

const NEW_HEADERS = [
  'timestamp', 'model', 'backend', 'numRuns',
  'Average Latency (ms)', 'Average Latency Excl First (ms)',
  'Min Latency (ms)', 'Max Latency (ms)',
  'Time to First Output (ms)', 'End-to-End Latency (ms)',
  'Kernel Launch Latency (ms)', 'Synchronization Overhead (ms)',
  'Kernel Execution Time (ms)', 'Per-Operator Latency (ms)',
  'Number of Kernels', 'Compilation Time (ms)',
  'Peak Memory Usage (MB)', 'Memory Bandwidth (GB/s)',
  'Leaked Tensors', 'Operator Fusion Rate (%)',
  // Top 5 aggregated kernels by execution time
  'Kernel_1_Name', 'Kernel_1_Time_ms',
  'Kernel_2_Name', 'Kernel_2_Time_ms',
  'Kernel_3_Name', 'Kernel_3_Time_ms',
  'Kernel_4_Name', 'Kernel_4_Time_ms',
  'Kernel_5_Name', 'Kernel_5_Time_ms'
];

// Create empty row for new kernel columns (10 empty values for 5 kernels)
const EMPTY_KERNEL_COLUMNS = Array(10).fill('');

function migrateCSV() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.log('No existing CSV file found. A new one will be created on next benchmark run.');
    return;
  }

  // Backup the original file
  fs.copyFileSync(CSV_FILE_PATH, BACKUP_FILE_PATH);
  console.log(`Backed up original CSV to: ${BACKUP_FILE_PATH}`);

  // Read the CSV file
  const content = fs.readFileSync(CSV_FILE_PATH, 'utf8');
  const lines = content.trim().split('\n');

  // Build new CSV with updated headers and rows
  const newCSVLines = [NEW_HEADERS.join(',')];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');

    // Handle existing rows - count how many columns they have
    const currentColCount = parts.length;

    // If row has old 20 columns, add empty kernel columns
    if (currentColCount === 20) {
      const paddedRow = [...parts, ...EMPTY_KERNEL_COLUMNS];
      newCSVLines.push(paddedRow.join(','));
    } else if (currentColCount === 40) {
      // If row already has 40 columns (10 kernels), trim to keep first 20 + add new 10
      const baseRow = parts.slice(0, 20);
      const paddedRow = [...baseRow, ...EMPTY_KERNEL_COLUMNS];
      newCSVLines.push(paddedRow.join(','));
    } else {
      // Keep as is (might be mixed format)
      newCSVLines.push(lines[i]);
    }
  }

  // Write the new CSV
  fs.writeFileSync(CSV_FILE_PATH, newCSVLines.join('\n') + '\n', 'utf8');
  console.log(`✅ Successfully migrated CSV`);
  console.log(`   Total rows: ${lines.length - 1} data rows`);
  console.log(`   New format: 30 columns (20 metrics + 5 top aggregated kernels)`);
  console.log(`   Backup saved: ${BACKUP_FILE_PATH}`);
}

// Run migration
migrateCSV();
