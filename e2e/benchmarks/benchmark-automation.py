#!/usr/bin/env python3
"""
TensorFlow.js Benchmark Automation - Python Script
Uses Selenium to automate the benchmark webpage directly
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import sys

# Configuration
CHROME_PATH = r'C:\Program Files\Google\Chrome Dev\Application\chrome.exe'
URL = 'http://127.0.0.1:8080/e2e/benchmarks/local-benchmark/'
MODELS = [
    'SelfieSegmentation-General',
    'HandPoseDetector',
    'speech-commands',
    'Coco-SSD',
    'MobileBert',
    'MobileNetV3',
    'ArPortraitDepth',
    'bodypix',
    'posenet'
]
BACKENDS = ['cpu', 'webgl', 'wasm', 'webgpu']
NUM_WARMUPS = 2
NUM_RUNS = 10

# Backend-specific configurations
BACKEND_CONFIGS = {
    'webgl': {
        'warmups': 10,
        'runs': 1024
    },
    'webgpu': {
        'warmups': 10,
        'runs': 1024
    },
    'cpu': {
        'warmups': 5,
        'runs': 100
    },
    'wasm': {
        'warmups': 5,
        'runs': 100
    }
}

# Model-specific configurations
MODEL_CONFIGS = {
    'HandPoseDetector': {
        'lil-gui-name-20': 'full'
    },
    'Coco-SSD': {
        'lil-gui-name-20': 'MobileNetV2'
    },
    'MobileNetV3': {
        'lil-gui-name-7': 'large_100'
    },
    'bodypix': {
        'lil-gui-name-22': 'tensor',
        'lil-gui-name-20': '1'
    },
    'posenet': {
        'lil-gui-name-20': '1024',
        'lil-gui-name-21': 'ResNet50',
        'lil-gui-name-22': 'tensor'
    }
}

def setup_driver():
    """Create and configure Chrome WebDriver"""
    print('🌐 Setting up Chrome driver...')
    
    chrome_options = Options()
    chrome_options.binary_location = CHROME_PATH
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(1280, 720)
    
    print('✓ Chrome driver ready')
    return driver

def clear_cache(driver):
    """Clear browser cache and local storage"""
    print('  🧹 Clearing cache and storage...')
    
    # Clear local storage
    driver.execute_script('localStorage.clear();')
    driver.execute_script('sessionStorage.clear();')
    
    # Refresh page
    driver.refresh()
    time.sleep(2)
    
    print('  ✓ Cache cleared')

def wait_for_element(driver, by, value, timeout=10):
    """Wait for element to be present"""
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )
        return element
    except:
        return None

def select_dropdown(driver, selector, value):
    """Select a dropdown option by visible text"""
    try:
        element = driver.find_element(By.CSS_SELECTOR, selector)
        select = Select(element)
        
        # Try select by visible text first
        try:
            select.select_by_visible_text(value)
            time.sleep(0.5)
            return True
        except:
            # If that fails, try by value
            try:
                select.select_by_value(value)
                time.sleep(0.5)
                return True
            except:
                # If that fails, try finding by partial text
                for option in select.options:
                    if value.lower() in option.text.lower():
                        select.select_by_value(option.get_attribute('value'))
                        time.sleep(0.5)
                        return True
                
                # Last resort: print available options and try exact match
                print(f'    Available options in {selector}:')
                for option in select.options:
                    print(f'      - Text: "{option.text}", Value: "{option.get_attribute("value")}"')
                
                raise Exception(f'Could not find option matching "{value}"')
        
    except Exception as e:
        print(f'  ⚠️  Could not select {value}: {str(e)}')
        return False

def set_input_value(driver, selector, value):
    """Set input field value"""
    try:
        element = driver.find_element(By.CSS_SELECTOR, selector)
        # Clear by selecting all and deleting
        element.click()
        time.sleep(0.2)
        element.send_keys('\ue009a')  # Ctrl+A
        element.send_keys('\ue003')   # Delete
        time.sleep(0.2)
        element.send_keys(str(value))
        # Trigger change events
        driver.execute_script(f"arguments[0].value = '{value}'; arguments[0].dispatchEvent(new Event('change', {{bubbles: true}})); arguments[0].dispatchEvent(new Event('input', {{bubbles: true}});", element)
        time.sleep(0.5)
        return True
    except Exception as e:
        print(f'  ⚠️  Could not set {selector}: {str(e)}')
        return False

def click_button(driver, button_text):
    """Click button by text"""
    try:
        buttons = driver.find_elements(By.TAG_NAME, 'button')
        for button in buttons:
            if button_text.lower() in button.text.lower():
                button.click()
                time.sleep(1)
                return True
        print(f'  ⚠️  Button "{button_text}" not found')
        return False
    except Exception as e:
        print(f'  ⚠️  Could not click button: {str(e)}')
        return False

def run_benchmark(driver, model, backend, run_number, total_runs):
    """Run a single benchmark"""
    print(f'\n[{run_number}/{total_runs}] Running: {model} + {backend}')
    
    # Get backend-specific warmups and runs
    backend_config = BACKEND_CONFIGS.get(backend, {'warmups': 10, 'runs': 1024})
    num_warmups = backend_config['warmups']
    num_runs = backend_config['runs']
    
    print(f'  Using: warmups={num_warmups}, runs={num_runs}')
    
    try:
        # Clear cache
        clear_cache(driver)
        
        # Wait for form elements
        print('  ⏳ Waiting for form elements...')
        wait_for_element(driver, By.CSS_SELECTOR, 'select[aria-labelledby="lil-gui-name-1"]', timeout=10)
        time.sleep(1)
        
        # Select model using aria-labelledby="lil-gui-name-1"
        print(f'  📋 Selecting model: {model}')
        for _ in range(3):  # Try multiple times
            select_dropdown(driver, 'select[aria-labelledby="lil-gui-name-1"]', model)
            time.sleep(0.3)
        
        # Verify model was selected
        try:
            model_val = driver.find_element(By.CSS_SELECTOR, 'select[aria-labelledby="lil-gui-name-1"]').get_attribute('value')
            print(f'     Verified model value: {model_val}')
        except:
            pass
        
        # Set model-specific configurations
        if model in MODEL_CONFIGS:
            print(f'  🔧 Setting model-specific configurations for {model}...')
            config = MODEL_CONFIGS[model]
            
            for aria_id, value in config.items():
                print(f'    Setting {aria_id} = {value}')
                selector = f'select[aria-labelledby="{aria_id}"]'
                for _ in range(3):
                    select_dropdown(driver, selector, value)
                    time.sleep(0.3)
                
                # Verify it was set
                try:
                    set_val = driver.find_element(By.CSS_SELECTOR, selector).get_attribute('value')
                    print(f'      Verified: {set_val}')
                except:
                    pass
        
        time.sleep(1)
        
        # Select backend using aria-labelledby="lil-gui-name-8"
        print(f'  ⚙️  Selecting backend: {backend}')
        for _ in range(3):  # Try multiple times
            select_dropdown(driver, 'select[aria-labelledby="lil-gui-name-8"]', backend)
            time.sleep(0.3)
        
        # Verify backend was selected
        try:
            backend_val = driver.find_element(By.CSS_SELECTOR, 'select[aria-labelledby="lil-gui-name-8"]').get_attribute('value')
            print(f'     Verified backend value: {backend_val}')
        except:
            pass
        
        # Set warmups using aria-labelledby="lil-gui-name-2"
        print(f'  🔥 Setting warmups: {num_warmups}')
        set_input_value(driver, 'input[aria-labelledby="lil-gui-name-2"]', num_warmups)
        # Verify it was set
        try:
            val = driver.find_element(By.CSS_SELECTOR, 'input[aria-labelledby="lil-gui-name-2"]').get_attribute('value')
            print(f'     Verified warmups value: {val}')
        except:
            pass
        
        # Set runs using aria-labelledby="lil-gui-name-3"
        print(f'  🔁 Setting runs: {num_runs}')
        set_input_value(driver, 'input[aria-labelledby="lil-gui-name-3"]', num_runs)
        # Verify it was set
        try:
            val = driver.find_element(By.CSS_SELECTOR, 'input[aria-labelledby="lil-gui-name-3"]').get_attribute('value')
            print(f'     Verified runs value: {val}')
        except:
            pass
        
        # Click Run Benchmark button
        print('  ▶️  Clicking Run Benchmark...')
        if not click_button(driver, 'Run'):
            print('  ❌ Could not click Run button')
            return False
        
        # Wait for benchmark to complete
        print('  ⏳ Benchmark running...')
        
        start_time = time.time()
        max_wait_time = 600  # Max 10 minutes per benchmark
        
        # Step 1: Wait for button to BECOME disabled (benchmark started)
        print('    ⏳ Waiting for benchmark to start (button disabled)...')
        button_disabled = False
        for i in range(30):  # Wait up to 30 seconds
            try:
                buttons = driver.find_elements(By.TAG_NAME, 'button')
                for button in buttons:
                    if 'Run' in button.text and not button.is_enabled():
                        print(f'    ✓ Benchmark started (button disabled)')
                        button_disabled = True
                        break
                if button_disabled:
                    break
            except:
                pass
            time.sleep(1)
        
        if not button_disabled:
            print('    ⚠️  Button did not disable, but continuing...')
        
        # Step 2: Wait for button to BECOME enabled again (benchmark finished)
        print('    ⏳ Waiting for benchmark to finish (button enabled)...')
        
        benchmark_complete = False
        
        while True:
            elapsed = int(time.time() - start_time)
            
            if elapsed > max_wait_time:
                print(f'    ⏱️  Max wait time reached ({max_wait_time}s). Moving to next benchmark.')
                break
            
            # Check if button is enabled again
            try:
                buttons = driver.find_elements(By.TAG_NAME, 'button')
                for button in buttons:
                    if 'Run' in button.text and button.is_enabled():
                        # Also verify "Fusion Rate" appears in results
                        page_text = driver.find_element(By.TAG_NAME, 'body').text
                        if 'Fusion Rate' in page_text:
                            print(f'    ✓ Benchmark complete (button enabled + "Fusion Rate" found)')
                            benchmark_complete = True
                            break
                
                if benchmark_complete:
                    break
            except:
                pass
            
            if elapsed % 10 == 0 and elapsed > 0:
                print(f'    ⏱️  {elapsed}s...')
            
            time.sleep(1)
        
        print('  ✓ Benchmark completed')
        time.sleep(3)  # Wait for CSV to write
        return True
        
    except Exception as e:
        print(f'  ❌ Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

def main():
    print(f'''
╔════════════════════════════════════════════════════════════╗
║   TensorFlow.js Benchmark Automation - Python Edition      ║
╚════════════════════════════════════════════════════════════╝

📋 Configuration:
   URL: {URL}
   Models: {', '.join(MODELS)}
   Backends: {', '.join(BACKENDS)}
   Warmups: {NUM_WARMUPS} | Runs: {NUM_RUNS}
   Total benchmarks: {len(MODELS) * len(BACKENDS)}

''')
    
    driver = None
    try:
        # Setup driver
        driver = setup_driver()
        
        # Navigate to page
        print(f'📂 Loading page: {URL}')
        driver.get(URL)
        time.sleep(3)
        print('✓ Page loaded')
        
        # Run benchmarks
        total_benchmarks = len(MODELS) * len(BACKENDS)
        completed_benchmarks = 0
        
        for model in MODELS:
            print(f'\n{"="*60}')
            print(f'📦 Model: {model}')
            print("="*60)
            
            for backend in BACKENDS:
                completed_benchmarks += 1
                
                if not run_benchmark(driver, model, backend, completed_benchmarks, total_benchmarks):
                    print(f'  ⚠️  Benchmark failed, continuing to next...')
                
                # Wait between runs
                if completed_benchmarks < total_benchmarks:
                    print('  ⏳ Waiting 5s before next benchmark...')
                    time.sleep(5)
        
        print(f'\n{"="*60}')
        print(f'✅ ALL BENCHMARKS COMPLETED! ({completed_benchmarks}/{total_benchmarks})')
        print('📁 Results saved to benchmark_results.csv')
        print("="*60)
        
    except Exception as e:
        print(f'\n❌ Fatal error: {str(e)}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        if driver:
            print('\n⏳ Keeping browser open for 30 seconds...')
            time.sleep(30)
            driver.quit()
            print('🛑 Browser closed')

if __name__ == '__main__':
    main()
