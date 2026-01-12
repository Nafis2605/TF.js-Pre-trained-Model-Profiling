# TensorFlow.js Benchmark System - Complete Setup & Usage Guide

Complete system for running TensorFlow.js benchmarks with automatic GPU metrics collection and CSV export.

---

## Quick Start (60 seconds)

### macOS
```bash
cd /Users/fahim_arsad/Desktop/TF.js-Pre-trained-Model-Profiling/e2e/benchmarks

# Step 1: Setup GPU metrics (one-time, requires password)
bash setup-gpu-metrics-macos.sh

# Step 2: Start servers
bash quick-start.sh

# Step 3: Open browser
open http://localhost:8080/local-benchmark/index.html

# Step 4: Run benchmark
# - Select model (e.g., MobileNetV3)
# - Select backend (e.g., webgl)
# - Click "Run Benchmark"
# - Results auto-saved to benchmark_results.csv
```

### Linux / Windows
```bash
cd /path/to/TF.js-Pre-trained-Model-Profiling/e2e/benchmarks

# Step 1: Verify NVIDIA drivers installed
nvidia-smi

# Step 2: Start servers
bash quick-start.sh

# Step 3: Open browser
http://localhost:8080/local-benchmark/index.html

# Step 4: Run benchmark
```

---

## Prerequisites

### Required
- **Node.js** v14 or higher
  ```bash
  node --version
  ```

### Optional (for GPU metrics)
- **macOS**: `powermetrics` (built-in) + passwordless sudo setup
- **Linux**: NVIDIA GPU + `nvidia-smi` drivers
- **Windows**: NVIDIA GPU + `nvidia-smi` drivers

---

## Step-by-Step Setup

### Step 1: Navigate to Directory

```bash
cd /Users/fahim_arsad/Desktop/TF.js-Pre-trained-Model-Profiling/e2e/benchmarks
```

### Step 2: GPU Setup (macOS Only, One-Time)

This enables GPU power measurement.

```bash
bash setup-gpu-metrics-macos.sh
```

**What it does:**
- Configures passwordless sudo for `powermetrics`
- Prompts for macOS password once

**Verify:**
```bash
sudo -n powermetrics -s gpu_power -n 1
```

Should output GPU power value like `GPU Power: 12 mW`

If it asks for password: run setup script again

### Step 3: Start Metrics Server

```bash
bash quick-start.sh
```

**Expected output:**
```
==========================================
TF.js Benchmark - Auto CSV Export Setup
==========================================

✓ Metrics Server started on http://localhost:3001
✓ HTTP Server started on http://localhost:8080
```

**What runs:**
- **Port 3001**: Metrics API server (receives benchmark data)
- **Port 8080**: HTTP server (serves benchmark webpage)

### Step 4: Open Benchmark UI

```bash
open http://localhost:8080/local-benchmark/index.html
```

Or in browser: `http://localhost:8080/local-benchmark/index.html`

---

## Running Benchmarks

### Basic Workflow

1. **Select Model**
   - Dropdown menu with options: MobileNetV3, MobileNetV2, MoveNet, etc.

2. **Select Backend**
   - Dropdown menu: webgl, webgpu, wasm, webnn

3. **Configure Settings**
   - **Runs**: Number of inference iterations (default: 50)
   - **Warmup**: JIT compilation runs (default: 5, discarded from avg)
   - **Profile**: How many runs to profile for kernel data (default: 1)

4. **Click "Run Benchmark"**
   - Watch console (F12) for progress
   - Takes 30-120 seconds depending on run count

5. **View Results**
   - Console shows summary after completion
   - CSV files updated automatically

### Check Results

```bash
# View latest benchmark
tail -1 benchmark_results.csv

# View all benchmarks
cat benchmark_results.csv

# Open in Excel/Google Sheets
open benchmark_results.csv
```

---

## CSV Output Files

### File 1: `benchmark_results.csv`

One row per benchmark run with all metrics.

**Key Columns:**
```
timestamp           - When benchmark ran (ISO format)
model              - Model name (e.g., MobileNetV3)
backend            - Backend used (e.g., webgl)
numRuns            - Number of runs
First Inference Time (ms)          - Warmup/JIT compilation time
Subsequent Average Latency (ms)    - Average of runs 2+ (excludes first)
Average Latency (ms)               - Overall average
Min Latency (ms)   - Fastest run
Max Latency (ms)   - Slowest run
Kernel Execution Time (ms)         - GPU kernel time
Peak Memory Usage (MB)             - Max memory used
gpu_utilization_percent            - Average GPU load %
gpu_memory_utilization_percent     - Average GPU memory %
gpu_power_draw_watts               - Average GPU power W
Kernel_1_Name through Kernel_5_Name    - Top 5 kernels
Kernel_1_Time_ms through Kernel_5_Time_ms - Kernel times
```

**View in terminal:**
```bash
# Last 1 row
tail -1 benchmark_results.csv

# First 3 rows (header + 2 data)
head -3 benchmark_results.csv

# All rows
cat benchmark_results.csv
```

### File 2: `gpu_utilization_intervals.csv`

One-second GPU samples during each benchmark run.

**Columns:**
```
timestamp                           - Benchmark start time
model                              - Model being tested
backend                            - Backend being tested
timestamp_sec                      - Seconds into inference (1.05, 2.08, etc.)
gpu_utilization_percent            - GPU load at this second
gpu_memory_utilization_percent     - GPU memory % at this second
gpu_power_draw_watts               - GPU power at this second
memory_mb                          - System memory at this second
```

**Example row:**
```
2026-01-10T10:30:45Z,MobileNetV3,webgl,1.05,75,60,11.2,8192
```

### File 3: `benchmark_metrics.csv`

Alternative format. Same data as `benchmark_results.csv` in different column order.

---

## API Endpoints

### Metrics Server (port 3001)

**Check status:**
```bash
curl http://localhost:3001/api/gpu/status
```

**Response:**
```json
{
  "success": true,
  "gpuDetected": true,
  "gpuVendor": "Apple",
  "gpuName": "Apple M3",
  "isMonitoring": false
}
```

**Start GPU monitoring:**
```bash
curl -X POST http://localhost:3001/api/gpu/start \
  -H "Content-Type: application/json" \
  -d '{"model":"MobileNetV3","backend":"webgl"}'
```

**Stop GPU monitoring:**
```bash
curl -X POST http://localhost:3001/api/gpu/stop \
  -H "Content-Type: application/json" \
  -d '{"model":"MobileNetV3","backend":"webgl"}'
```

**Save metrics:**
```bash
curl -X POST http://localhost:3001/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"timestamp":"2026-01-10T10:30:45Z","model":"MobileNetV3"}'
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Restart
bash quick-start.sh
```

### GPU Power Shows "N/A"

**macOS:**
```bash
# Test powermetrics
sudo -n powermetrics -s gpu_power -n 1

# If password prompt appears, reconfigure:
bash setup-gpu-metrics-macos.sh
```

**Linux/Windows:**
```bash
# Verify nvidia-smi
nvidia-smi --query-gpu=power.draw --format=csv,nounits,noheader
```

### Metrics Server Not Responding

```bash
# Check if running
curl http://localhost:3001/

# Kill and restart
lsof -ti:3001 | xargs kill -9
bash quick-start.sh
```

### Benchmark Page Not Loading

```bash
# Check HTTP server
curl http://localhost:8080/

# Restart
bash quick-start.sh
```

### Benchmark Very Slow

**Causes:**
- Too many runs (start with 50)
- Browser tab not focused (reduces performance)
- Other apps using GPU

**Solutions:**
- Reduce number of runs
- Focus browser tab
- Close other applications

---

## Data Analysis Examples

### Compare Backends

```bash
# Show all backend results
awk -F',' 'NR>1 {print $2, $3, $7}' benchmark_results.csv | sort -u
# Output: model backend average_latency
```

### Find Fastest Model

```bash
# Rank models by latency (ascending)
awk -F',' 'NR>1 {print $2, $7}' benchmark_results.csv | sort -k2 -n | head -5
```

### Find Highest GPU Power

```bash
# Rank by GPU power consumption (descending)
awk -F',' 'NR>1 {print $2, $3, $NF}' benchmark_results.csv | sort -k3 -nr | head -5
```

### Average GPU Utilization

```bash
# Calculate average GPU utilization
awk -F',' 'NR>1 {sum+=$11; count++} END {print "Average: " sum/count "%"}' benchmark_results.csv
```

### Count Benchmarks by Model

```bash
# Show how many times each model was tested
awk -F',' 'NR>1 {print $2}' benchmark_results.csv | sort | uniq -c
```

---

## File Structure

```
benchmarks/
├── README.md                      # This file - complete documentation
├── quick-start.sh                 # Start metrics-server and HTTP server
├── setup-gpu-metrics-macos.sh     # macOS GPU setup (one-time)
├── metrics-server.js              # Node.js backend API (port 3001)
├── gpu_metrics_collector.js       # GPU metrics module
├── benchmark_util.js              # Benchmark utilities
├── model_config.js                # Model configuration
├── benchmark_results.csv          # Output: all benchmark data
├── gpu_utilization_intervals.csv  # Output: 1-second GPU samples
├── benchmark_metrics.csv          # Output: alternative format
└── local-benchmark/
    ├── index.html                 # Benchmark UI (open this)
    ├── index.js                   # Benchmark controller
    └── main.css                   # Styling
```

---

## Essential Commands

```bash
# Navigate to directory
cd /Users/fahim_arsad/Desktop/TF.js-Pre-trained-Model-Profiling/e2e/benchmarks

# Setup GPU (macOS, one-time)
bash setup-gpu-metrics-macos.sh

# Start servers
bash quick-start.sh

# Stop servers
Ctrl+C in terminal

# View results
tail -1 benchmark_results.csv
cat benchmark_results.csv

# Check GPU status
curl http://localhost:3001/api/gpu/status

# Check ports in use
lsof -i :3001
lsof -i :8080

# Kill process on port
lsof -ti:3001 | xargs kill -9
```

---

## How It Works

1. **User runs benchmark in browser**
   - Opens: http://localhost:8080/local-benchmark/index.html
   - Selects model and backend
   - Clicks "Run Benchmark"

2. **Browser JavaScript code:**
   - Tells metrics-server to start GPU monitoring
   - Runs TensorFlow.js inference N times
   - Collects kernel profiling data
   - Tells metrics-server to stop GPU monitoring

3. **GPU Monitoring (background):**
   - Samples GPU utilization every second
   - Records GPU memory usage
   - Records GPU power draw

4. **Metrics sent to server:**
   - Browser sends all metrics to `POST http://localhost:3001/api/metrics`
   - Server appends row to CSV files

5. **User views results:**
   - Opens `benchmark_results.csv`
   - Analyzes GPU metrics in `gpu_utilization_intervals.csv`

---

## Core Components

### `metrics-server.js`
- Node.js HTTP server (port 3001)
- Receives metrics from browser
- Appends rows to CSV files
- Provides GPU status endpoint

### `gpu_metrics_collector.js`
- Collects GPU metrics (utilization, memory, power)
- Cross-platform: macOS (Metal), Linux (NVIDIA), Windows (NVIDIA)
- Samples every second during monitoring
- Returns average and min/max values

### `benchmark_util.js`
- TensorFlow.js profiling utilities
- Measures inference latency
- Profiles kernel execution
- Tracks memory usage

### `quick-start.sh`
- Starts metrics-server (port 3001)
- Starts HTTP server (port 8080)
- Auto-kills any previous processes on those ports

### `setup-gpu-metrics-macos.sh`
- Configures passwordless sudo for `powermetrics`
- Allows GPU power measurement without password prompts

---

## Platform Support

| Platform | GPU Metrics | Setup Required |
|----------|-------------|-----------------|
| macOS | Yes (Metal) | `bash setup-gpu-metrics-macos.sh` |
| Linux | Yes (NVIDIA) | NVIDIA drivers + `nvidia-smi` |
| Windows | Yes (NVIDIA) | NVIDIA drivers + `nvidia-smi` |

---

## Typical Workflow

### Single Quick Test
```bash
bash quick-start.sh
open http://localhost:8080/local-benchmark/index.html
# Select MobileNetV3 + webgl (defaults)
# Click Run Benchmark
tail -1 benchmark_results.csv
```

### Compare Multiple Models
```bash
bash quick-start.sh
# Run MobileNetV3 + webgl
# Run MobileNetV3 + webgpu
# Run MobileNetV2 + webgl
# View results: cat benchmark_results.csv
```

### Analyze GPU Performance
```bash
bash quick-start.sh
# Run several benchmarks
# View GPU samples: cat gpu_utilization_intervals.csv
# Analyze: awk commands (see examples above)
```

---

## Performance Tips

- **More runs = More stable average** (use 50-100 for typical testing)
- **Warmup runs skip JIT compilation** (included in results but separate metric)
- **Profile times add overhead** (use 1 for quick testing)
- **Close other apps** for consistent measurements
- **Keep browser focused** (TensorFlow.js throttles background tabs)

---

## Next Steps

1. **Run setup (macOS):**
   ```bash
   bash setup-gpu-metrics-macos.sh
   ```

2. **Start servers:**
   ```bash
   bash quick-start.sh
   ```

3. **Open browser:**
   ```bash
   open http://localhost:8080/local-benchmark/index.html
   ```

4. **Run benchmark:**
   - Select model: MobileNetV3
   - Select backend: webgl
   - Click: Run Benchmark

5. **View results:**
   ```bash
   cat benchmark_results.csv
   ```

---

**Version:** 2.0
**Last Updated:** January 10, 2026
