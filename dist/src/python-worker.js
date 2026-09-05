/* Classic worker: keep this file beside gpio-modules.js and vendor/. */
importScripts('./vendor/skulpt.min.js', './vendor/skulpt-stdlib.js', './gpio-modules.js');

// Skulpt exposes the Python 2 name; Python 3 aliases IOError and OSError.
Sk.builtins.OSError = Sk.builtin.IOError;
(() => {
  let devices = [];
  const observed = new Set();
  const deviceOutputs = new Map();
  const pendingDevices = new Map();
  const inputs = Object.create(null);
  const outputs = Object.create(null);
  const sentOutputs = Object.create(null);
  const pendingOutputs = new Map();
  const GPIO_FRAME_MS = 16;
  let gpioTimer = null;
  const watched = new Set();
  const inputEvents = [];
  let hasRun = false;
  let outputCharacters = 0;
  let clipped = false;
  const emit = (data) => self.postMessage(data);

  function flushGPIO() {
    if (gpioTimer !== null) clearTimeout(gpioTimer);
    gpioTimer = null;
    for (const [pin, value] of pendingOutputs) {
      if (sentOutputs[pin] !== value) {
        sentOutputs[pin] = value;
        emit({ type: 'gpio', pin, value });
      }
    }
    pendingOutputs.clear();
    for (const [id, value] of pendingDevices) emit({ type: 'device-output', id, value });
    pendingDevices.clear();
  }

  // Only the bridge module uses this object. No filesystem or network API is exposed.
  self.piSimulator = {
    device(type, selector, byAddress) {
      const device = devices.find(d => (byAddress ? d.address === selector : d.type === type && (selector < 0 || d.bcm === selector)) && d.ready === true);
      if (!device) throw new Sk.builtin.IOError('No wired, powered ' + (byAddress ? 'I2C device at address ' + selector : type + ' device') + '. Check connections.');
      if (!observed.has(device.id)) { observed.add(device.id); emit({type:'device-read',id:device.id}); }
      return device;
    },
    deviceOutput(id, value) {
      const serialized = JSON.stringify(value);
      if (deviceOutputs.get(id) === serialized) return;
      if (!deviceOutputs.has(id)) emit({type:'device-output',id,value});
      else {
        pendingDevices.set(id,value);
        if (gpioTimer === null) gpioTimer = setTimeout(flushGPIO, GPIO_FRAME_MS);
      }
      deviceOutputs.set(id, serialized);
    },
    read(pin) {
      const device = devices.find(d => d.bcm === pin && d.ready && ['button','switch','pir'].includes(d.type));
      if (device && !observed.has(device.id)) { observed.add(device.id); emit({type:'device-read',id:device.id}); }
      return inputs[pin] ? 1 : 0;
    },
    write(pin, value) {
      if (outputs[pin] !== value) {
        outputs[pin] = value;
        // Send the first level immediately, then retain only the latest level
        // per animation-sized interval. Python state still updates on every write.
        if (!Object.prototype.hasOwnProperty.call(sentOutputs, pin)) {
          sentOutputs[pin] = value;
          emit({ type: 'gpio', pin, value });
        } else {
          pendingOutputs.set(pin, value);
          if (gpioTimer === null) gpioTimer = setTimeout(flushGPIO, GPIO_FRAME_MS);
        }
      }
    },
    watch(pin) { watched.add(pin); },
    events() { return inputEvents.splice(0); },
  };

  function readModule(path) {
    if (Object.prototype.hasOwnProperty.call(self.piPythonModules, path)) {
      return self.piPythonModules[path];
    }
    const files = Sk.builtinFiles && Sk.builtinFiles.files;
    if (files && Object.prototype.hasOwnProperty.call(files, path)) return files[path];
    throw new Error("This simulator does not include the module or file '" + path + "'.");
  }

  function output(text) {
    // Avoid a runaway print loop flooding the page. GPIO changes are coalesced above.
    const remaining = 100000 - outputCharacters;
    if (remaining > 0) {
      const chunk = String(text).slice(0, remaining);
      outputCharacters += chunk.length;
      emit({ type: 'stdout', text: chunk });
    } else if (!clipped) {
      clipped = true;
      emit({ type: 'stdout', text: '\n[Output limit reached. Stop and run again to reset.]\n' });
    }
  }

  self.onmessage = async ({ data }) => {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'devices') {
      devices = Array.isArray(data.devices) ? data.devices.filter(d => d && typeof d.id === 'string' && typeof d.type === 'string').slice(0, 100) : [];
      return;
    }
    if (data.type === 'inputs') {
      for (const [key, raw] of Object.entries(data.values || {})) {
        const pin = Number(key);
        if (!Number.isInteger(pin) || pin < 0 || pin > 27) continue;
        const value = raw ? 1 : 0;
        const previous = inputs[pin] || 0;
        inputs[pin] = value;
        if (previous !== value && watched.has(pin)) {
          inputEvents.push([pin, value]);
          if (inputEvents.length > 256) inputEvents.shift();
        }
      }
      return;
    }
    if (data.type !== 'run') return;
    if (hasRun) {
      emit({ type: 'error', message: 'Create a fresh Worker for each run.' });
      return;
    }
    hasRun = true;
    if (typeof data.code !== 'string' || data.code.length > 100000) {
      emit({ type: 'error', message: 'Python source must be text under 100,000 characters.' });
      emit({ type: 'done' });
      return;
    }
    Sk.configure({
      output,
      read: readModule,
      __future__: Sk.python3,
      yieldLimit: 25,
      execLimit: Infinity,
      killableWhile: true,
      killableFor: true,
      inputfun() { throw new Sk.builtin.NotImplementedError('Console input() is unavailable. Use a Button component for input.'); },
    });
    try {
      await Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, data.code, true));
    } catch (error) {
      emit({ type: 'error', message: error && typeof error.toString === 'function' ? error.toString() : String(error) });
    } finally {
      // A short program may finish before the timer fires. Its final levels must
      // reach the host before done, which may cause the host to terminate us.
      flushGPIO();
      emit({ type: 'done' });
    }
  };
})();
