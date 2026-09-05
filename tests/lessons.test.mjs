import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {lessons} from '../dist/src/content.js';
import {definitions} from '../dist/src/components.js';
import {simulate} from '../dist/src/hardware.js';
import {checkLesson} from '../dist/src/circuit.js';

const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist/src');
const bootstrap=`const {parentPort,workerData}=require('node:worker_threads');const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const c=vm.createContext({setTimeout,clearTimeout,performance,console});c.self=c;c.postMessage=d=>parentPort.postMessage(d);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(workerData,f),'utf8'),c));vm.runInContext(fs.readFileSync(path.join(workerData,'python-worker.js'),'utf8'),c);parentPort.on('message',data=>c.onmessage({data}));`;
assert.equal(lessons.length,20);assert.equal(new Set(lessons.map(l=>l.id)).size,20);
assert.deepEqual(lessons.map(l=>l.number),['01','02','03','04','05','06','07','08','09','10','12','13','14','18','28','32','33','34','37','40']);
for(const l of lessons){
 assert.equal(l.starterCode,l.answer.code);
 for(const c of l.components){assert.ok(definitions[c.type],c.type);assert.ok(fs.existsSync(path.join(directory,'../assets',definitions[c.type].asset)));}
 const r=simulate(l.components,l.answer.wires);
 assert.equal(r.issues.length,0,l.number+JSON.stringify(r.issues));
 assert.ok(r.devices.every(d=>d.ready),l.number+' device not ready');
 assert.ok(checkLesson(l,l.components,l.answer.wires,new Set(l.components.map(c=>c.id))).every(c=>c.passed));
 for(let i=0;i<l.answer.wires.length;i++){
  const wires=l.answer.wires.filter((_,j)=>j!==i);
  const checks=checkLesson(l,l.components,wires,new Set());
  assert.ok(checks.some(c=>c.kind==='path'&&!c.passed),l.number+' wire '+i+' missing but all path checks pass');
 }
}
console.log('PASS: exactly20 topics, all assets/positive circuits, and each missing wire fails a path check');
async function executeLesson(l){
 const worker=new Worker(bootstrap,{eval:true,workerData:directory}),observed=new Set(),outputs={};let logs='',finished=false,successTimer=null;
 let result=simulate(l.components,l.answer.wires,outputs);
 worker.postMessage({type:'inputs',values:result.inputs});worker.postMessage({type:'devices',devices:result.devices});
 return new Promise((resolve,reject)=>{
  const finish=(error)=>{if(finished)return;finished=true;clearTimeout(timeout);clearTimeout(successTimer);worker.terminate();if(!error)console.log('PASS: lesson '+l.number+' actual Python + wired output');error?reject(error):resolve();};
  const timeout=setTimeout(()=>finish(new Error('Timeout '+l.number+' observed '+[...observed]+' logs '+logs)),5000);
  worker.on('error',finish);
  worker.on('message',m=>{
   if(m.type==='error')return finish(new Error(l.number+' '+m.message));
   if(m.type==='stdout')logs+=m.text;
   if(m.type==='gpio'){
    outputs[m.pin]=m.value;result=simulate(l.components,l.answer.wires,outputs);
    if(result.issues.length)return finish(new Error(l.number+' output wiring '+JSON.stringify(result.issues)));
    for(const [id,s] of Object.entries(result.states))if(s.value>0)observed.add(id);
    worker.postMessage({type:'inputs',values:result.inputs});worker.postMessage({type:'devices',devices:result.devices});
   }
   if(m.type==='device-read'||m.type==='device-output'){if(result.devices.some(d=>d.id===m.id&&d.ready))observed.add(m.id);}
   if(!successTimer&&checkLesson(l,l.components,l.answer.wires,observed).every(c=>c.passed))successTimer=setTimeout(()=>finish(),250);
  });
  worker.postMessage({type:'run',code:l.answer.code});
 });
}
for(let i=0;i<lessons.length;i+=4)await Promise.all(lessons.slice(i,i+4).map(executeLesson));
