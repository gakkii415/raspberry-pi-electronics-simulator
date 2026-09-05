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

function run(code, { inputs = {}, onMessage, timeout = 4000 } = {}) {
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
