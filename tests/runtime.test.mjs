import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/src');
const bootstrap = `
  const { parentPort, workerData } = require('node:worker_threads');
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const context = vm.createContext({ setTimeout, clearTimeout, performance, console });
  context.self = context;
  context.postMessage = data => parentPort.postMessage(data);
  context.importScripts = (...files) => files.forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(workerData, file), 'utf8'), context, { filename: file });
  });
  vm.runInContext(fs.readFileSync(path.join(workerData, 'python-worker.js'), 'utf8'), context);
  parentPort.on('message', data => context.onmessage({ data }));
`;

function run(code, { inputs = {}, devices = [], onMessage, timeout = 4000 } = {}) {
  const worker = new Worker(bootstrap, { eval: true, workerData: directory });
  const messages = [];
  let timer;
  const completion = new Promise((resolve, reject) => {
    timer = setTimeout(() => { worker.terminate(); reject(new Error('Test timed out: ' + JSON.stringify(messages))); }, timeout);
    worker.on('error', reject);
    worker.on('message', message => {
      messages.push(message);
      onMessage?.(message, worker);
      if (message.type === 'done') { clearTimeout(timer); worker.terminate(); resolve(messages); }
    });
  });
  worker.postMessage({ type: 'devices', devices });
  worker.postMessage({ type: 'inputs', values: inputs });
  worker.postMessage({ type: 'run', code });
  return { worker, completion, messages, clearTimer: () => clearTimeout(timer) };
}

const stdout = messages => messages.filter(m => m.type === 'stdout').map(m => m.text).join('');
const gpios = messages => messages.filter(m => m.type === 'gpio').map(({pin,value}) => [pin,value]);
const noErrors = messages => assert.deepEqual(messages.filter(m => m.type === 'error'), []);

{
  const { completion } = run(`from gpiozero import LED, PWMLED, Buzzer
from time import sleep
led = LED(17)
for i in range(3):
    if i % 2 == 0:
        led.on()
    else:
        led.off()
    sleep(0.5)
led.toggle()
pwm = PWMLED(pin=18)
pwm.value = 0.35
buzzer = Buzzer(23)
buzzer.on()
print('Computed:', sum([x*x for x in range(5)]))
print('Brightness:', pwm.value)
`);
  const messages = await completion;
  noErrors(messages);
  assert.deepEqual(gpios(messages).filter(([pin]) => pin === 17), [[17,0],[17,1],[17,0],[17,1],[17,0]]);
  assert.deepEqual(gpios(messages).filter(([pin]) => pin === 18), [[18,0],[18,0.35]]);
  assert.deepEqual(gpios(messages).filter(([pin]) => pin === 23), [[23,0],[23,1]]);
  assert.equal(messages.at(-1).type, 'done');
  assert.match(stdout(messages), /Computed: 30/);
  assert.match(stdout(messages), /Brightness: 0.35/);
  console.log('PASS: actual Python, every 0.5-second GPIO change, and final PWM/output flush before done');
}

{
  const { completion } = run(`from gpiozero import Button, LED
from time import sleep
button = Button(2)
led = LED(17)
print('ready')
button.wait_for_press(timeout=1)
if button.is_pressed:
    led.on()
print('pressed:', button.value)
`, { onMessage(message, worker) { if (message.type === 'stdout' && message.text.includes('ready')) worker.postMessage({type:'inputs', values:{2:1}}); } });
  const messages = await completion;
  noErrors(messages);
  assert.deepEqual(gpios(messages), [[17,0],[17,1]]);
  assert.match(stdout(messages), /pressed: 1/);
  console.log('PASS: live button input across worker messages');
}

{
  const { completion } = run(`from gpiozero import Button, LED
from time import sleep
led = LED(17)
button = Button(2)
button.when_pressed = led.on
button.when_released = led.off
print('ready')
sleep(0.3)
print('finished')
`, { onMessage(message, worker) {
    if (message.type === 'stdout' && message.text.includes('ready')) {
      worker.postMessage({type:'inputs',values:{2:1}});
      setTimeout(() => worker.postMessage({type:'inputs',values:{2:0}}), 50);
    }
  } });
  const messages = await completion;
  noErrors(messages);
  assert.deepEqual(gpios(messages), [[17,0],[17,1],[17,0]]);
  assert.match(stdout(messages), /finished/);
  console.log('PASS: pressed/released callbacks during cooperative sleep');
}

{
  const { completion } = run(`from gpiozero import LED
led = LED(90)
`);
  const messages = await completion;
  assert.match(messages.find(m => m.type === 'error').message, /ValueError.*BCM/);
  assert.equal(messages.at(-1).type, 'done');
  const syntax = await run('for i range(3):\n    print(i)').completion;
  assert.match(syntax.find(m => m.type === 'error').message, /SyntaxError/);
  console.log('PASS: honest Python validation/syntax errors and completion');
}

{
  const { completion } = run(`from gpiozero import Button
button = Button(2)
print('ready')
while not button.is_pressed:
    pass
print('input reached tight loop')
`, { onMessage(message, worker) {
    if (message.type === 'stdout' && message.text.includes('ready')) {
      worker.postMessage({type:'inputs',values:{2:1}});
    }
  } });
  const messages = await completion;
  noErrors(messages);
  assert.match(stdout(messages), /input reached tight loop/);
  console.log('PASS: CPU-bound Python yields so live inputs reach a tight polling loop');
}

{
  const conflict = await run(`from gpiozero import LED, Button
led = LED(17)
button = Button(17)
`).completion;
  assert.match(conflict.find(m => m.type === 'error').message, /GPIO17 is already in use/);
  const reused = await run(`from gpiozero import LED, Button
led = LED(17)
led.close()
button = Button(17)
print(button.is_pressed)
`).completion;
  noErrors(reused);
  assert.match(stdout(reused), /False/);
  console.log('PASS: duplicate pin claims fail clearly; closed pins can be reused');
}

{
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const { worker, messages, clearTimer } = run(`from gpiozero import LED
led = LED(17)
print('ready')
while True:
    led.toggle()
`, { onMessage(message) { if (message.type === 'stdout' && message.text.includes('ready')) resolveReady(); } });
  await ready;
  await new Promise(resolve => setTimeout(resolve, 300));
  const start = performance.now();
  await worker.terminate();
  clearTimer();
  noErrors(messages);
  assert.ok(performance.now() - start < 1000, 'Stop must remain prompt');
  assert.ok(gpios(messages).length <= 25, '300 ms of toggles must not flood the host: ' + gpios(messages).length);
  assert.ok(messages.length <= 30, 'All host messages stay bounded');
  console.log('PASS: 300 ms infinite-toggle flood bounded to ' + gpios(messages).length + ' GPIO messages; stop remains prompt');
}

{
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const { worker, clearTimer } = run(`print('ready')
while True:
    pass
`, { onMessage(message) { if (message.type === 'stdout' && message.text.includes('ready')) resolveReady(); } });
  await ready;
  const start = performance.now();
  await worker.terminate();
  clearTimer();
  assert.ok(performance.now() - start < 1000);
  console.log('PASS: force-terminate runaway Python without blocking main thread');
}

const devices = [
 {id:'adc1',type:'mcp3008',values:{channel0:.5}},
 {id:'dht1',type:'dht22',bcm:4,values:{temperature:24,humidity:50}},
 {id:'bmp1',type:'bmp280',address:0x76,values:{temperature:24,pressure:1013}},
 {id:'light1',type:'bh1750',address:0x23,values:{lux:300}},
 {id:'distance1',type:'vl53l0x',address:0x29,values:{distance:500}},
 {id:'pir1',type:'pir',bcm:5,values:{motion:1}},
 {id:'imu1',type:'mpu6050',address:0x68,values:{ax:-1,ay:.5,az:1,gx:-10,gy:0,gz:20}},
 {id:'oled1',type:'oled',address:0x3c,values:{}},
 {id:'servo1',type:'servo',bcm:18,values:{}},
 {id:'uart1',type:'uart',values:{text:'Hello Pi'}},
 {id:'ads1',type:'ads1115',address:0x48,values:{voltage:1.65}}
].map(d=>({...d,ready:true}));
{
 const messages = await run(`from gpiozero import RGBLED, Servo, MCP3008, MotionSensor
import board, adafruit_dht, adafruit_vl53l0x, adafruit_ssd1306
from bmp280 import BMP280
from smbus2 import SMBus, i2c_msg
from spidev import SpiDev
from serial import Serial
rgb = RGBLED(red=17,green=27,blue=22)
rgb.color = (0.1,0.5,1)
assert rgb.color == (0.1,0.5,1)
s = Servo(18)
s.min()
assert s.value == -1
adc = MCP3008(channel=0)
assert adc.value == 0.5
assert adc.voltage == 1.65
spi = SpiDev()
spi.open(0,0)
assert spi.xfer2([1,128,0]) == [0,2,0]
spi.close()
dht = adafruit_dht.DHT22(board.D4,use_pulseio=False)
assert dht.temperature == 24
assert dht.humidity == 50
dht.exit()
assert MotionSensor(5).motion_detected
with SMBus(1) as bus:
    bmp = BMP280(i2c_dev=bus)
    assert bmp.get_temperature() == 24
    assert bmp.get_pressure() == 1013
    bus.write_byte(0x23,0x10)
    msg = i2c_msg.read(0x23,2)
    bus.i2c_rdwr(msg)
    assert list(msg) == [1,104]
    assert bus.read_i2c_block_data(0x23,0,2) == [1,104]
    bus.write_byte_data(0x68,0x6b,0)
    assert bus.read_byte_data(0x68,0x6b) == 0
    assert bus.read_i2c_block_data(0x68,0x3b,6) == [192,0,32,0,64,0]
    assert bus.read_i2c_block_data(0x68,0x43,6) == [250,226,0,0,10,60]
    bus.write_i2c_block_data(0x48,1,[0xc3,0x83])
    assert bus.read_i2c_block_data(0x48,0,2) == [51,144]
assert adafruit_vl53l0x.VL53L0X(board.I2C()).range == 500
display = adafruit_ssd1306.SSD1306_I2C(128,64,board.I2C())
display.fill(0)
display.text('Hello',0,0,1)
display.pixel(4,5,1)
display.show()
with Serial('/dev/serial0',9600,timeout=1) as uart:
    assert uart.write(b'PING') == 4
    assert uart.readline() == b'Hello Pi\\n'
print('all classes passed')
`,{devices}).completion;
 noErrors(messages);
 assert.match(stdout(messages),/all classes passed/);
 assert.deepEqual(messages.filter(m=>m.type==='device-output'&&m.id==='servo1').at(-1).value,-1);
 assert.deepEqual(messages.find(m=>m.type==='device-output'&&m.id==='oled1').value.pixels,[[4,5,1]]);
 assert.equal(new Set(messages.filter(m=>m.type==='device-read').map(m=>m.id)).size,11);
 console.log('PASS: real teaching API subset, RGB, servo negative value, sensor registers, raw I2C, SPI, UART bytes and OLED pixels');
}
{
 const rtc={id:'rtc1',type:'rtc',address:0x68,ready:true,values:{year:2026,month:9,day:6,hour:12,minute:34,second:56}};
 const m=await run(`from smbus2 import SMBus
assert SMBus(1).read_i2c_block_data(0x68,0,7) == [0x56,0x34,0x12,1,6,9,0x26]
`,{devices:[rtc]}).completion;
 noErrors(m);
 console.log('PASS: DS3231 BCD register values');
}
{
 for(const code of [
  "from smbus2 import SMBus\nSMBus(1).read_byte(0x23)",
  "from gpiozero import MCP3008\nprint(MCP3008().value)",
  "import adafruit_dht,board\nprint(adafruit_dht.DHT22(board.D4).temperature)",
  "from spidev import SpiDev\ns=SpiDev()\ns.open(0,0)\ns.xfer2([1,128,0])",
  "from serial import Serial\nSerial('/dev/serial0').readline()",
  "from gpiozero import Servo\nServo(18)"
 ]) {
  const m=await run(code,{devices:devices.map(d=>({...d,ready:false}))}).completion;
  assert.match(m.find(x=>x.type==='error')?.message || '',/(OSError|IOError).*wired/);
  assert.equal(m.filter(x=>x.type==='device-read').length,0);
 }
 console.log('PASS: presence without ready wiring cannot produce sensor/bus/servo data');
}
{
 const m=await run(`from gpiozero import MCP3008
from time import sleep
adc=MCP3008()
assert adc.value == 0.5
print('update')
sleep(0.1)
assert adc.value == 0.9
print('live')
`,{devices,onMessage(m,w){if(m.type==='stdout'&&m.text.includes('update'))w.postMessage({type:'devices',devices:devices.map(d=>d.type==='mcp3008'?{...d,values:{channel0:.9}}:d)});}}).completion;
 noErrors(m);assert.match(stdout(m),/live/);
 assert.equal(m.filter(x=>x.type==='device-read').length,1);
 console.log('PASS: live sensor updates and bounded read observation');
}
{
 const m=await run(`from smbus2 import SMBus
bus=SMBus(1)
try:
    bus.read_byte(0x5c)
except OSError:
    print('missing caught')
bus.close()
try:
    bus.read_byte(0x23)
except OSError:
    print('closed caught')
from serial import Serial
port=Serial('/dev/serial0')
print(port.readline().decode('utf-8',errors='replace').strip())
from gpiozero import Servo
s=Servo(18)
try:
    s.value=2
except ValueError:
    print('range caught')
`,{devices}).completion;
 noErrors(m);assert.match(stdout(m),/missing caught[\s\S]*closed caught[\s\S]*Hello Pi[\s\S]*range caught/);
 console.log('PASS: Python 3 OSError catching, closed bus, bytes decode and servo range errors');
}
{
 let resolveReady;const ready=new Promise(r=>resolveReady=r);
 const {worker,messages,clearTimer}=run(`from gpiozero import Servo
s=Servo(18)
print('ready')
while True:
    s.min()
    s.max()
`,{devices,onMessage(m){if(m.type==='stdout'&&m.text.includes('ready'))resolveReady();}});
 await ready;await new Promise(r=>setTimeout(r,300));await worker.terminate();clearTimer();
 noErrors(messages);assert.ok(messages.filter(m=>m.type==='device-output').length<=25);
 assert.equal(messages.filter(m=>m.type==='device-read').length,1);
 console.log('PASS: servo output/read events cannot flood host');
}
