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

/**
 * This tool depends on tf-core, tf-layers, tf-converter and the backends
 * (tf-backend-cpu, tf-backend-webgl or tf-backend-wasm) that you would use.
 */

/**
 * Generates a random input for `model`, based on `model.inputs`. For
 * tf.GraphModel, `NamedTensorMap` input will be returned; otherwise,
 * `Tensor[]` will be returned.
 *
 * ```js
 * const model = tf.sequential(
 *    {layers: [tf.layers.dense({units: 1, inputShape: [3]})]});
 * const input = generateInput(model);
 * const prediction = await model.predict(input);
 *
 * console.log(`Generated input: ${Object.values(input)}`);
 * console.log(`Prediction for the generated input: ${prediction}`);
 * ```
 *
 * @param model The model object that is used to generated the input.
 */
function generateInput(model) {
  if (model == null) {
    throw new Error('The model does not exist.');
  } else if (model.inputs == null) {
    throw new Error('The model.inputs cannot be found.');
  }

  const inputDefs = model.inputs.map((inputNode, inputNodeIndex) => {
    // Replace -1 or null in input tensor shape.
    const inputShape = inputNode.shape.map(shapeValue => {
      if (shapeValue == null || shapeValue < 0) {
        return 1;
      } else {
        return shapeValue;
      }
    });
    return {
      shape: inputShape,
      name: inputNode.name,
      dtype: inputNode.dtype,
      range: [0, 1000]
    };
  });

  return generateInputFromDef(inputDefs, model instanceof tf.GraphModel);
}

/**
 * Generates a random input for input definition.
 *
 * ```js
 * const input = generateInput(inputDefs);
 *
 * console.log(`Generated input: ${Object.values(input)}`);
 * console.log(`Prediction for the generated input: ${prediction}`);
 * ```
 *
 * @param inputDefs The input definition that is used to generate the input.
 * @param isForGraphModel flag for whether to generate inputs for GraphModel
 */
function generateInputFromDef(inputDefs, isForGraphModel = false) {
  if (inputDefs == null) {
    throw new Error('The inputDef cannot be found.');
  }

  const tensorArray = [];
  try {
    inputDefs.forEach((inputDef, inputDefIndex) => {
      const inputShape = inputDef.shape;

      // Construct the input tensor.
      let inputTensor;
      if (inputDef.dtype === 'float32' || inputDef.dtype === 'int32') {
        // We assume a bell curve normal distribution. In this case,
        // we use below approximation:
        // mean ~= (min + max) / 2
        // std ~= (max - min) / 4
        // Note: for std, our approximation is based on the fact that
        // 95% of the data is within the range of 2 stds above and
        // below the mean. So 95% of the data falls in the range of
        // 4 stds.
        const min = inputDef.range[0];
        const max = inputDef.range[1];
        const mean = (min + max) / 2;
        const std = (max - min) / 4;
        generatedRaw = tf.randomNormal(inputShape, mean, std, inputDef.dtype);
        // We clip the value to be within [min, max], because 5% of
        // the data generated maybe outside of [min, max].
        inputTensor = tf.clipByValue(generatedRaw, min, max);
        generatedRaw.dispose();
      } else if (inputDef.dtype === 'string') {
        size = tf.util.sizeFromShape(inputDef.shape);
        data = [...Array(size)].map(
            () => Math.random().toString(36).substring(2, 7));
        inputTensor = tf.tensor(data, inputShape, inputDef.dtype);
      } else {
        throw new Error(
            `The ${inputDef.dtype} dtype of '${inputDef.name}' input ` +
            `at model.inputs[${inputDefIndex}] is not supported.`);
      }
      tensorArray.push(inputTensor);
    });

    // Return tensor map for tf.GraphModel.
    if (isForGraphModel) {
      const tensorMap = inputDefs.reduce((map, inputDef, i) => {
        map[inputDef.name] = tensorArray[i];
        return map;
      }, {});
      return tensorMap;
    }

    return tensorArray;
  } catch (e) {
    // Dispose all input tensors when the input construction is failed.
    tensorArray.forEach(tensor => {
      if (tensor instanceof tf.Tensor) {
        tensor.dispose();
      }
    });
    throw e;
  }
}

/**
 * Wrap the model's predict function (`model.predict` for tf.LayersModel
 * and `model.executeAsync` for tf.GraphModel) with the input.
 *
 * @param model An instance of tf.GraphModel or tf.LayersModel for finding and
 *     wrapping the predict function.
 * @param input The input tensor container for model inference.
 */
function getPredictFnForModel(model, input) {
  let predict;
  if (model instanceof tf.GraphModel) {
    // Because there's no straightforward way to analyze whether a graph has
    // dynamic op, so we try to use `execute` and, if it fails, we will fall
    // back to `executeAsync`.
    try {
      tf.tidy(() => {
        model.execute(input);
      });
      predict = () => model.execute(input);
    } catch (e) {
      predict = async () => await model.executeAsync(input);
    }
  } else if (model instanceof tf.LayersModel) {
    predict = () => model.predict(input);
  } else {
    throw new Error(
        'Predict function was not found. Please provide a tf.GraphModel or ' +
        'tf.LayersModel');
  }
  return predict;
}

/**
 * Executes the predict function for `model` (`model.predict` for tf.LayersModel
 * and `model.executeAsync` for tf.GraphModel) and times the inference process
 * for `numRuns` rounds. Then returns a promise that resolves with information
 * about the model's inference time:
 * - `times`: an array of inference time for each inference
 * - `averageTime`: the average time of all inferences
 * - `averageTimeExclFirst`: the average time of all inferences except the
 *    first.
 * - `minTime`: the minimum time of all inferences
 * - `maxTime`: the maximum time of all inferences
 *
 * The inference time contains the time spent by both `predict()` and `data()`
 * called by tensors in the prediction.
 *
 * ```js
 * const modelUrl =
 *    'https://tfhub.dev/google/imagenet/mobilenet_v2_140_224/classification/2';
 * const model = await tf.loadGraphModel(modelUrl, {fromTFHub: true});
 * const zeros = tf.zeros([1, 224, 224, 3]);
 * const timeInfo =
 *    await timeModelInference(model, zeros, 2);
 *
 * console.log(`Elapsed time array: ${timeInfo.times}`);
 * console.log(`Average time: ${timeInfo.averageTime}`);
 * console.log(`Minimum time: ${timeInfo.minTime}`);
 * console.log(`Maximum time: ${timeInfo.maxTime}`);
 * ```
 *
 * @param model An instance of tf.GraphModel or tf.LayersModel for timing the
 *     inference process.
 * @param input The input tensor container for model inference.
 * @param numRuns The number of rounds for timing the inference process.
 */
async function timeModelInference(model, input, numRuns = 1) {
  const predict = getPredictFnForModel(model, input);
  return timeInference(predict, numRuns);
}

/**
 * Executes `predict()` and times the inference process for `numRuns` rounds.
 * Then returns a promise that resolves with information about the inference
 * time:
 * - `times`: an array of inference time for each inference
 * - `averageTime`: the average time of all inferences
 * - `averageTimeExclFirst`: the average time of all inferences except the
 *    first.
 * - `minTime`: the minimum time of all inferences
 * - `maxTime`: the maximum time of all inferences
 *
 * The inference time contains the time spent by both `predict()` and `data()`
 * called by tensors in the prediction.
 *
 * ```js
 * const modelUrl =
 *    'https://tfhub.dev/google/imagenet/mobilenet_v2_140_224/classification/2';
 * const model = await tf.loadGraphModel(modelUrl, {fromTFHub: true});
 * const zeros = tf.zeros([1, 224, 224, 3]);
 * const timeInfo =
 *    await timeInference(() => model.predict(zeros), 2);
 *
 * console.log(`Elapsed time array: ${timeInfo.times}`);
 * console.log(`Average time: ${timeInfo.averageTime}`);
 * console.log(`Minimum time: ${timeInfo.minTime}`);
 * console.log(`Maximum time: ${timeInfo.maxTime}`);
 * ```
 *
 * @param predict The predict function to execute and time.
 * @param numRuns The number of rounds for `predict` to execute and time.
 */
async function timeInference(predict, numRuns = 1) {
  if (typeof predict !== 'function') {
    throw new Error(
        'The first parameter should be a function, while ' +
        `a(n) ${typeof predict} is found.`);
  }

  const times = [];
  for (let i = 0; i < numRuns; i++) {
    const start = performance.now();
    const res = await predict();
    // Prediction from tflite backend generates in the worker thread,
    // we don't post the result back to main thread to avoid unnecessary
    // overhead in transferring between worker and main thread.
    if (!isTflite()) {
      // The prediction can be tf.Tensor|tf.Tensor[]|{[name: string]:
      // tf.Tensor}.
      const value = await downloadValuesFromTensorContainer(res);
    }
    const elapsedTime = performance.now() - start;

    tf.dispose(res);
    times.push(elapsedTime);
  }

  const averageTime = times.reduce((acc, curr) => acc + curr, 0) / times.length;
  const averageTimeExclFirst = times.length > 1 ?
      times.slice(1).reduce((acc, curr) => acc + curr, 0) / (times.length - 1) :
      'NA';
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  // Calculate kernel launch latency (difference between first and average)
  const kernelLaunchLatency = times.length > 1 ? times[0] - averageTime : 0;

  // Calculate time to first output (first inference time)
  const timeToFirstOutput = times[0];

  // Calculate end-to-end latency (max time across all runs)
  const endToEndLatency = maxTime;

  // Calculate variance in execution times (indicates synchronization overhead)
  const variance = times.reduce((acc, curr) => acc + Math.pow(curr - averageTime, 2), 0) / times.length;
  const synchronizationOverhead = Math.sqrt(variance);

  const timeInfo = {
    times,
    averageTime,
    averageTimeExclFirst,
    minTime,
    maxTime,
    kernelLaunchLatency,
    timeToFirstOutput,
    endToEndLatency,
    synchronizationOverhead
  };
  return timeInfo;
}

/**
 * Time one model inference with parallel compilation feature, based on the
 * current backend.
 *
 * The inference time contains the time spent by both `predict()` and `data()`
 * called by tensors in the prediction.
 *
 * ```js
 * // Benchmark the first infernece time with parallel compilation.
 * const modelUrl =
 *    'https://tfhub.dev/google/imagenet/mobilenet_v2_140_224/classification/2';
 * const model = await tf.loadGraphModel(modelUrl, {fromTFHub: true});
 * const zeros = tf.zeros([1, 224, 224, 3]);
 * const firstInferenceTime =
 *    await timeFirstInference(() => model.predict(zeros), true);
 * ```
 *
 * @param predict The predict function to execute and time for.
 * @param parallelCompile The boolean value to indicate whether to use parallel
 *     compilation. This currently only has effect for WebGL backend and WebGPU
 * backend.
 */
async function timeFirstInference(predict, parallelCompile = false) {
  const start = performance.now();

  // Parallel Compile
  if (parallelCompile && tf.getBackend() === 'webgl') {
    tf.env().set('ENGINE_COMPILE_ONLY', true);
    const compileRes = predict();
    tf.env().set('ENGINE_COMPILE_ONLY', false);
    await tf.backend().checkCompileCompletionAsync();
    tf.backend().getUniformLocations();
    tf.dispose(compileRes);
  } else if (parallelCompile && tf.getBackend() === 'webgpu') {
    tf.env().set('WEBGPU_ENGINE_COMPILE_ONLY', true);
    const compileRes = predict();
    tf.env().set('WEBGPU_ENGINE_COMPILE_ONLY', false);
    await tf.backend().checkCompileCompletionAsync();
    tf.dispose(compileRes);
  } else if (parallelCompile && isTflite()) {
    throw new Error('Parallel Compilation for TFlite is not supported.');
  }

  // First inference
  let res = predict();
  if (parallelCompile && res instanceof Promise) {
    throw new Error(
        'Parallel Compilation for async function is not supported.');
  }
  res = await res;
  await downloadValuesFromTensorContainer(res);
  const elapsedTime = performance.now() - start;

  tf.dispose(res);
  return elapsedTime;
}

/**
 * Downloads the values from the `tensorContainer` from any `tf.Tensor`s found
 * within the `tensorContainer`. Returns a promise of `TypedArray` or
 * `TypedArray[]` that resolves when the computation has finished.
 *
 * The values are asynchronously downloaded in parallel.
 *
 * @param tensorContainer The container of tensors to be downloaded.
 */
async function downloadValuesFromTensorContainer(tensorContainer) {
  let valueContainer;
  const readSync = tf.getBackend() === 'webgl';
  if (tensorContainer instanceof tf.Tensor) {
    if (readSync) {
      valueContainer = tensorContainer.dataSync();
    } else {
      valueContainer = await tensorContainer.data();
    }
  } else if (Array.isArray(tensorContainer)) {
    // Start value downloads from all tensors.
    const valuePromiseContainer = tensorContainer.map(async item => {
      if (item instanceof tf.Tensor) {
        if (readSync) {
          return item.dataSync();
        } else {
          return item.data();
        }
      }
      return item;
    });
    // Wait until all values are downloaded.
    valueContainer = await Promise.all(valuePromiseContainer);
  } else if (tensorContainer != null && typeof tensorContainer === 'object') {
    const valuePromiseContainer = [];
    // Start value downloads from all tensors.
    for (const property in tensorContainer) {
      if (tensorContainer[property] instanceof tf.Tensor) {
        if (readSync) {
          valuePromiseContainer.push(tensorContainer[property].dataSync());
        } else {
          valuePromiseContainer.push(tensorContainer[property].data());
        }
      } else {
        valuePromiseContainer.push(tensorContainer[property]);
      }
    }
    // Wait until all values are downloaded.
    valueContainer = await Promise.all(valuePromiseContainer);
  }
  return valueContainer;
}

/**
 * Executes the predict function for `model` (`model.predict` for
 * tf.LayersModel and `model.executeAsync` for tf.GraphModel) and returns a
 * promise that resolves with information about the memory usage:
 * - `newBytes`: the number of new bytes allocated.
 * - `newTensors`: the number of new tensors created.
 * - `peakBytes`: the peak number of bytes allocated.
 * - `kernels`: an array of kernel information objects about their input and
 * output shapes, number of bytes used, number of new tensors created and kernel
 * time (ms). The array is sorted by `kernelTimeMs` field in non-ascending
 * order.
 * - `aggregatedKernels`: an array of aggregated kernel information objects with
 * `name` and `timeMs` fields. The array is sorted by `timeMs` field in
 * non-ascending order.
 *
 * ```js
 * const modelUrl =
 *    'https://tfhub.dev/google/imagenet/mobilenet_v2_140_224/classification/2';
 * const model = await tf.loadGraphModel(modelUrl, {fromTFHub: true});
 * const zeros = tf.zeros([1, 224, 224, 3]);
 * const profileInfo = await profileModelInference(model, zeros);
 *
 * console.log(`newBytes: ${profileInfo.newBytes}`);
 * console.log(`newTensors: ${profileInfo.newTensors}`);
 * console.log(`peakBytes: ${profileInfo.peakBytes}`);
 * ```
 *
 * @param model An instance of tf.GraphModel or tf.LayersModel for profiling
 *     memory usage in the inference process.
 * @param input The input tensor container for model inference.
 * @param numProfiles The number of rounds for profiling the inference process.
 */
async function profileModelInference(model, input, numProfiles = 1) {
  const predict = getPredictFnForModel(model, input);
  return profileInference(predict, false, numProfiles);
}

/**
 * Executes `predict()` and returns a promise that resolves with information
 * about the memory usage:
 * - `newBytes`: the number of new bytes allocated.
 * - `newTensors`: the number of new tensors created.
 * - `peakBytes`: the peak number of bytes allocated.
 * - `kernels`: an array of kernel information objects about their input and
 * output shapes, number of bytes used, number of new tensors created and kernel
 * time (ms). The array is sorted by `kernelTimeMs` field in non-ascending
 * order.
 * - `aggregatedKernels`: an array of aggregated kernel information objects with
 * `name` and `timeMs` fields. The array is sorted by `timeMs` field in
 * non-ascending order.
 *
 * ```js
 * const modelUrl =
 *    'https://tfhub.dev/google/imagenet/mobilenet_v2_140_224/classification/2';
 * const model = await tf.loadGraphModel(modelUrl, {fromTFHub: true});
 * const zeros = tf.zeros([1, 224, 224, 3]);
 * const profileInfo = await profileInference(() =>
 * model.predict(zeros));
 *
 * console.log(`newBytes: ${profileInfo.newBytes}`);
 * console.log(`newTensors: ${profileInfo.newTensors}`);
 * console.log(`peakBytes: ${profileInfo.peakBytes}`);
 * ```
 *
 * @param predict The predict function to execute for profiling memory usage.
 * @param isTflite Whether a TFLite model is being profiled or not.
 * @param numProfiles The number of rounds for `predict` to execute and profile.
 */
async function profileInference(predict, isTflite = false, numProfiles = 1) {
  if (typeof predict !== 'function') {
    throw new Error(
        'The first parameter should be a function, while ' +
        `a(n) ${typeof predict} is found.`);
  }

  let kernelInfo = {};
  let kernelInfos = [];
  const compilationStartTime = performance.now();
  let firstExecutionTime = null;

  if (isTflite) {
    for (let i = 0; i < numProfiles; i++) {
      const execStart = performance.now();
      await predict();
      const execTime = performance.now() - execStart;
      if (firstExecutionTime === null) {
        firstExecutionTime = execTime;
      }

      const profileItems = await tfliteModel.getProfilingResults();
      kernelInfo.kernels = profileItems.map(item => {
        return {
          name: item.nodeType,
          kernelTimeMs: item.nodeExecMs,
          // TODO: Shapes are not supported yet.
          inputShapes: [],
          outputShapes: [],
        };
      });
      kernelInfos.push(kernelInfo);
    }
  } else {
    for (let i = 0; i < numProfiles; i++) {
      const execStart = performance.now();
      kernelInfo = await tf.profile(async () => {
        const res = await predict();
        await downloadValuesFromTensorContainer(res);
        tf.dispose(res);
      });
      const execTime = performance.now() - execStart;
      if (firstExecutionTime === null) {
        firstExecutionTime = execTime;
      }
      kernelInfos.push(kernelInfo);
    }
  }

  const compilationTime = performance.now() - compilationStartTime;

  for (let i = 0; i < kernelInfos[0].kernels.length; i++) {
    let totalTimeMs = 0;
    for (let j = 0; j < kernelInfos.length; j++) {
      totalTimeMs += kernelInfos[j].kernels[i].kernelTimeMs;
    }
    kernelInfo.kernels[i].kernelTimeMs = totalTimeMs / kernelInfos.length;
  }
  kernelInfo.kernels =
      kernelInfo.kernels.sort((a, b) => b.kernelTimeMs - a.kernelTimeMs);
  kernelInfo.aggregatedKernels = aggregateKernelTime(kernelInfo.kernels);

  // Add compilation time and first execution time to the profile info
  kernelInfo.compilationTimeMs = compilationTime;
  kernelInfo.firstExecutionTimeMs = firstExecutionTime;

  return kernelInfo;
}

/**
 * Aggregate kernels by name and sort the array in non-ascending order of time.
 * Return an array of objects with `name` and `timeMs` fields.
 *
 * @param {Array<Object>} kernels An array of kernel information objects. Each
 *     object must include `name` (string) and `kernelTimeMs` (number) fields.
 */
function aggregateKernelTime(kernels) {
  const aggregatedKernelTime = {};
  kernels.forEach(kernel => {
    const oldAggregatedKernelTime = aggregatedKernelTime[kernel.name];
    if (oldAggregatedKernelTime == null) {
      aggregatedKernelTime[kernel.name] = kernel.kernelTimeMs;
    } else {
      aggregatedKernelTime[kernel.name] =
          oldAggregatedKernelTime + kernel.kernelTimeMs;
    }
  });

  return Object.entries(aggregatedKernelTime)
      .map(([name, timeMs]) => ({name, timeMs}))
      .sort((a, b) => b.timeMs - a.timeMs);
}

/**
 * This map descripes tunable flags and theior corresponding types.
 *
 * The flags (keys) in the map satisfy the following two conditions:
 * - Is tunable. For example, `IS_BROWSER` and `IS_CHROME` is not tunable,
 * because they are fixed when running the scripts.
 * - Does not depend on other flags when registering in `ENV.registerFlag()`.
 * This rule aims to make the list streamlined, and, since there are
 * dependencies between flags, only modifying an independent flag without
 * modifying its dependents may cause inconsistency.
 * (`WEBGL_RENDER_FLOAT32_CAPABLE` is an exception, because only exposing
 * `WEBGL_FORCE_F16_TEXTURES` may confuse users.)
 */
const TUNABLE_FLAG_VALUE_RANGE_MAP = {
  WEBGL_VERSION: [1, 2],
  WASM_HAS_SIMD_SUPPORT: [true, false],
  WASM_HAS_MULTITHREAD_SUPPORT: [true, false],
  WEBGL_CPU_FORWARD: [true, false],
  WEBGL_PACK: [true, false],
  WEBGL_FORCE_F16_TEXTURES: [true, false],
  WEBGL_RENDER_FLOAT32_CAPABLE: [true, false],
  WEBGL_FLUSH_THRESHOLD: [-1, 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  WEBGL_PACK_DEPTHWISECONV: [true, false],
  CHECK_COMPUTATION_FOR_ERRORS: [true, false],
  KEEP_INTERMEDIATE_TENSORS: [true, false],
  WEBGL_USE_SHAPES_UNIFORMS: [true, false],
  WEBGPU_DEFERRED_SUBMIT_BATCH_SIZE: [1, 5, 10, 15, 20, 25, 30, 35, 40]
};

/**
 * Set environment flags for testing.
 *
 * This will first set tunable flags (the keys of `TUNABLE_FLAG_TYPE_MAP`). Then
 * set URL parameter flags. If there are overlap, URL parameter flags will
 * override tunable flags.
 *
 * ```js
 * const flagConfig = {
 *        WEBGL_PACK: false,
 *      };
 * await setEnvFlags(flagConfig);
 *
 * console.log(tf.env().getBool('WEBGL_PACK')); // false
 * console.log(tf.env().getBool('WEBGL_PACK_BINARY_OPERATIONS')); // false
 * ```
 *
 * @param flagConfig An object to store flag-value pairs.
 */
async function setEnvFlags(flagConfig) {
  if (flagConfig == null) {
    return true;
  } else if (typeof flagConfig !== 'object') {
    throw new Error(
        `An object is expected, while a(n) ${typeof flagConfig} is found.`);
  }

  // Check the validation of flags and values.
  for (const flag in flagConfig) {
    // TODO: check whether flag can be set as flagConfig[flag].
    if (!(flag in TUNABLE_FLAG_VALUE_RANGE_MAP)) {
      throw new Error(`${flag} is not a tunable or valid environment flag.`);
    }
    if (TUNABLE_FLAG_VALUE_RANGE_MAP[flag].indexOf(flagConfig[flag]) === -1) {
      throw new Error(
          `${flag} value is expected to be in the range [${
              TUNABLE_FLAG_VALUE_RANGE_MAP[flag]}], while ${flagConfig[flag]}` +
          ' is found.');
    }
  }

  tf.env().setFlags(flagConfig);
  setEnvFlagsFromUrlParameters();

  // `WASM_HAS_SIMD_SUPPORT` and `WEBGL_VERSION` are also evaluated when
  // initializing backends, not only inferring.
  // TODO: The following backend rebuild logics can be implemented in `setHook`
  // when registering these flags.
  if ('WASM_HAS_SIMD_SUPPORT' in flagConfig) {
    return await resetBackend('wasm');
  }

  if ('WEBGL_VERSION' in flagConfig) {
    return await resetBackend('webgl');
  }
}

/**
 * Set flags from URL. URL should be in the format:
 * ?tfjsflags=FLAG1:1,FLAG2:true.
 */
function setEnvFlagsFromUrlParameters() {
  const TENSORFLOWJS_FLAGS_PREFIX = 'tfjsflags';
  const urlParams = tf.env().getQueryParams(location.search);
  if (TENSORFLOWJS_FLAGS_PREFIX in urlParams) {
    const keyValues = urlParams[TENSORFLOWJS_FLAGS_PREFIX].split(',');
    keyValues.forEach(keyValue => {
      const [key, value] = keyValue.split(':');
      try {
        tf.env().set(key, parseValue(value));
      } catch (err) {
        console.error(err);
      }
    });
  }
}

/**
 * Converted a URL parameter to a typed value, such a boolean, number, string.
 */
function parseValue(value) {
  const lowerCaseValue = value.toLowerCase();
  if (lowerCaseValue === 'true' || lowerCaseValue === 'false') {
    return lowerCaseValue === 'true';
  } else if (`${+ lowerCaseValue}` === lowerCaseValue) {
    return +lowerCaseValue;
  } else {
    return value;
  }
}

/**
 * Reset the target backend.
 *
 * @param backendName The name of the backend to be reset.
 */
async function resetBackend(backendName) {
  const ENGINE = tf.engine();
  if (!(backendName in ENGINE.registryFactory)) {
    throw new Error(`${backendName} backend is not registed.`);
  }

  const currentBackend = tf.getBackend();

  if (backendName in ENGINE.registry) {
    const backendFactory = tf.findBackendFactory(backendName);
    tf.removeBackend(backendName);
    tf.registerBackend(backendName, backendFactory);
  }

  if (currentBackend === backendName) {
    const isSuccessful = await tf.setBackend(backendName);
    if (!isSuccessful) {
      showMsg(`Failed to set backend ${backendName}.`);
      return false;
    }
  }

  return true;
}

/**
 * Get the renderer info from the WebGL backend.
 */
async function getRendererInfo() {
  const curBackendName = tf.getBackend();
  let webglRenderer;
  try {
    let webglBackend = tf.findBackend('webgl');
    if (webglBackend == null) {
      if (!(await tf.setBackend('webgl'))) {
        throw new Error('Failed to initialize WebGL backend.');
      }
      webglBackend = tf.backend();
    }
    const gl = webglBackend.gpgpu.gl;
    const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
    webglRenderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
  } catch (e) {
    webglRenderer = 'NA';
  }
  await tf.setBackend(curBackendName);
  return webglRenderer;
}

/**
 * Collects all benchmark metrics into a single object for CSV export.
 *
 * @param {Object} benchmarkParams - The benchmark parameters (model, backend, etc)
 * @param {Object} timeInfo - The timing information from timeInference
 * @param {Object} profileInfo - The profiling information (optional)
 * @returns {Object} A complete metrics object with all available metrics
 */
function collectAllMetrics(benchmarkParams, timeInfo, profileInfo = null) {
  const timestamp = new Date().toISOString();

  // Debug logging
  console.log('=== collectAllMetrics CALLED ===');
  console.log('profileInfo:', {
    isNull: profileInfo === null,
    isUndefined: profileInfo === undefined,
    type: typeof profileInfo,
    keys: profileInfo ? Object.keys(profileInfo) : null,
    hasKernels: profileInfo && 'kernels' in profileInfo,
    kernelCount: profileInfo && profileInfo.kernels ? profileInfo.kernels.length : 'N/A'
  });

  const metrics = {
    timestamp,
    model: benchmarkParams.benchmark || 'Unknown',
    backend: benchmarkParams.backend || 'Unknown',
    numRuns: benchmarkParams.numRuns || 1,

    // Timing metrics
    'Average Latency (ms)': timeInfo.averageTime ? timeInfo.averageTime.toFixed(2) : 'N/A',
    'Average Latency Excl First (ms)': timeInfo.averageTimeExclFirst ? (typeof timeInfo.averageTimeExclFirst === 'number' ? timeInfo.averageTimeExclFirst.toFixed(2) : timeInfo.averageTimeExclFirst) : 'N/A',
    'Min Latency (ms)': timeInfo.minTime ? timeInfo.minTime.toFixed(2) : 'N/A',
    'Max Latency (ms)': timeInfo.maxTime ? timeInfo.maxTime.toFixed(2) : 'N/A',
    'Time to First Output (ms)': timeInfo.timeToFirstOutput ? timeInfo.timeToFirstOutput.toFixed(2) : 'N/A',
    'End-to-End Latency (ms)': timeInfo.endToEndLatency ? timeInfo.endToEndLatency.toFixed(2) : 'N/A',
    'Kernel Launch Latency (ms)': timeInfo.kernelLaunchLatency ? timeInfo.kernelLaunchLatency.toFixed(2) : 'N/A',
    'Synchronization Overhead (ms)': timeInfo.synchronizationOverhead ? timeInfo.synchronizationOverhead.toFixed(2) : 'N/A',
  };

  // Profile-based metrics
  if (profileInfo) {
    const kernelCount = profileInfo.kernels ? profileInfo.kernels.length : 0;
    const totalKernelTime = profileInfo.kernels ?
      profileInfo.kernels.reduce((sum, k) => sum + k.kernelTimeMs, 0) : 0;
    const averageKernelTime = kernelCount > 0 ? (totalKernelTime / kernelCount) : 0;

    metrics['Kernel Execution Time (ms)'] = totalKernelTime.toFixed(2);
    metrics['Per-Operator Latency (ms)'] = averageKernelTime.toFixed(2);
    metrics['Number of Kernels'] = kernelCount;
    metrics['Compilation Time (ms)'] = profileInfo.compilationTimeMs ? profileInfo.compilationTimeMs.toFixed(2) : 'N/A';

    // Memory metrics
    if (profileInfo.peakBytes) {
      const peakMemoryMB = profileInfo.peakBytes / (1024 * 1024);
      metrics['Peak Memory Usage (MB)'] = peakMemoryMB.toFixed(2);

      // Memory bandwidth
      if (totalKernelTime > 0) {
        const memoryBandwidth = (profileInfo.peakBytes / (1024 * 1024 * 1024)) / (totalKernelTime / 1000);
        metrics['Memory Bandwidth (GB/s)'] = memoryBandwidth.toFixed(4);
      } else {
        metrics['Memory Bandwidth (GB/s)'] = 'N/A';
      }
    } else {
      metrics['Peak Memory Usage (MB)'] = 'N/A';
      metrics['Memory Bandwidth (GB/s)'] = 'N/A';
    }

    metrics['Leaked Tensors'] = profileInfo.newTensors || 'N/A';

    // Operator fusion rate
    if (kernelCount > 0) {
      const estimatedOriginalOpCount = kernelCount * 1.5;
      const fusionRate = Math.max(0, (1 - (kernelCount / estimatedOriginalOpCount)) * 100);
      metrics['Operator Fusion Rate (%)'] = fusionRate.toFixed(2);
    } else {
      metrics['Operator Fusion Rate (%)'] = 'N/A';
    }

    // Add individual kernel metrics (top 10 by time)
    console.log('About to check kernel extraction:', {
      hasProfileInfo: !!profileInfo,
      hasKernels: profileInfo && profileInfo.kernels ? true : false,
      kernelsLength: profileInfo && profileInfo.kernels ? profileInfo.kernels.length : undefined,
      metricsKeysCount: Object.keys(metrics).length
    });

    if (profileInfo && profileInfo.aggregatedKernels && profileInfo.aggregatedKernels.length > 0) {
      console.log('Entering aggregated kernel extraction block');

      // aggregatedKernels are already sorted by time (descending)
      // Take top 5 unique kernels
      const topKernels = profileInfo.aggregatedKernels.slice(0, 5);

      console.log('Top 5 aggregated kernels:', topKernels);

      topKernels.forEach((kernel, index) => {
        const kernelNum = index + 1;
        const kernelName = kernel.name || 'Unknown';
        const kernelTime = kernel.timeMs ? kernel.timeMs.toFixed(2) : 'N/A';
        metrics[`Kernel_${kernelNum}_Name`] = kernelName;
        metrics[`Kernel_${kernelNum}_Time_ms`] = kernelTime;
        console.log(`Set Kernel_${kernelNum}_Name = ${kernelName}, Kernel_${kernelNum}_Time_ms = ${kernelTime}`);
      });

      console.log('Kernel extraction complete');
    } else {
      console.log('No aggregated kernels found for extraction:', {
        hasAggregatedKernels: profileInfo && profileInfo.aggregatedKernels ? true : false,
        aggregatedKernelCount: profileInfo && profileInfo.aggregatedKernels ? profileInfo.aggregatedKernels.length : 0
      });
    }
  } else {
    metrics['Kernel Execution Time (ms)'] = 'N/A';
    metrics['Per-Operator Latency (ms)'] = 'N/A';
    metrics['Number of Kernels'] = 'N/A';
    metrics['Compilation Time (ms)'] = 'N/A';
    metrics['Peak Memory Usage (MB)'] = 'N/A';
    metrics['Memory Bandwidth (GB/s)'] = 'N/A';
    metrics['Leaked Tensors'] = 'N/A';
    metrics['Operator Fusion Rate (%)'] = 'N/A';
  }

  return metrics;
}

/**
 * Converts an object to a CSV row string.
 *
 * @param {Object} obj - The object to convert
 * @param {Array<string>} headers - The headers to use
 * @returns {string} A CSV row string
 */
function objectToCSVRow(obj, headers) {
  return headers.map(header => {
    const value = obj[header] || '';
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
  }).join(',');
}

/**
 * Saves metrics to browser local storage as a CSV string.
 * Updates existing CSV or creates a new one.
 *
 * @param {Object} metrics - The metrics object to save
 * @returns {string} The complete CSV content
 */
function saveMetricsToLocalStorage(metrics) {
  const storageKey = 'tfjs_benchmark_metrics_csv';

  // Get existing CSV data from localStorage
  let csvContent = localStorage.getItem(storageKey) || '';

  // Define the headers in desired order
  const headers = [
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
    'Operator Fusion Rate (%)'
  ];

  // If CSV is empty, add headers
  if (!csvContent || csvContent.trim() === '') {
    csvContent = headers.join(',') + '\n';
  }

  // Add the new row
  const newRow = objectToCSVRow(metrics, headers);
  csvContent += newRow + '\n';

  // Save back to localStorage
  localStorage.setItem(storageKey, csvContent);

  return csvContent;
}

/**
 * Retrieves the metrics CSV from local storage.
 *
 * @returns {string} The complete CSV content
 */
function getMetricsCSV() {
  const storageKey = 'tfjs_benchmark_metrics_csv';
  return localStorage.getItem(storageKey) || '';
}

/**
 * Exports the metrics CSV as a downloadable file.
 *
 * @param {string} filename - Optional filename for the download (default: 'benchmark_metrics.csv')
 */
function downloadMetricsCSV(filename = 'benchmark_metrics.csv') {
  const csvContent = getMetricsCSV();

  if (!csvContent || csvContent.trim() === '') {
    console.warn('No metrics data available to download');
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
