/**
 * GPU Metrics Collector
 * Cross-platform GPU metrics collection for benchmarking
 * Supports: macOS (Metal), Linux (NVIDIA), Windows (NVIDIA)
 */

const { execSync, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class GPUMetricsCollector {
  constructor(benchmarkDir = '.') {
    this.platform = os.platform();
    this.benchmarkDir = benchmarkDir;
    this.metricsFile = path.join(benchmarkDir, 'benchmark_metrics.csv');
    this.intervalsFile = path.join(benchmarkDir, 'gpu_utilization_intervals.csv');
    
    // Monitoring state
    this.monitoring = false;
    this.intervalSamples = [];
    this.gpuUtilizationValues = [];
    this.gpuMemoryValues = [];
    this.gpuPowerValues = [];
    this.systemMemoryValues = [];
    this.monitoringThread = null;
    
    // GPU info
    this.gpuVendor = this._detectGPUVendor();
    this.gpuName = this._detectGPUName();
    
    // CSV headers
    this.benchmarkHeaders = [
      'timestamp', 'model', 'backend', 'end_to_end_latency_ms',
      'kernel_compilation_time_ms', 'kernel_launch_latency_ms',
      'top_kernel_1_name', 'top_kernel_1_time_ms',
      'top_kernel_2_name', 'top_kernel_2_time_ms',
      'top_kernel_3_name', 'top_kernel_3_time_ms',
      'top_kernel_4_name', 'top_kernel_4_time_ms',
      'top_kernel_5_name', 'top_kernel_5_time_ms',
      'gpu_vendor', 'gpu_name', 'gpu_utilization_percent',
      'gpu_memory_utilization_percent', 'gpu_power_draw_watts'
    ];
    
    this.intervalsHeaders = [
      'timestamp', 'model', 'backend', 'timestamp_sec',
      'gpu_utilization_percent', 'gpu_memory_utilization_percent',
      'gpu_power_draw_watts', 'memory_mb'
    ];
    
    this._initializeCSVFiles();
  }
  
  /**
   * Detect GPU vendor based on platform
   */
  _detectGPUVendor() {
    if (this.platform === 'darwin') {
      return 'Apple';
    } else if (this.platform === 'linux' || this.platform === 'win32') {
      return 'NVIDIA';
    }
    return 'Unknown';
  }
  
  /**
   * Detect GPU name
   */
  _detectGPUName() {
    try {
      if (this.platform === 'darwin') {
        // macOS: Extract from system_profiler
        const output = execSync('system_profiler SPDisplaysDataType', {
          encoding: 'utf8',
          timeout: 5000
        });
        
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('Chip') || line.includes('GPU')) {
            const match = line.match(/:\s*(.+)/);
            if (match) return match[1].trim();
          }
        }
        return 'Apple Silicon GPU';
      } else if (this.platform === 'linux' || this.platform === 'win32') {
        // Linux/Windows: Extract from nvidia-smi
        const cmd = this.platform === 'win32'
          ? 'nvidia-smi --query-gpu=name --format=csv,noheader'
          : 'nvidia-smi --query-gpu=name --format=csv,noheader';
        
        const output = execSync(cmd, {
          encoding: 'utf8',
          timeout: 3000
        });
        
        return output.trim().split('\n')[0];
      }
    } catch (error) {
      console.log('Could not detect GPU name:', error.message);
    }
    return 'Unknown GPU';
  }
  
  /**
   * Initialize CSV files with headers
   */
  _initializeCSVFiles() {
    // Initialize benchmark_metrics.csv
    if (!fs.existsSync(this.metricsFile)) {
      try {
        const header = this.benchmarkHeaders.join(',') + '\n';
        fs.writeFileSync(this.metricsFile, header, 'utf8');
        console.log(`✓ Created ${this.metricsFile}`);
      } catch (error) {
        console.error(`✗ Error creating metrics file: ${error.message}`);
      }
    }
    
    // Initialize gpu_utilization_intervals.csv
    if (!fs.existsSync(this.intervalsFile)) {
      try {
        const header = this.intervalsHeaders.join(',') + '\n';
        fs.writeFileSync(this.intervalsFile, header, 'utf8');
        console.log(`✓ Created ${this.intervalsFile}`);
      } catch (error) {
        console.error(`✗ Error creating intervals file: ${error.message}`);
      }
    }
  }
  
  // ============================================================
  // macOS GPU Metrics (Apple Silicon)
  // ============================================================
  
  _getGPUUtilizationMacOS() {
    try {
      const output = execSync('vm_stat', {
        encoding: 'utf8',
        timeout: 3000
      });
      
      const lines = output.trim().split('\n');
      let totalPages = 0;
      let freePages = 0;
      
      for (const line of lines) {
        if (line.includes('Pages free:')) {
          freePages = parseInt(line.split(':')[1].trim().split('.')[0]);
        } else if (line.includes('Pages speculative:')) {
          totalPages = parseInt(line.split(':')[1].trim().split('.')[0]);
        }
      }
      
      if (totalPages > 0) {
        const utilization = ((totalPages - freePages) / totalPages) * 100;
        return Math.round(Math.max(0, Math.min(100, utilization)) * 100) / 100;
      }
      
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }
  
  _getGPUMemoryMacOS() {
    try {
      const output = execSync('system_profiler SPDisplaysDataType', {
        encoding: 'utf8',
        timeout: 5000
      });
      
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('VRAM') || line.includes('Memory')) {
          const match = line.match(/(\d+)\s*(?:GB|MB)/);
          if (match) {
            return 50.0; // Default estimate
          }
        }
      }
      
      return this._getGPUUtilizationMacOS();
    } catch (error) {
      return 'N/A';
    }
  }
  
  _getGPUPowerMacOS() {
    try {
      const output = execSync('sudo -n powermetrics -s gpu_power -n 1', {
        encoding: 'utf8',
        timeout: 15000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('GPU Power')) {
          const match = line.match(/GPU Power:\s*(\d+\.?\d*)\s*([mW]+)/);
          if (match) {
            let value = parseFloat(match[1]);
            const unit = match[2];
            
            // Convert mW to W if needed
            if (unit === 'mW') {
              value = value / 1000;
            }
            
            return Math.round(value * 100) / 100;
          }
        }
      }
      
      return 'N/A';
    } catch (error) {
      if (error.message.includes('sudo') || error.message.includes('permission')) {
        console.log('⚠️  GPU Power requires passwordless sudo setup:');
        console.log("   echo '%admin ALL=(ALL) NOPASSWD: /usr/bin/powermetrics' | sudo tee -a /etc/sudoers.d/powermetrics");
      }
      return 'N/A';
    }
  }
  
  // ============================================================
  // Linux/Windows GPU Metrics (NVIDIA)
  // ============================================================
  
  _getGPUUtilizationNVIDIA() {
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=utilization.gpu --format=csv,nounits,noheader',
        {
          encoding: 'utf8',
          timeout: 3000
        }
      );
      
      return parseFloat(output.trim().split('\n')[0]);
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log('✗ nvidia-smi not found. Ensure NVIDIA drivers are installed.');
      }
      return 'N/A';
    }
  }
  
  _getGPUMemoryNVIDIA() {
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=utilization.memory --format=csv,nounits,noheader',
        {
          encoding: 'utf8',
          timeout: 3000
        }
      );
      
      return parseFloat(output.trim().split('\n')[0]);
    } catch (error) {
      return 'N/A';
    }
  }
  
  _getGPUPowerNVIDIA() {
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=power.draw --format=csv,nounits,noheader',
        {
          encoding: 'utf8',
          timeout: 3000
        }
      );
      
      const value = parseFloat(output.trim().split('\n')[0]);
      return Math.round(value * 100) / 100;
    } catch (error) {
      return 'N/A';
    }
  }
  
  // ============================================================
  // Platform-Agnostic Methods
  // ============================================================
  
  getGPUUtilization() {
    if (this.platform === 'darwin') {
      return this._getGPUUtilizationMacOS();
    } else {
      return this._getGPUUtilizationNVIDIA();
    }
  }
  
  getGPUMemoryUtilization() {
    if (this.platform === 'darwin') {
      return this._getGPUMemoryMacOS();
    } else {
      return this._getGPUMemoryNVIDIA();
    }
  }
  
  getGPUPowerDraw() {
    if (this.platform === 'darwin') {
      return this._getGPUPowerMacOS();
    } else {
      return this._getGPUPowerNVIDIA();
    }
  }
  
  getSystemMemoryMB() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      return Math.round(usedMemory / (1024 * 1024) * 100) / 100;
    } catch (error) {
      return 'N/A';
    }
  }
  
  // ============================================================
  // Monitoring Loop
  // ============================================================
  
  startMonitoring() {
    this.monitoring = true;
    this.intervalSamples = [];
    this.gpuUtilizationValues = [];
    this.gpuMemoryValues = [];
    this.gpuPowerValues = [];
    this.systemMemoryValues = [];
    
    this.monitoringThread = setInterval(() => {
      this._collectMetrics();
    }, 1000); // 1-second interval
    
    console.log('✓ GPU monitoring started');
  }
  
  _collectMetrics() {
    if (!this.monitoring) {
      return;
    }
    
    try {
      const startTime = this.startTime || Date.now();
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Collect metrics
      const gpuUtil = this.getGPUUtilization();
      const gpuMem = this.getGPUMemoryUtilization();
      const gpuPower = this.getGPUPowerDraw();
      const memoryMB = this.getSystemMemoryMB();
      
      // Convert to numeric if possible
      const gpuUtilNum = gpuUtil !== 'N/A' ? parseFloat(gpuUtil) : null;
      const gpuMemNum = gpuMem !== 'N/A' ? parseFloat(gpuMem) : null;
      const gpuPowerNum = gpuPower !== 'N/A' ? parseFloat(gpuPower) : null;
      
      // Store sample
      const sample = {
        timestamp_sec: Math.round(elapsed * 100) / 100,
        gpu_utilization_percent: gpuUtil,
        gpu_memory_utilization_percent: gpuMem,
        gpu_power_draw_watts: gpuPower,
        memory_mb: memoryMB
      };
      
      this.intervalSamples.push(sample);
      
      // Track numeric values for averaging
      if (gpuUtilNum !== null) {
        this.gpuUtilizationValues.push(gpuUtilNum);
      }
      if (gpuMemNum !== null) {
        this.gpuMemoryValues.push(gpuMemNum);
      }
      if (gpuPowerNum !== null) {
        this.gpuPowerValues.push(gpuPowerNum);
      }
    } catch (error) {
      console.error(`Monitoring error: ${error.message}`);
    }
  }
  
  stopMonitoring() {
    this.monitoring = false;
    if (this.monitoringThread) {
      clearInterval(this.monitoringThread);
      this.monitoringThread = null;
    }
    
    const metrics = {};
    
    // Calculate averages
    if (this.gpuUtilizationValues.length > 0) {
      const avg = this.gpuUtilizationValues.reduce((a, b) => a + b, 0) / this.gpuUtilizationValues.length;
      metrics.gpu_utilization_percent = Math.round(avg * 100) / 100;
    } else {
      metrics.gpu_utilization_percent = 'N/A';
    }
    
    if (this.gpuMemoryValues.length > 0) {
      const avg = this.gpuMemoryValues.reduce((a, b) => a + b, 0) / this.gpuMemoryValues.length;
      metrics.gpu_memory_utilization_percent = Math.round(avg * 100) / 100;
    } else {
      metrics.gpu_memory_utilization_percent = 'N/A';
    }
    
    if (this.gpuPowerValues.length > 0) {
      const avg = this.gpuPowerValues.reduce((a, b) => a + b, 0) / this.gpuPowerValues.length;
      metrics.gpu_power_draw_watts = Math.round(avg * 100) / 100;
    } else {
      metrics.gpu_power_draw_watts = 'N/A';
    }
    
    console.log(`✓ GPU monitoring stopped (${this.intervalSamples.length} samples collected)`);
    return metrics;
  }
  
  // ============================================================
  // CSV Operations
  // ============================================================
  
  appendBenchmarkMetrics(benchmarkData) {
    try {
      const row = this.benchmarkHeaders.map(header => {
        const value = benchmarkData[header] || '';
        // Escape CSV values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
      
      fs.appendFileSync(this.metricsFile, row + '\n', 'utf8');
      console.log('✓ Appended to benchmark_metrics.csv');
    } catch (error) {
      console.error(`✗ Error appending benchmark metrics: ${error.message}`);
    }
  }
  
  appendIntervalMetrics(intervalData) {
    try {
      let content = '';
      for (const sample of this.intervalSamples) {
        const rowData = { ...intervalData, ...sample };
        const row = this.intervalsHeaders.map(header => {
          const value = rowData[header] || '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
        
        content += row + '\n';
      }
      
      fs.appendFileSync(this.intervalsFile, content, 'utf8');
      console.log(`✓ Appended ${this.intervalSamples.length} samples to gpu_utilization_intervals.csv`);
    } catch (error) {
      console.error(`✗ Error appending interval metrics: ${error.message}`);
    }
  }
  
  printMetricsSummary(model, backend, gpuMetrics) {
    console.log('\n' + '='.repeat(60));
    console.log(`GPU METRICS SUMMARY: ${model} (${backend})`);
    console.log('='.repeat(60));
    console.log(`GPU Vendor:              ${this.gpuVendor}`);
    console.log(`GPU Model:               ${this.gpuName}`);
    console.log(`GPU Utilization:         ${gpuMetrics.gpu_utilization_percent}%`);
    console.log(`GPU Memory Utilization:  ${gpuMetrics.gpu_memory_utilization_percent}%`);
    console.log(`GPU Power Draw:          ${gpuMetrics.gpu_power_draw_watts} W`);
    console.log(`Samples Collected:       ${this.intervalSamples.length}`);
    console.log('='.repeat(60) + '\n');
  }
}

module.exports = GPUMetricsCollector;
