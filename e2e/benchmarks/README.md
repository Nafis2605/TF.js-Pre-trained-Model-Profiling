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

### Windows (with NVIDIA GPU)
```powershell
# Open PowerShell as Administrator

cd C:\path\to\TF.js-Pre-trained-Model-Profiling\e2e\benchmarks

# Step 1: Verify NVIDIA drivers installed
nvidia-smi

# Step 2: Start servers (run in PowerShell)
node metrics-server.js

# Step 3: In another PowerShell window, start HTTP server
npx http-server -p 8080

# Step 4: Open browser
start http://localhost:8080/local-benchmark/index.html

# Step 5: Run benchmark
# - Select model (e.g., MobileNetV3)
# - Select backend (e.g., webgl)
# - Click "Run Benchmark"
# - Results auto-saved to benchmark_results.csv
```

### Linux (with NVIDIA GPU)
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

### Required (All Platforms)
- **Node.js** v14 or higher
  ```bash
  node --version
  ```
- **npm** (comes with Node.js)
  ```bash
  npm --version
  ```

### macOS Requirements
- **macOS 10.15+** (Catalina or later)
- **Apple Silicon or Intel processor**
- `powermetrics` (built-in on all Macs)

### Windows Requirements
- **Windows 10/11** (64-bit)
- **NVIDIA GPU** (GeForce, Quadro, or Tesla)
- **NVIDIA Driver** (latest from https://www.nvidia.com/Download/driverDetails.aspx)
- **NVIDIA CUDA Toolkit** (optional, for better GPU metrics)

### Linux Requirements
- **Ubuntu 18.04+** or compatible distro
- **NVIDIA GPU** (GeForce, Quadro, or Tesla)
- **NVIDIA Driver** and `nvidia-smi`
  ```bash
  sudo apt-get install nvidia-utils
  ```

### GPU Metrics Collection
- **macOS**: GPU power measured via `powermetrics` (passwordless sudo)
- **Windows/Linux**: GPU metrics from `nvidia-smi` (requires NVIDIA drivers)

---

## Step-by-Step Setup

### Step 1: Navigate to Directory

**macOS / Linux:**
```bash
cd /Users/fahim_arsad/Desktop/TF.js-Pre-trained-Model-Profiling/e2e/benchmarks
```

**Windows:**
```powershell
cd C:\path\to\TF.js-Pre-trained-Model-Profiling\e2e\benchmarks
```

### Step 2: GPU Setup

#### macOS Only (One-Time)

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

#### Windows Only (First Time)

**Step 2a: Install NVIDIA Driver**
1. Download from: https://www.nvidia.com/Download/driverDetails.aspx
2. Select your GPU model and Windows version
3. Install and restart computer

**Step 2b: Verify NVIDIA Driver**
```powershell
nvidia-smi
```

Expected output:
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.00                 Driver Version: 535.00                    |
|-------------------------------+----------------------+----------------------+
| GPU  Name                      | Bus-Id        Disp.A | Memory Usage         |
|===============================+======================+======================|
|   0  NVIDIA GeForce RTX 3090     | 00:1F.0       On     | 10GB / 24576MB       |
+-------------------------------+----------------------+----------------------+
```

If command not found: NVIDIA driver not installed properly

**Step 2c: Verify CUDA (Optional)**
```powershell
nvidia-smi --query-gpu=name --format=csv,noheader
```

Should show your GPU name.

#### Linux Only (First Time)

**Step 2a: Install NVIDIA Driver**
```bash
sudo apt-get update
sudo apt-get install nvidia-driver-550  # Or latest version
sudo reboot
```

**Step 2b: Verify NVIDIA Driver**
```bash
nvidia-smi
```

Should show GPU info (similar to Windows output above)

**Step 2c: Install nvidia-utils**
```bash
sudo apt-get install nvidia-utils
```

### Step 3: Start Metrics Server

**macOS / Linux (using quick-start.sh):**
```bash
bash quick-start.sh
```

**Windows (Manual startup):**

**Terminal 1: Start Metrics Server**
```powershell
node metrics-server.js
```

Expected output:
```
Metrics server listening on http://localhost:3001
CSV file location: C:\path\...\benchmark_results.csv
```

**Terminal 2: Start HTTP Server**
```powershell
npx http-server -p 8080
```

Expected output:
```
Available on:
  http://127.0.0.1:8080
  http://<your-ip>:8080
```

### Step 4: Open Benchmark UI

**macOS:**
```bash
open http://localhost:8080/local-benchmark/index.html
```

**Windows / Linux:**
- Open browser and navigate to: `http://localhost:8080/local-benchmark/index.html`
- Or click: `http://127.0.0.1:8080/local-benchmark/index.html`

Should see benchmark UI with model/backend selectors

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

**macOS / Linux:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Restart
bash quick-start.sh
```

**Windows:**
```powershell
# Find process on port 3001
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F

# Find process on port 8080
netstat -ano | findstr :8080

# Kill process (replace PID)
taskkill /PID <PID> /F

# Restart servers manually
node metrics-server.js
# In another window:
npx http-server -p 8080
```

### GPU Power Shows "N/A"

**macOS:**
```bash
# Test powermetrics
sudo -n powermetrics -s gpu_power -n 1

# If password prompt appears, reconfigure:
bash setup-gpu-metrics-macos.sh
```

**Windows:**
```powershell
# Verify nvidia-smi shows power
nvidia-smi --query-gpu=power.draw --format=csv,nounits,noheader

# If empty or "N/A":
# 1. Update NVIDIA driver from: https://www.nvidia.com/Download/driverDetails.aspx
# 2. Restart computer
# 3. Try again
```

**Linux:**
```bash
# Verify nvidia-smi shows power
nvidia-smi --query-gpu=power.draw --format=csv,nounits,noheader

# If empty or "N/A":
sudo apt-get install --reinstall nvidia-driver-550
sudo reboot
```

### Metrics Server Not Responding

**macOS / Linux:**
```bash
# Check if running
curl http://localhost:3001/

# Kill and restart
lsof -ti:3001 | xargs kill -9
bash quick-start.sh
```

**Windows:**
```powershell
# Check if running
Invoke-WebRequest http://localhost:3001/

# If error, manually start:
node metrics-server.js
```

### Benchmark Page Not Loading

**macOS / Linux:**
```bash
# Check HTTP server
curl http://localhost:8080/

# Restart
bash quick-start.sh
```

**Windows:**
```powershell
# Check HTTP server
Invoke-WebRequest http://localhost:8080/

# If error, manually start:
npx http-server -p 8080
```

### Node.js Command Not Found (Windows)

```powershell
# Verify Node.js installed
node --version

# If not found:
# 1. Download from: https://nodejs.org/
# 2. Install (choose latest LTS)
# 3. Restart PowerShell
# 4. Verify: node --version
```

### npm not found (Windows)

```powershell
# npm should be installed with Node.js
npm --version

# If missing:
# 1. Reinstall Node.js from https://nodejs.org/
# 2. Make sure "npm package manager" is checked during install
# 3. Restart computer
```

### NVIDIA Driver Issues (Windows)

**Symptom: `nvidia-smi: command not found`**
1. Download latest driver: https://www.nvidia.com/Download/driverDetails.aspx
2. Select your GPU and Windows version
3. Install and restart
4. Verify: `nvidia-smi`

**Symptom: GPU not detected**
```powershell
# Verify GPU is recognized
nvidia-smi

# Check Device Manager: Win+X → Device Manager → Display adapters
# Should show your NVIDIA GPU

# If not showing:
# - GPU may not be enabled in BIOS (restart → BIOS → Enable GPU)
# - Try different GPU slot (if multiple)
# - Update motherboard BIOS
```

### PowerShell Execution Policy (Windows)

**If you see: "cannot be loaded because running scripts is disabled"**

```powershell
# Check current policy
Get-ExecutionPolicy

# Change policy (requires Admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Benchmark Very Slow

**Causes:**
- Too many runs (start with 50)
- Browser tab not focused (reduces performance)
- Other apps using GPU
- First run includes JIT compilation

**Solutions:**
- Reduce number of runs
- Focus browser tab
- Close other applications
- Run warmup runs first (default 5)

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

| Platform | GPU Support | GPU Metrics | Setup Required |
|----------|-------------|-------------|-----------------|
| **macOS** (Apple/Intel) | Apple Metal | Yes | `bash setup-gpu-metrics-macos.sh` |
| **Windows** (NVIDIA) | CUDA/Optimus | Yes | NVIDIA driver install |
| **Linux** (NVIDIA) | CUDA | Yes | NVIDIA driver + nvidia-utils |

### macOS
- GPU power measured via `powermetrics` (passwordless sudo required)
- Supports Apple Silicon (M1/M2/M3) and Intel Macs
- Best GPU metrics accuracy

### Windows
- GPU metrics from `nvidia-smi` command
- Supports GeForce, Quadro, and Tesla GPUs
- Requires latest NVIDIA driver
- Both 64-bit Windows 10 and 11 supported

### Linux
- GPU metrics from `nvidia-smi` command
- Supports GeForce, Quadro, and Tesla GPUs
- Requires NVIDIA driver + nvidia-utils package
- Ubuntu 18.04+ and other distros supported

---

## Typical Workflow

### Single Quick Test (macOS / Linux)
```bash
bash quick-start.sh
open http://localhost:8080/local-benchmark/index.html
# Select MobileNetV3 + webgl (defaults)
# Click Run Benchmark
tail -1 benchmark_results.csv
```

### Single Quick Test (Windows)
```powershell
node metrics-server.js
# In another PowerShell window:
npx http-server -p 8080
# Open browser: http://localhost:8080/local-benchmark/index.html
# Run benchmark
Get-Content benchmark_results.csv | Select-Object -Last 1
```

### Compare Multiple Models (macOS / Linux)
```bash
bash quick-start.sh
# Run MobileNetV3 + webgl
# Run MobileNetV3 + webgpu
# Run MobileNetV2 + webgl
# View results: cat benchmark_results.csv
```

### Compare Multiple Models (Windows)
```powershell
node metrics-server.js
# In another window:
npx http-server -p 8080
# Run benchmarks via browser
# View results: Get-Content benchmark_results.csv
```
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

## Windows-Specific GPU Metrics Guide

### GPU Detection on Windows

The system automatically detects NVIDIA GPUs via `nvidia-smi`. Make sure:

```powershell
# 1. Verify GPU is detected
nvidia-smi

# Output should show:
# NVIDIA GeForce RTX 3090, RTX 4090, or your GPU name
# Driver Version: 535.xx or higher
```

### GPU Metrics Collected on Windows

**Real-time metrics (1-second intervals):**
- `gpu_utilization_percent` - GPU computation load (0-100%)
- `gpu_memory_utilization_percent` - GPU VRAM usage (0-100%)
- `gpu_power_draw_watts` - GPU power consumption (watts)
- `memory_mb` - System RAM usage

**Example Windows GPU output:**
```csv
timestamp,model,backend,timestamp_sec,gpu_utilization_percent,gpu_memory_utilization_percent,gpu_power_draw_watts,memory_mb
2026-01-11T14:22:45Z,MobileNetV3,webgl,1.05,85,72,245.5,8192
2026-01-11T14:22:45Z,MobileNetV3,webgl,2.08,82,71,243.2,8256
```

### Windows GPU Requirements

**GPU Support:**
- NVIDIA GeForce (GTX 1000+, RTX series)
- NVIDIA Quadro
- NVIDIA Tesla

**Not supported:**
- Integrated Intel Graphics
- AMD/Intel Arc GPUs
- NVIDIA Kepler generation (too old)

**Driver Version:**
- Minimum: 450.00
- Recommended: Latest from nvidia.com
- Download: https://www.nvidia.com/Download/driverDetails.aspx

### Checking GPU Power Draw on Windows

```powershell
# View current GPU power draw
nvidia-smi --query-gpu=power.draw --format=csv,nounits,noheader

# View power draw limit
nvidia-smi --query-gpu=power.max_limit --format=csv,nounits,noheader

# Example output:
# 250.00  <- Current power (watts)
# 320     <- Max limit (watts)
```

### Common Windows GPU Issues

**Issue: GPU shows 0% utilization during benchmarks**
- Solution: Verify GPU is being used by checking nvidia-smi during benchmark
- If 0%: Might be using CPU instead, check browser backend selection

**Issue: GPU power draw is 0W**
- Some older GPU models don't support power reading
- Workaround: Monitor in NVIDIA Control Panel instead

**Issue: GPU memory constantly at 100%**
- Normal during large model benchmarks
- Clear browser cache between tests: Ctrl+Shift+Delete → Clear Cache

---

## Next Steps

### macOS:
1. **Run setup (one-time):**
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

### Windows:
1. **Verify GPU:**
   ```powershell
   nvidia-smi
   ```

2. **Start Metrics Server:**
   ```powershell
   node metrics-server.js
   ```

3. **Start HTTP Server (new PowerShell window):**
   ```powershell
   npx http-server -p 8080
   ```

4. **Open browser:**
   - Navigate to: `http://localhost:8080/local-benchmark/index.html`

5. **Run benchmark:**
   - Select model: MobileNetV3
   - Select backend: webgl
   - Click: Run Benchmark

6. **View results:**
   ```powershell
   Get-Content benchmark_results.csv | Select-Object -Last 10
   ```

### Linux:
1. **Verify GPU:**
   ```bash
   nvidia-smi
   ```

2. **Start servers:**
   ```bash
   bash quick-start.sh
   ```

3. **Open browser:**
   - Navigate to: `http://localhost:8080/local-benchmark/index.html`

4. **Run benchmark:**
   - Select model: MobileNetV3
   - Select backend: webgl
   - Click: Run Benchmark

5. **View results:**
   ```bash
   tail -10 benchmark_results.csv
   ```
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
