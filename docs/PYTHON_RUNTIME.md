# Python worker for the GPIO learning simulator

This uses the real, locally vendored Skulpt Python interpreter in Python 3 mode.
It does not translate Python with regular expressions. The GPIO package below is
a small educational model, not the full gpiozero implementation or Raspberry Pi OS.

## Integration

Copy `python-worker.js`, `gpio-modules.js`, and the entire `vendor/` directory into
one publicly served directory such as `/python/`. Use a **classic** Web Worker:

```js
let worker;

function runPython(code, buttonValues) {
  worker?.terminate();
  // Reset the component output state and clear the console here.
  worker = new Worker('/python/python-worker.js');
  worker.onmessage = ({ data }) => {
    if (data.type === 'gpio') updateOutput(data.pin, data.value);
    if (data.type === 'stdout') appendConsoleText(data.text);
    if (data.type === 'error') showPythonError(data.message);
    if (data.type === 'done') setRunning(false);
  };
  worker.onerror = event => showPythonError(event.message || 'Python worker could not start.');
  worker.postMessage({ type: 'inputs', values: buttonValues });
  worker.postMessage({ type: 'run', code });
}

function setButtonInput(bcm, pressed) {
  worker?.postMessage({ type: 'inputs', values: { [bcm]: pressed ? 1 : 0 } });
}

function stopPython() {
  worker?.terminate();
  worker = undefined;
  // Set running=false and reset all component outputs, including audio, here.
}
```

Create a fresh worker for every Run. `terminate()` is the Stop operation and works
even for `while True: pass`. A terminated worker sends no `done` event. `done`
follows either ordinary completion or an error. GPIO output state remains latched
at completion; the host can retain it for inspection and clear it at the next Run
or Stop. Escape/render console output as text, never as HTML.

The host should ignore old worker messages after starting a new run; a generation
number or a closure that compares the current worker is sufficient.

## Protocol

Host → worker:

* `{type: 'run', code: string}` once per worker.
* `{type: 'inputs', values: {[bcm: number]: 0 | 1}}` initially and on input changes.
  Values are **logical button state**: `1` means pressed, `0` means released. They
  are not raw pull-up voltages. Changes merge into the current input map.

Worker → host:

* `{type: 'gpio', pin: number, value: number}` — BCM output level; 0..1 for PWM.
* `{type: 'stdout', text: string}` — print output chunks, capped at 100,000 characters.
* `{type: 'error', message: string}` — real Python exception text with a line number
  when provided by Skulpt.
* `{type: 'done'}` — finite run finished, successfully or with an error.

GPIO messages send each pin's first level immediately. Later writes are coalesced
to the latest value per pin in approximately 16 ms batches (CPU-bound code can
delay delivery until its next yield). Unchanged levels are not re-sent. Every
Python write still updates the device's `.value`; only visual output messages
are sampled. The last levels always flush before `done`, including programs that
finish before the first timer fires. This bounds host traffic during tight toggle
loops and preserves ordinary half-second blink changes.

The host owns wiring. Use `gpio` messages to update components connected to the
specified BCM pin, and map a pressed physical switch to its connected input BCM.
Use the normalized PWM value for brightness. Buzzer messages are output levels;
audio generation belongs to the main page and should stop on Stop/reset/error.

## Supported teaching API

* `from gpiozero import LED, PWMLED, Button, Buzzer, DigitalOutputDevice`
* BCM integer pins 0..27; string forms `GPIO17` and `BCM17` also work.
  A pin may be claimed by one device at a time. Duplicate input/output or
  same-type claims raise a clear runtime error; `.close()` releases the pin.
* Output constructors support `pin`, `active_high`, `initial_value`, `pin_factory`.
  `pin_factory` is accepted for compatibility and has no effect.
* Outputs: `.on()`, `.off()`, `.toggle()`, `.value`, `.is_active`, `.close()` and
  context-manager use. LED and PWMLED also expose `.is_lit`.
* PWMLED: floating `.value` in 0..1 and a `frequency` attribute. Frequency is a stored
  setting; output is represented as average brightness, not a timed pulse train.
* Button: `.is_pressed`, `.is_active`, `.value`, `.wait_for_press(timeout=None)`,
  `.wait_for_release(timeout=None)`, `.when_pressed`, `.when_released`, `.close()`.
  Event handlers are zero-argument functions (e.g. `button.when_pressed = led.on`).
* `from time import sleep, monotonic, time, perf_counter`
* `from signal import pause`
* Real Python variables, arithmetic, loops, conditions, functions, imports and
  common containers supported by Skulpt's Python 3 mode; common bundled modules
  such as `math` and `random` remain available.

`sleep` yields to the event loop in ≤20 ms chunks. Button events are queued and
dispatched during `sleep`, `pause` and the Button wait methods. Polling
`.is_pressed` reads the current state. CPU-bound Python yields approximately every
25 ms to receive input updates, though this is not a real-time guarantee.

Not implemented: `LED.blink`, `PWMLED.pulse`, full gpiozero `source` streams, device
threads, callbacks that receive a Button argument, hold events, debounce timing,
raw pull-up voltage logic, all Raspberry Pi OS packages, arbitrary pip installs,
filesystem/network programs or standard-input `input()`. Button constructor
compatibility options other than `pin` do not alter the logical UI input model.
Use explicit loops and `sleep` to blink or fade. This is not CPython and Python 3
syntax/library support is subject to Skulpt's compatibility limitations.

## Verification

Run `node test-runtime.mjs`. The harness evaluates the unchanged browser worker
inside Node worker threads with a VM-backed `importScripts`. It verifies genuine
Python control flow and comprehensions, output methods/PWM/keyword arguments,
live button inputs, callbacks, syntax/value errors, and force-termination of an
infinite loop. It also checks that a 300 ms tight toggle loop sends bounded host
messages and can be stopped, that half-second GPIO changes survive coalescing,
that the final output flush precedes `done`, and that pin conflicts/reuse work.
The production browser host still needs its normal worker-loading,
wiring and rendering smoke test.

## Vendored source and license

Retrieved through the GitHub connector on 2026-09-05:

* Core: https://github.com/skulpt/skulpt-dist/blob/master/skulpt.min.js
  Git blob SHA: `86e34f3d2d1e6a8a356f36d0c17aa3a71520e600`.
  Embedded upstream build: `6c99c2196851bb29f0e503afccb01804f089cb60`
  (2021-02-23T18:59:26.986Z).
* Standard library: https://github.com/skulpt/skulpt-dist/blob/master/skulpt-stdlib.js
  Git blob SHA: `0c0a78ad6417c381842f46149c571614f39cfb31`.
* License: https://github.com/skulpt/skulpt/blob/master/LICENSE
  Git blob SHA: `adfc24deade705edc9e754dcc33e6e90a4e3ac39`.
  Keep `vendor/SKULPT-LICENSE.txt` in the deployed source distribution.

Official integration documentation: https://skulpt.org/using.html

The core contains a source-map comment, but the optional source map is not needed
for execution and is not bundled. There are no CDN or external runtime requests.


## v3 extensions

The worker receives `{type:"devices",devices:[{id,type,bcm,address,values,ready}]}` from the physical wiring evaluator (`hardware.js`). It only exposes devices with ready=true. It emits `device-read` for observed reads and `device-output` for OLED, servo, and UART outputs.

Added API subsets: GPIO Zero RGBLED/Servo/MCP3008/MotionSensor, smbus2 SMBus/i2c_msg, spidev SpiDev, serial Serial, board, adafruit_dht, bmp280, adafruit_vl53l0x, adafruit_ssd1306. Full upstream drivers are not bundled. Unsupported transactions raise explicit errors.

The supported register maps are BH1750 raw readings, MPU6050 accelerometer/gyro, ADS1115 channel0 conversion and DS3231 time/date. BMP280 compensation and physical bus timing are abstracted. UART peripheral replies are controlled by the text field. RTC time comes from the controls, not a battery-backed running wall clock. Servo values are normalized positions, not guaranteed physical degrees.

Verification: `node tests/runtime.test.mjs` covers14 groups; `node tests/lessons.test.mjs` executes all20 actual answers and checks missing wire cases.
