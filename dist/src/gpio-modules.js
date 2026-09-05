/* Small teaching model of gpiozero; Python source is executed by Skulpt unchanged. */
self.piPythonModules = {
  'src/lib/_pi_sim.js': `var $builtinmodule = function () {
    var mod = {};
    mod.read = new Sk.builtin.func(function(pin) {
      return new Sk.builtin.int_(self.piSimulator.read(Sk.ffi.remapToJs(pin)));
    });
    mod.write = new Sk.builtin.func(function(pin, value) {
      self.piSimulator.write(Sk.ffi.remapToJs(pin), Sk.ffi.remapToJs(value));
      return Sk.builtin.none.none$;
    });
    mod.track_pin = new Sk.builtin.func(function(pin) {
      self.piSimulator.watch(Sk.ffi.remapToJs(pin));
      return Sk.builtin.none.none$;
    });
    mod.events = new Sk.builtin.func(function() {
      return Sk.ffi.remapToPy(self.piSimulator.events());
    });
    mod.monotonic = new Sk.builtin.func(function() {
      return new Sk.builtin.float_(performance.now() / 1000);
    });
    mod.time = new Sk.builtin.func(function() {
      return new Sk.builtin.float_(Date.now() / 1000);
    });
    mod.delay = new Sk.builtin.func(function(seconds) {
      return Sk.misceval.promiseToSuspension(new Promise(function(resolve) {
        setTimeout(function() { resolve(Sk.builtin.none.none$); }, Math.max(0, Sk.ffi.remapToJs(seconds) * 1000));
      }));
    });
    return mod;
  };`,

  'src/lib/gpiozero.py': `
import _pi_sim

_buttons = []
_dispatching = False
_claimed_pins = {}

def _claim_pin(pin, device):
    if pin in _claimed_pins:
        raise RuntimeError('GPIO' + str(pin) + ' is already in use. Close its device before reusing it.')
    _claimed_pins[pin] = device

def _release_pin(pin, device):
    if _claimed_pins.get(pin) is device:
        del _claimed_pins[pin]

def _pin_number(pin):
    if isinstance(pin, str):
        text = pin.upper()
        if text.startswith('GPIO'):
            pin = text[4:]
        elif text.startswith('BCM'):
            pin = text[3:]
    try:
        number = int(pin)
    except (TypeError, ValueError):
        raise ValueError('Use a BCM GPIO number from 0 to 27.')
    if number < 0 or number > 27 or isinstance(pin, float):
        raise ValueError('Use a BCM GPIO number from 0 to 27.')
    return number

def _poll_buttons():
    global _dispatching
    if _dispatching:
        return
    _dispatching = True
    try:
        for pin, pressed in _pi_sim.events():
            for button in list(_buttons):
                if button.pin == pin and not button.closed and button._last != bool(pressed):
                    button._last = bool(pressed)
                    callback = button.when_pressed if pressed else button.when_released
                    if callback is not None:
                        callback()
    finally:
        _dispatching = False

class DigitalOutputDevice:
    def __init__(self, pin=None, active_high=True, initial_value=False, pin_factory=None):
        self.pin = _pin_number(pin)
        self.active_high = bool(active_high)
        self.closed = False
        self._value = 0
        _claim_pin(self.pin, self)
        try:
            self.value = initial_value
        except:
            _release_pin(self.pin, self)
            self.closed = True
            raise

    def _ensure_open(self):
        if self.closed:
            raise RuntimeError('This GPIO device is closed.')

    @property
    def value(self):
        self._ensure_open()
        return self._value

    @value.setter
    def value(self, value):
        self._ensure_open()
        if value not in (0, 1, False, True):
            raise ValueError('Digital output value must be 0 or 1. Use PWMLED for brightness.')
        self._value = int(bool(value))
        _pi_sim.write(self.pin, self._value if self.active_high else 1 - self._value)

    @property
    def is_active(self):
        return bool(self.value)

    def on(self):
        self.value = 1

    def off(self):
        self.value = 0

    def toggle(self):
        self.value = 1 - self.value

    def close(self):
        if not self.closed:
            self.off()
            self.closed = True
            _release_pin(self.pin, self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

class LED(DigitalOutputDevice):
    @property
    def is_lit(self):
        return self.is_active

class Buzzer(DigitalOutputDevice):
    @property
    def is_active(self):
        return bool(self.value)

class PWMLED(LED):
    def __init__(self, pin=None, active_high=True, initial_value=0, frequency=100, pin_factory=None):
        self.frequency = frequency
        super().__init__(pin, active_high, initial_value, pin_factory)

    @property
    def value(self):
        self._ensure_open()
        return self._value

    @value.setter
    def value(self, value):
        self._ensure_open()
        value = float(value)
        if not 0 <= value <= 1:
            raise ValueError('PWM brightness must be between 0 and 1.')
        self._value = value
        _pi_sim.write(self.pin, value if self.active_high else 1 - value)

class Button:
    def __init__(self, pin=None, pull_up=True, active_state=None, bounce_time=None, hold_time=1, hold_repeat=False, pin_factory=None):
        self.pin = _pin_number(pin)
        self.pull_up = pull_up
        self.closed = False
        self.when_pressed = None
        self.when_released = None
        self._last = bool(_pi_sim.read(self.pin))
        _claim_pin(self.pin, self)
        _buttons.append(self)
        _pi_sim.track_pin(self.pin)

    @property
    def is_pressed(self):
        if self.closed:
            raise RuntimeError('This Button is closed.')
        return bool(_pi_sim.read(self.pin))

    @property
    def value(self):
        return int(self.is_pressed)

    @property
    def is_active(self):
        return self.is_pressed

    def wait_for_press(self, timeout=None):
        from time import sleep, monotonic
        end = None if timeout is None else monotonic() + timeout
        while not self.is_pressed:
            if end is not None and monotonic() >= end:
                return False
            sleep(0.01)
        return True

    def wait_for_release(self, timeout=None):
        from time import sleep, monotonic
        end = None if timeout is None else monotonic() + timeout
        while self.is_pressed:
            if end is not None and monotonic() >= end:
                return False
            sleep(0.01)
        return True

    def close(self):
        self.closed = True
        _release_pin(self.pin, self)
        if self in _buttons:
            _buttons.remove(self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
`,

  'src/lib/time.py': `
from _pi_sim import monotonic, time, delay as _delay

def sleep(seconds):
    seconds = float(seconds)
    if seconds < 0:
        raise ValueError('sleep length must be non-negative')
    if seconds != seconds or seconds == float('inf'):
        raise ValueError('sleep length must be finite')
    from gpiozero import _poll_buttons
    end = monotonic() + seconds
    while True:
        _poll_buttons()
        remaining = end - monotonic()
        if remaining <= 0:
            _delay(0)
            return
        _delay(min(remaining, 0.02))

perf_counter = monotonic
`,

  'src/lib/signal.py': `
from time import sleep

def pause():
    while True:
        sleep(0.02)
`,
};

// Skulpt looks for native modules before Python modules. Hide its native time.js
// so all sleep calls use the cooperative simulator implementation above.
if (self.Sk && Sk.builtinFiles && Sk.builtinFiles.files) {
  delete Sk.builtinFiles.files['src/lib/time.js'];
  delete Sk.builtinFiles.files['src/lib/signal.js'];
}
