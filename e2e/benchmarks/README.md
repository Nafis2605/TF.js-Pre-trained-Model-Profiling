# TensorFlow.js Pre-trained Model Benchmarking System

## Overview

This benchmarking system profiles TensorFlow.js pre-trained models across different backends (WebGL, WebGPU, CPU, WASM, TFLite) and automatically exports comprehensive metrics to a CSV file.

## Recent Changes

### 1. Kernel Metrics Integration
- **Top 5 Aggregated Kernels**: Each benchmark run now captures the top 5 time-consuming kernels by aggregated execution time
- **Unique Kernel Names**: Kernels with the same name are aggregated (summed) together, eliminating duplicates
- **Example**: If `FusedConv2D` executes 50 times taking 2ms each, the CSV shows `FusedConv2D: 100ms` (total)

### 2. Automatic CSV Export
- Metrics are automatically saved to `benchmark_results.csv` after each benchmark run
- No manual intervention required - exports happen in the background
- Single persistent CSV file that grows with each run

### 3. CSV Structure (30 columns)
```
Metadata (4):     timestamp, model, backend, numRuns

Timing (8):       Average Latency, Average Latency Excl First, Min, Max,
                  Time to First Output, End-to-End Latency,
                  Kernel Launch Latency, Synchronization Overhead

Aggregates (8):   Kernel Execution Time, Per-Operator Latency,
                  Number of Kernels, Compilation Time,
                  Peak Memory Usage, Memory Bandwidth,
                  Leaked Tensors, Operator Fusion Rate

Kernels (10):     Top 5 Aggregated Kernels (name + time ms each)
```

## Quick Start

### 1. Start the Servers

Run this command in the `e2e/benchmarks/` directory:

```bash
bash quick-start.sh
```

This will:
- Start the Metrics Server on port 3001 (handles CSV exports)
- Start the HTTP Server on port 8080 (serves the benchmark UI)
- Auto-detect and resolve any port conflicts

### 2. Open the Benchmark UI

Open your browser to:
```
http://localhost:8080/local-benchmark/
```

### 3. Run a Benchmark

1. Select a model (MobileNetV3, MoveNet, etc.)
2. Select a backend (WebGL, WebGPU, CPU, WASM, TFLite)
3. Set the number of runs (e.g., 50)
4. Click "Run Benchmark"
5. Metrics are automatically saved to `benchmark_results.csv`

### 4. View Results

The CSV file is located at:
```
/Users/fahim_arsad/Desktop/TF.js-Pre-trained-Model-Profiling/e2e/benchmarks/benchmark_results.csv
```

Open it with Excel, Google Sheets, or any text editor to view the results.

## Metrics Explanation

### Timing Metrics (milliseconds)
- **Average Latency**: Mean time per inference run
- **Average Latency Excl First**: Mean excluding the first (warmup) run
- **Min/Max Latency**: Minimum and maximum observed latency
- **Time to First Output**: Latency for the first inference
- **End-to-End Latency**: Complete time from model load to result
- **Kernel Launch Latency**: GPU/accelerator kernel scheduling overhead
- **Synchronization Overhead**: Time spent waiting for GPU/accelerator synchronization

### Performance Metrics
- **Kernel Execution Time**: Total time spent in all kernels (ms)
- **Per-Operator Latency**: Average time per kernel operation
- **Number of Kernels**: Total number of kernel operations
- **Compilation Time**: Model compilation time (ms)
- **Peak Memory Usage**: Maximum memory used (MB)
- **Memory Bandwidth**: Estimated memory bandwidth (GB/s)
- **Operator Fusion Rate**: Percentage of operator fusion optimization

### Kernel Metrics
- **Kernel_N_Name**: Name of the Nth most time-consuming kernel (aggregated)
- **Kernel_N_Time_ms**: Total execution time for that kernel (ms)

Example:
```
Kernel_1_Name = FusedConv2D,      Kernel_1_Time_ms = 2.34
Kernel_2_Name = Add,               Kernel_2_Time_ms = 1.87
Kernel_3_Name = ResizeBilinear,    Kernel_3_Time_ms = 1.45
Kernel_4_Name = DepthwiseConv2d,   Kernel_4_Time_ms = 0.89
Kernel_5_Name = Transpose,         Kernel_5_Time_ms = 0.56
```

## How It Works

### Data Flow

1. **Browser (Frontend)**
   - User runs benchmark in `local-benchmark/index.html`
   - `tf.profile()` captures kernel execution data
   - Timing metrics calculated in `benchmark_util.js`

2. **Metrics Collection**
   - `collectAllMetrics()` aggregates all metrics
   - Extracts top 5 aggregated kernels using `profileInfo.aggregatedKernels`
   - Creates JSON object with 30 fields

3. **Backend (Node.js Server)**
   - `metrics-server.js` receives JSON via POST request
   - Maps JSON fields to CSV columns
   - Appends row to `benchmark_results.csv`

4. **Storage**
   - Single persistent CSV file
   - Grows with each benchmark run
   - Backup created during schema migrations

### Aggregation Logic

The `aggregateKernelTime()` function in `benchmark_util.js`:
- Groups kernels by name
- Sums execution times for identical kernel types
- Sorts by total time (descending)
- Returns top 5 unique kernels

This ensures no duplicate kernel names in the CSV output.

## File Structure

```
benchmarks/
├── README.md                      (This file)
├── benchmark_util.js              (Core timing and metrics calculation)
├── metrics-server.js              (Node.js backend for CSV export)
├── migrate-csv.js                 (CSV schema migration utility)
├── quick-start.sh                 (Server startup script)
├── start-servers.sh               (Alternative startup script)
├── benchmark_results.csv          (Output: All benchmark data)
├── benchmark_results.backup.csv   (Backup of previous schema)
└── local-benchmark/
    ├── index.html                 (Benchmark UI)
    ├── index.js                   (UI logic)
    ├── main.css                   (Styles)
    └── util.js                    (Utility functions)
```

## Key Functions

### benchmark_util.js

**`collectAllMetrics(benchmarkParams, timeInfo, profileInfo)`**
- Collects all 30 metrics into a single object
- Aggregates kernels and extracts top 5
- Returns metrics object ready for CSV export

**`profileInference(predict, isTflite, numProfiles)`**
- Profiles model inference using `tf.profile()`
- Captures individual kernel data
- Aggregates kernels by name and time
- Returns `profileInfo` with:
  - `kernels[]`: Individual kernel executions
  - `aggregatedKernels[]`: Unique kernels with summed times
  - `peakBytes`: Memory usage
  - `compilationTimeMs`: Compilation time

**`aggregateKernelTime(kernels)`**
- Groups kernels by name
- Sums execution times
- Sorts by time (descending)
- Used internally by `profileInference()`

### metrics-server.js

**`handleRequest(req, res)`**
- Listens on `POST /api/metrics`
- Receives JSON metrics from frontend
- Appends to CSV file

**`createCSVRow(metrics)`**
- Maps metrics object fields to CSV columns using headers
- Handles CSV escaping for special characters

**`appendMetricsToCSV(metrics)`**
- Writes metric row to `benchmark_results.csv`

## Troubleshooting

### Port Already in Use
**Error**: `EADDRINUSE: address already in use :::8080`

**Solution**: 
- Run `quick-start.sh` which auto-detects and frees ports
- Or manually kill the process: `lsof -i :8080 | grep node | awk '{print $2}' | xargs kill -9`

### Kernel Data Missing
**Issue**: Benchmark runs but kernel metrics are empty

**Causes**:
1. `state.numProfiles` set to 0 - set to 1 or higher
2. Backend doesn't support profiling (TFLite)
3. Profiling timeout

**Solution**: 
- Check browser console (F12) for errors
- Set Profile Runs to at least 1
- Try a different backend

### CSV File Not Updating
**Issue**: New benchmark runs don't appear in CSV

**Solution**:
- Verify servers are running: `lsof -i :3001 -i :8080`
- Check browser console for POST errors
- Restart servers: `pkill -f metrics-server.js; bash quick-start.sh`

### Large CSV File
**Issue**: CSV file is very large after many benchmarks

**Solution**:
- Archive and backup: `cp benchmark_results.csv benchmark_results_backup_$(date +%s).csv`
- Delete old rows in Excel/Sheets or with text editor
- Create new CSV with headers for future runs

## Performance Analysis Tips

### Compare Across Backends
```
Filter CSV by model (e.g., MobileNetV3) and compare:
- WebGL vs WebGPU: GPU acceleration performance
- WebGL vs CPU: Hardware acceleration benefit
- CPU vs WASM: CPU thread implementation comparison
```

### Track Kernel Performance
```
Monitor top kernel types to identify bottlenecks:
- FusedConv2D: Convolution performance
- DepthwiseConv2d: Depthwise convolution efficiency
- Add, Mul: Element-wise operation cost
- Transpose, Reshape: Memory reorganization cost
```

### Memory Analysis
```
Correlate Peak Memory with:
- Model size
- Input dimensions
- Backend type
- Number of kernels
```

### Compilation vs Execution
```
Compare Compilation Time with Average Latency:
- High compilation + low latency: Good, amortize compilation
- High compilation + high latency: Inefficient backend
- Low compilation + high latency: Runtime overhead issue
```

## Server Details

### Metrics Server (Port 3001)
- **Purpose**: Receives metrics from browser and saves to CSV
- **Endpoints**:
  - `POST /api/metrics` - Submit metrics
  - `GET /api/metrics` - Retrieve full CSV content
- **CSV Headers**: Automatically created on first run
- **Data Format**: JSON request → CSV row

### HTTP Server (Port 8080)
- **Purpose**: Serves the benchmark UI
- **Root**: Current directory (benchmarks/)
- **Main File**: `local-benchmark/index.html`
- **Requirements**: Node.js with npm installed

## Architecture

```
Browser (Frontend)
├─ Loads model via tf.js
├─ Runs inference with measurements
├─ Calls tf.profile() for kernel data
└─ POSTs metrics JSON to metrics-server

Metrics Server (Node.js Backend)
├─ Receives JSON metrics
├─ Maps to CSV format using headers
└─ Appends to benchmark_results.csv

CSV File (Persistent Storage)
├─ Headers: 30 columns (metadata + metrics + kernels)
├─ Rows: One per benchmark run
└─ Data: Complete benchmark history
```

## CSV Examples

### Row with Kernels Populated (WebGL)
```
2026-01-06T04:39:35.092Z,MobileNetV3,webgl,50,15.67,...,FusedConv2D,0.29,FusedConv2D,0.28,Mean,0.16,...
```

### Row without Kernels (Old Format)
```
2026-01-06T00:59:35.595Z,MobileNetV3,webgl,50,14.35,...,N/A,33.33,,,,,
```

## Next Steps

1. **Run Benchmarks**: Use the UI to profile different models and backends
2. **Analyze Results**: Open CSV in Excel/Sheets for data analysis
3. **Track Progress**: Monitor kernel performance improvements over time
4. **Compare Backends**: Identify fastest and most efficient configurations
5. **Archive Data**: Backup CSV periodically for historical analysis

## Support

For issues or questions:
- Check browser console (F12) for JavaScript errors
- Review this README for troubleshooting section
- Verify servers are running and accessible
- Check network connectivity for POST requests to metrics server
