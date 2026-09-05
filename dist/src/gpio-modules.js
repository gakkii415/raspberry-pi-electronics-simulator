/* Small teaching model of gpiozero; Python source is executed by Skulpt unchanged. */
self.piPythonModules = {
  'src/lib/_pi_sim.js': `var $builtinmodule = function () {
    var mod = {};
    mod.device = new Sk.builtin.func(function(type, selector, byAddress) {
      return Sk.ffi.remapToPy(self.piSimulator.device(Sk.ffi.remapToJs(type), Sk.ffi.remapToJs(selector), Sk.ffi.remapToJs(byAddress)));
    });
    mod.device_output = new Sk.builtin.func(function(id, value) {
      self.piSimulator.deviceOutput(Sk.ffi.remapToJs(id), Sk.ffi.remapToJs(value));
      return Sk.builtin.none.none$;
    });
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
// V3 teaching extensions: explicitly limited API models, live wiring-gated values.
self.piPythonModules["src/lib/gpiozero.py"] += "\nclass RGBLED:\n    def __init__(self, red=None, green=None, blue=None, active_high=True, initial_value=(0,0,0), pwm=True, pin_factory=None):\n        self._leds = []\n        try:\n            for pin in (red, green, blue):\n                self._leds.append(PWMLED(pin, active_high=active_high))\n            self.color = initial_value\n        except:\n            self.close()\n            raise\n    @property\n    def color(self):\n        return tuple(led.value for led in self._leds)\n    @color.setter\n    def color(self, value):\n        if len(value) != 3 or any(not 0 <= float(v) <= 1 for v in value):\n            raise ValueError('RGB color needs three values between 0 and 1.')\n        for led, v in zip(self._leds, value):\n            led.value = v\n    @property\n    def value(self):\n        return self.color\n    @value.setter\n    def value(self, value):\n        self.color = value\n    def on(self):\n        self.color = (1,1,1)\n    def off(self):\n        self.color = (0,0,0)\n    def close(self):\n        for led in self._leds:\n            led.close()\n\nclass Servo:\n    def __init__(self, pin=None, initial_value=0, min_pulse_width=0.001, max_pulse_width=0.002, frame_width=0.02, pin_factory=None):\n        self.pin = _pin_number(pin)\n        self.closed = False\n        _claim_pin(self.pin, self)\n        try:\n            self.value = initial_value\n        except:\n            _release_pin(self.pin, self)\n            raise\n    @property\n    def value(self):\n        if self.closed:\n            raise RuntimeError('This Servo is closed.')\n        return self._value\n    @value.setter\n    def value(self, value):\n        if self.closed:\n            raise RuntimeError('This Servo is closed.')\n        if value is not None and not -1 <= float(value) <= 1:\n            raise ValueError('Servo value must be between -1 and 1, or None.')\n        device = _pi_sim.device('servo', self.pin, False)\n        self._value = value\n        _pi_sim.device_output(device['id'], value)\n    def min(self):\n        self.value = -1\n    def mid(self):\n        self.value = 0\n    def max(self):\n        self.value = 1\n    def detach(self):\n        self.value = None\n    def close(self):\n        if not self.closed:\n            self.detach()\n            self.closed = True\n            _release_pin(self.pin, self)\n\nclass MCP3008:\n    def __init__(self, channel=0, differential=False, max_voltage=3.3, **kwargs):\n        if channel != 0 or differential:\n            raise NotImplementedError('Pi Lab models MCP3008 single-ended channel 0.')\n        self.closed = False\n        self.max_voltage = max_voltage\n    @property\n    def value(self):\n        if self.closed:\n            raise RuntimeError('This ADC is closed.')\n        return _pi_sim.device('mcp3008', -1, False)['values']['channel0']\n    @property\n    def voltage(self):\n        return self.value * self.max_voltage\n    @property\n    def raw_value(self):\n        return int(round(self.value * 1023))\n    def close(self):\n        self.closed = True\n\nclass MotionSensor(Button):\n    @property\n    def motion_detected(self):\n        if self.closed:\n            raise RuntimeError('This MotionSensor is closed.')\n        return bool(_pi_sim.device('pir', self.pin, False)['values']['motion'])\n    @property\n    def value(self):\n        return int(self.motion_detected)\n    @property\n    def is_active(self):\n        return self.motion_detected\n";
self.piPythonModules["src/lib/smbus2.py"] = "\nimport _pi_sim\n\ndef _word(value):\n    value = int(value) & 65535\n    return [value >> 8, value & 255]\ndef _bcd(value):\n    value = int(value)\n    return (value // 10) * 16 + value % 10\n\nclass i2c_msg:\n    def __init__(self, addr, length):\n        self.addr = addr\n        self.length = length\n        self.data = [0] * length\n    @staticmethod\n    def read(addr, length):\n        return i2c_msg(addr, length)\n    def __iter__(self):\n        return iter(self.data)\n\nclass SMBus:\n    def __init__(self, bus=None, force=False):\n        self.closed = True\n        self._registers = {}\n        if bus is not None:\n            self.open(bus)\n    def open(self, bus):\n        if bus != 1:\n            raise OSError('Pi Lab models I2C bus 1.')\n        self.closed = False\n    def close(self):\n        self.closed = True\n    def __enter__(self):\n        return self\n    def __exit__(self, *args):\n        self.close()\n    def _device(self, addr):\n        if self.closed:\n            raise OSError('I2C bus is closed.')\n        return _pi_sim.device('', addr, True)\n    def i2c_rdwr(self, *messages):\n        for msg in messages:\n            d = self._device(msg.addr)\n            if d['type'] != 'bh1750' or msg.length != 2:\n                raise NotImplementedError('Raw I2C messages model a two-byte BH1750 read.')\n            msg.data = _word(min(65535, max(0, round(d['values']['lux'] * 1.2))))\n    def read_byte(self, addr, force=None):\n        self._device(addr)\n        return 0\n    def write_byte(self, addr, value, force=None):\n        self._device(addr)\n        self._registers[(addr, -1)] = [value]\n    def write_byte_data(self, addr, register, value, force=None):\n        self.write_i2c_block_data(addr, register, [value])\n    def write_i2c_block_data(self, addr, register, data, force=None):\n        self._device(addr)\n        if not 0 <= register <= 255 or not 1 <= len(data) <= 32 or any(not isinstance(x, int) or not 0 <= x <= 255 for x in data):\n            raise ValueError('I2C registers and data must be bytes; block length is 1 to 32.')\n        self._registers[(addr, register)] = list(data)\n    def read_byte_data(self, addr, register, force=None):\n        return self.read_i2c_block_data(addr, register, 1)[0]\n    def read_i2c_block_data(self, addr, register, length, force=None):\n        if not 1 <= length <= 32:\n            raise ValueError('I2C block length must be 1 to 32.')\n        d = self._device(addr)\n        v = d['values']\n        kind = d['type']\n        data = None\n        if kind == 'bh1750' and register == 0:\n            data = _word(min(65535, max(0, round(v['lux'] * 1.2))))\n        elif kind == 'mpu6050' and 0x3b <= register <= 0x40:\n            axes = []\n            for axis in ('ax','ay','az'):\n                axes += _word(max(-32768, min(32767, round(v[axis] * 16384))))\n            data = axes[register - 0x3b:]\n        elif kind == 'mpu6050' and 0x43 <= register <= 0x48:\n            axes = []\n            for axis in ('gx','gy','gz'):\n                axes += _word(max(-32768, min(32767, round(v.get(axis, 0) * 131))))\n            data = axes[register - 0x43:]\n        elif kind == 'mpu6050' and register == 0x75:\n            data = [0x68]\n        elif kind == 'rtc' and 0 <= register <= 6:\n            data = [_bcd(v['second']), _bcd(v['minute']), _bcd(v['hour']), 1, _bcd(v['day']), _bcd(v['month']), _bcd(v['year'] % 100)][register:]\n        elif kind == 'ads1115' and register == 0:\n            data = _word(max(-32768, min(32767, round(v['voltage'] * 32768 / 4.096))))\n        elif kind == 'bmp280' and register == 0xd0:\n            data = [0x58]\n        elif (addr, register) in self._registers:\n            data = self._registers[(addr, register)]\n        if data is None:\n            raise NotImplementedError('Register is outside the Pi Lab teaching subset.')\n        return (data + [0] * length)[:length]\n";
self.piPythonModules["src/lib/board.py"] = "\nfrom smbus2 import SMBus\nD4 = 4\nSDA = 2\nSCL = 3\ndef I2C():\n    return SMBus(1)\n";
self.piPythonModules["src/lib/spidev.py"] = "\nimport _pi_sim\nclass SpiDev:\n    def __init__(self):\n        self.closed = True\n        self.max_speed_hz = 500000\n        self.mode = 0\n    def open(self, bus, device):\n        if bus != 0 or device != 0:\n            raise OSError('Pi Lab models SPI bus 0, CE0.')\n        self.closed = False\n    def xfer2(self, data, speed_hz=0, delay_usec=0, bits_per_word=8):\n        if self.closed:\n            raise OSError('SPI device is closed.')\n        if list(data) != [1, 128, 0]:\n            raise NotImplementedError('Pi Lab models MCP3008 channel 0: xfer2([1,128,0]).')\n        value = int(round(_pi_sim.device('mcp3008', -1, False)['values']['channel0'] * 1023))\n        return [0, (value >> 8) & 3, value & 255]\n    def close(self):\n        self.closed = True\n";
self.piPythonModules["src/lib/serial.py"] = "\nimport _pi_sim\nclass Serial:\n    def __init__(self, port=None, baudrate=9600, timeout=None, **kwargs):\n        if port != '/dev/serial0':\n            raise OSError('Pi Lab models /dev/serial0.')\n        self.is_open = True\n        self.baudrate = baudrate\n        self.timeout = timeout\n    def _device(self):\n        if not self.is_open:\n            raise OSError('Serial port is closed.')\n        return _pi_sim.device('uart', -1, False)\n    def write(self, data):\n        d = self._device()\n        if not isinstance(data, bytes):\n            raise TypeError('Serial.write requires bytes.')\n        _pi_sim.device_output(d['id'], {'text': data.decode('utf-8')})\n        return len(data)\n    def readline(self):\n        return (self._device()['values']['text'].rstrip('\\n') + '\\n').encode('utf-8')\n    def close(self):\n        self.is_open = False\n    def __enter__(self):\n        return self\n    def __exit__(self, *args):\n        self.close()\n";
self.piPythonModules["src/lib/adafruit_dht.py"] = "\nimport _pi_sim\nclass DHT22:\n    def __init__(self, pin, use_pulseio=True):\n        self.pin = pin\n        self.closed = False\n    def _values(self):\n        if self.closed:\n            raise RuntimeError('DHT22 is closed.')\n        return _pi_sim.device('dht22', self.pin, False)['values']\n    @property\n    def temperature(self):\n        return self._values()['temperature']\n    @property\n    def humidity(self):\n        return self._values()['humidity']\n    def exit(self):\n        self.closed = True\n";
self.piPythonModules["src/lib/bmp280.py"] = "\nclass BMP280:\n    def __init__(self, i2c_addr=0x76, i2c_dev=None):\n        if i2c_dev is None:\n            from smbus2 import SMBus\n            i2c_dev = SMBus(1)\n        self.bus = i2c_dev\n        self.addr = i2c_addr\n    def _values(self):\n        d = self.bus._device(self.addr)\n        if d['type'] != 'bmp280':\n            raise OSError('Expected a BMP280.')\n        return d['values']\n    def get_temperature(self):\n        return self._values()['temperature']\n    def get_pressure(self):\n        return self._values()['pressure']\n";
self.piPythonModules["src/lib/adafruit_vl53l0x.py"] = "\nclass VL53L0X:\n    def __init__(self, i2c, address=0x29, io_timeout_s=0):\n        self.bus = i2c\n        self.address = address\n    @property\n    def range(self):\n        d = self.bus._device(self.address)\n        if d['type'] != 'vl53l0x':\n            raise OSError('Expected a VL53L0X.')\n        return int(d['values']['distance'])\n";
self.piPythonModules["src/lib/adafruit_ssd1306.py"] = "\nimport _pi_sim\nclass SSD1306_I2C:\n    def __init__(self, width, height, i2c, addr=0x3c, external_vcc=False):\n        if width != 128 or height != 64:\n            raise ValueError('Pi Lab OLED is 128 by 64 pixels.')\n        self.bus = i2c\n        self.addr = addr\n        self._text = []\n        self._pixels = []\n        self._fill = 0\n    def fill(self, color):\n        self._fill = int(bool(color))\n        self._text = []\n        self._pixels = []\n    def text(self, string, x, y, color=1):\n        self._text.append({'text': str(string), 'x': int(x), 'y': int(y), 'color': int(bool(color))})\n        self._text = self._text[-128:]\n    def pixel(self, x, y, color=1):\n        if 0 <= x < 128 and 0 <= y < 64:\n            self._pixels.append([int(x), int(y), int(bool(color))])\n            self._pixels = self._pixels[-8192:]\n    def show(self):\n        d = self.bus._device(self.addr)\n        if d['type'] != 'oled':\n            raise OSError('Expected an SSD1306 OLED.')\n        _pi_sim.device_output(d['id'], {'text': '\\n'.join(t['text'] for t in self._text), 'lines': self._text, 'pixels': self._pixels, 'fill': self._fill})\n";
