import {board} from './boards.js';
import {analyze,findPath} from './circuit.js';

export const controls={
 switch:[['closed','スイッチ',0,1,1,0,'']],
 pot:[['position','つまみ',0,1,.01,.5,'']],
 dht22:[['temperature','温度',-10,60,.5,24,'℃'],['humidity','湿度',0,100,1,50,'%']],
 bmp280:[['temperature','温度',-10,50,.5,24,'℃'],['pressure','気圧',300,1100,1,1013,'hPa']],
 bh1750:[['lux','照度',0,1000,10,300,'lx']],
 vl53l0x:[['distance','距離',50,2000,10,500,'mm']],
 pir:[['motion','人の動き',0,1,1,0,'']],
 mpu6050:[['ax','加速度 X',-2,2,.05,0,'g'],['ay','加速度 Y',-2,2,.05,0,'g'],['az','加速度 Z',-2,2,.05,1,'g'],['gx','角速度 X',-250,250,1,0,'°/s'],['gy','角速度 Y',-250,250,1,0,'°/s'],['gz','角速度 Z',-250,250,1,0,'°/s']],
 rtc:[['hour','時',0,23,1,12,''],['minute','分',0,59,1,34,''],['second','秒',0,59,1,56,'']]
};
export const defaults=c=>({...Object.fromEntries((controls[c.type]||[]).map(p=>[p[0],p[5]])),...(c.type==='rtc'?{year:2026,month:9,day:6}:{}),...(c.type==='uart'?{text:'Hello Pi'}:{})});
const addresses={bmp280:0x76,bh1750:0x23,vl53l0x:0x29,mpu6050:0x68,oled:0x3c,ads1115:0x48,rtc:0x68};

export function simulate(components,wires,outputs={},pressed={},values={}){
 const contacts={...pressed};
 for(const c of components)if(c.type==='switch')contacts[c.id]=!!values[c.id]?.closed;
 const expanded=[...components],links=[...wires];
 for(const c of components.filter(c=>c.type==='rgb'))for(const channel of ['R','G','B']){
  const id=c.id+'-'+channel;expanded.push({id,type:'led'});links.push({a:c.id+':'+channel,b:id+':A'},{a:c.id+':K',b:id+':K'});
 }
 const result=analyze(expanded,links,outputs,contacts),g=result.graph;
 const linked=(a,b)=>!!findPath(g,a,b,false,true);
 const bcmFor=pin=>board.pins.find(p=>p.bcm!==null&&linked(pin,p.id))?.bcm;
 const ground=pin=>board.pins.some(p=>p.type==='ground'&&linked(pin,p.id));
 const power=(pin,voltage)=>board.pins.some(p=>p.label===(voltage===5?'5V':'3V3')&&linked(pin,p.id))||components.some(c=>c.type==='supply'&&voltage===5&&linked(pin,c.id+':+')&&ground(c.id+':-'));
 const readyPower=(c,v=3.3)=>power(c.id+':VCC',v)&&ground(c.id+':GND');
 const devices=[];
 const potAt=pin=>components.find(p=>p.type==='pot'&&readyPower(p)&&linked(p.id+':SIG',pin));
 const getValues=c=>({...defaults(c),...(values[c.id]||{})});
 for(const c of components){
  const v=getValues(c);let ready=false,bcm,address=addresses[c.type];
  if(c.type==='rgb'){
   const channels=['R','G','B'].map(k=>result.states[c.id+'-'+k]?.value||0);
   result.states[c.id]={value:Math.max(...channels),channels};continue;
  }
  if(c.type==='button'||c.type==='switch'){
   const groups=c.type==='button'?['1l','2l']:['1','2'];
   // Inspect the open switch graph so a pressed contact cannot disguise wrong-side wiring.
   const open=analyze(components,wires,outputs,{}).graph;
   const path=(a,b)=>!!findPath(open,a,b,false,true);
   for(const [a,b] of [groups,[...groups].reverse()]){
    const p=board.pins.find(p=>p.bcm!==null&&path(c.id+':'+a,p.id));
    if(p&&!path(c.id+':'+a,c.id+':'+b)&&board.pins.some(p=>p.type==='ground'&&path(c.id+':'+b,p.id))){bcm=p.bcm;ready=true;break;}
   }
   v.pressed=contacts[c.id]?1:0;
  }else if(c.type==='pot'){ready=readyPower(c);}
  else if(c.type==='mcp3008'){
   const required={VDD:'pi:1',VREF:'pi:1',AGND:'pi:6',DGND:'pi:6',CLK:'pi:23',DOUT:'pi:21',DIN:'pi:19',CS:'pi:24'};
   const pot=potAt(c.id+':CH0');ready=Object.entries(required).every(([a,b])=>linked(c.id+':'+a,b))&&!!pot;
   v.channel0=pot?getValues(pot).position:0;
  }else if(c.type==='dht22'||c.type==='pir'){
   bcm=bcmFor(c.id+':'+(c.type==='dht22'?'DATA':'OUT'));ready=readyPower(c,c.type==='pir'?5:3.3)&&bcm!==undefined;
   if(c.type==='pir'&&ready)result.inputs[bcm]=v.motion?1:0;
  }else if(address!==undefined){
   ready=readyPower(c)&&linked(c.id+':SDA','pi:3')&&linked(c.id+':SCL','pi:5');
   if(c.type==='ads1115'){const pot=potAt(c.id+':A0');ready=ready&&!!pot;v.voltage=pot?getValues(pot).position*3.3:0;}
  }else if(c.type==='servo'){
   bcm=bcmFor(c.id+':SIG');ready=readyPower(c,5)&&bcm!==undefined;
  }else if(c.type==='uart'){
   ready=readyPower(c)&&linked(c.id+':TX','pi:10')&&linked(c.id+':RX','pi:8');
  }else continue;
  devices.push({id:c.id,type:c.type,bcm,address,values:v,ready});
  result.states[c.id]={...result.states[c.id],ready};
 }
 const active=devices.filter(d=>d.ready&&d.address!==undefined);
 for(let i=0;i<active.length;i++)if(active.slice(i+1).some(d=>d.address===active[i].address))result.issues.push({code:'i2c-address',message:'同じI2Cアドレスの機器が重複しています。どちらかを外してください。'});
 return {...result,devices};
}
