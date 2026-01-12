# TensorFlow.js Benchmark Automation - Complete Guide

This document covers the complete setup and usage of the TensorFlow.js benchmark automation system.

## Overview

Automated Python script that runs TensorFlow.js benchmarks across multiple models and backends with automatic parameter configuration.

- **9 Models**: SelfieSegmentation-General, HandPoseDetector, speech-commands, Coco-SSD, MobileBert, MobileNetV3, ArPortraitDepth, bodypix, posenet
- **4 Backends**: cpu, webgl, wasm, webgpu
- **Total Benchmarks**: 36 (9 models × 4 backends)
- **Automatic Configuration**: Model-specific dropdowns and backend-specific warmup/run values

## Prerequisites

### System Requirements
- Windows 10/11 (64-bit)
- Python 3.8+
- Node.js v14+
- Chrome Dev browser installed at: `C:\Program Files\Google\Chrome Dev\Application\chrome.exe`

### Required Servers
1. **Metrics Server** (Node.js)
   - Port: 3001
   - Collects GPU metrics
   
2. **HTTP Server** (Node.js)
   - Port: 8080
   - Serves benchmark page

## Setup Instructions

### Step 1: Install Python Dependencies

```powershell
cd C:\Users\fanaf\Desktop\TF.js-Pre-trained-Model-Profiling\e2e\benchmarks

pip install selenium webdriver-manager
```

### Step 2: Start Required Servers

**Terminal 1: Start Metrics Server**
```powershell
cd C:\Users\fanaf\Desktop\TF.js-Pre-trained-Model-Profiling\e2e\benchmarks
node metrics-server.js
```

Expected output:
```
Metrics server listening on http://localhost:3001
```

**Terminal 2: Start HTTP Server**
```powershell
cd C:\Users\fanaf\Desktop\TF.js-Pre-trained-Model-Profiling\e2e\benchmarks
npx http-server -p 8080
```

Expected output:
```
Available on:
  http://127.0.0.1:8080
```

Wait for both servers to start before proceeding.

### Step 3: Run Automation Script

**Terminal 3: Run Python Automation**
```powershell
cd C:\Users\fanaf\Desktop\TF.js-Pre-trained-Model-Profiling\e2e\benchmarks
python benchmark-automation.py
```

## Script Configuration

### Models
All 9 models are automatically tested:
```
- SelfieSegmentation-General
- HandPoseDetector
- speech-commands
- Coco-SSD
- MobileBert
- MobileNetV3
- ArPortraitDepth
- bodypix
- posenet
```

### Backends
All 4 backends run for each model:
```
- cpu
- webgl
- wasm
- webgpu
```

### Backend-Specific Parameters

#### WebGL & WebGPU
- Warmups: 10
- Runs: 1024

#### CPU & WASM
- Warmups: 5
- Runs: 100

### Model-Specific Configurations

#### HandPoseDetector
- `lil-gui-name-20` → "full"

#### Coco-SSD
- `lil-gui-name-20` → "MobileNetV2"

#### MobileNetV3
- `lil-gui-name-7` → "large_100"

#### bodypix
- `lil-gui-name-22` → "tensor"
- `lil-gui-name-20` → "1"

#### posenet
- `lil-gui-name-20` → "1024"
- `lil-gui-name-21` → "ResNet50"
- `lil-gui-name-22` → "tensor"

#### Other Models
- No additional configuration needed

## How It Works

1. **Browser Launch**: Opens Chrome Dev to benchmark page
2. **Model Selection**: Selects model from dropdown (aria-labelledby="lil-gui-name-1")
3. **Model Configuration**: Sets any model-specific dropdowns automatically
4. **Backend Selection**: Selects backend from dropdown (aria-labelledby="lil-gui-name-8")
5. **Parameter Setup**: Sets warmups and runs based on backend type
6. **Benchmark Execution**: Clicks Run button
7. **Completion Detection**: Waits for:
   - Run button to become disabled (benchmark started)
   - Run button to become enabled (benchmark finished)
   - "Fusion Rate" text appears in results
8. **Next Benchmark**: Moves to next model/backend combination

## Expected Runtime

Typical timing per benchmark:
- **WebGL/WebGPU** (1024 runs): 60-120 seconds
- **CPU/WASM** (100 runs): 10-30 seconds

**Total estimated time**: 1.5-3 hours for all 36 benchmarks

## Results Files

### benchmark_results.csv
Main results file with all metrics:
- timestamp, model, backend, numRuns
- First Inference Time, Subsequent Average Latency, Average Latency
- Min/Max Latency, Kernel Execution Time, Peak Memory Usage
- GPU utilization, GPU power draw
- Top 5 kernel names and execution times

### gpu_utilization_intervals.csv
One-second GPU samples during each benchmark:
- timestamp, model, backend, timestamp_sec
- GPU utilization, GPU memory, GPU power, system memory

### benchmark_metrics.csv
Alternative format of results

## Troubleshooting

### Chrome Not Found
**Error**: Chrome path not found
**Solution**: Update CHROME_PATH in script or verify Chrome Dev installation

### Servers Not Responding
**Error**: Connection refused on port 3001 or 8080
**Solution**: 
```powershell
# Check if running
netstat -ano | findstr :3001
netstat -ano | findstr :8080

# Kill process if needed
taskkill /PID <PID> /F

# Restart servers
```

### Python Dependencies Missing
**Error**: ModuleNotFoundError
**Solution**: 
```powershell
pip install --upgrade selenium webdriver-manager
```

### Benchmark Hangs
**Error**: Script stops responding
**Solution**:
- Check browser window for errors
- Restart servers
- Kill Chrome and try again
- Check available disk space

### Model/Backend Selection Fails
**Error**: Cannot locate option
**Solution**:
- The script will print available options
- Verify model names exactly match dropdown text
- Check if page loaded completely

## Advanced Usage

### Modify Models List
Edit `benchmark-automation.py`:
```python
MODELS = [
    'SelfieSegmentation-General',
    'MobileNetV3'
    # Add or remove models
]
```

### Modify Backends List
Edit `benchmark-automation.py`:
```python
BACKENDS = ['webgl', 'cpu']  # Run only these backends
```

### Change Backend Parameters
Edit `benchmark-automation.py`:
```python
BACKEND_CONFIGS = {
    'webgl': {
        'warmups': 10,
        'runs': 1024
    },
    'cpu': {
        'warmups': 5,
        'runs': 100
    }
}
```

### Add Model Configuration
Edit `benchmark-automation.py`:
```python
MODEL_CONFIGS = {
    'MyModel': {
        'lil-gui-name-20': 'value1',
        'lil-gui-name-21': 'value2'
    }
}
```

## Monitor Progress

The script prints detailed progress:
```
╔════════════════════════════════════════════════════════════╗
║   TensorFlow.js Benchmark Automation - Python Edition      ║
╚════════════════════════════════════════════════════════════╝

[1/36] Running: SelfieSegmentation-General + cpu
  Using: warmups=5, runs=100
  🧹 Clearing cache and storage...
  ⏳ Waiting for form elements...
  📋 Selecting model: SelfieSegmentation-General
       Verified model value: SelfieSegmentation-General
  ⚙️  Selecting backend: cpu
       Verified backend value: cpu
  🔥 Setting warmups: 5
       Verified warmups value: 5
  🔁 Setting runs: 100
       Verified runs value: 100
  ▶️  Clicking Run Benchmark...
  ⏳ Benchmark running...
    ✓ Benchmark started (button disabled)
    ⏳ Waiting for benchmark to finish (button enabled)...
    ✓ Benchmark complete (button enabled + "Fusion Rate" found)
  ✓ Benchmark completed
```

## File Structure

```
e2e/benchmarks/
├── benchmark-automation.py          # Main automation script
├── requirements.txt                 # Python dependencies
├── metrics-server.js                # GPU metrics server
├── AUTOMATION_GUIDE.md              # This file
├── benchmark_results.csv            # Results (generated)
├── gpu_utilization_intervals.csv   # GPU samples (generated)
└── local-benchmark/                 # Benchmark UI
    ├── index.html
    ├── index.js
    └── main.css
```

## Performance Tips

1. **Close other applications** - Frees up system resources
2. **Keep browser window focused** - TensorFlow.js may throttle background tabs
3. **Disable extensions** - Can interfere with measurements
4. **Monitor GPU** - Use `nvidia-smi` in another terminal to watch GPU usage
5. **Check disk space** - CSV files can grow large with many benchmarks

## Support

### Common Issues

**Q: Script says "Fusion Rate not found"**
A: Results may not be displaying. Check browser console (F12) for JavaScript errors.

**Q: Benchmarks take too long**
A: Normal for CPU/WASM backends. WebGL/WebGPU are faster but run more iterations.

**Q: CSV file is empty**
A: Check that metrics server is running and saving files correctly.

**Q: "Cannot locate option" errors**
A: Model names or values don't match. Script will print available options.

### Debugging

Enable more detailed logging by checking:
1. Browser console (F12) - JavaScript errors
2. Terminal output - Script progress
3. CSV files - Results being saved
4. `nvidia-smi` - GPU status

## Version History

- **v1.0** (Jan 2026): Initial automation script with 9 models, 4 backends
  - Automatic model-specific configuration
  - Backend-specific warmup/run values
  - Real-time completion detection
  - CSV result export

## License

Part of TensorFlow.js Pre-trained Model Profiling project.

---

**Last Updated**: January 11, 2026
**Created**: January 11, 2026
**Author**: Benchmark Automation Team
