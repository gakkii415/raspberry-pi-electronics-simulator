import {board} from './boards.js';

export function buildGraph(components,wires,pressed={}){
 const graph=new Map();
 const edge=(a,b,type='wire',value=0)=>{if(!graph.has(a))graph.set(a,[]);if(!graph.has(b))graph.set(b,[]);graph.get(a).push({to:b,type,value});graph.get(b).push({to:a,type,value});};
 // The board's GND pins and duplicate power pins share internal rails.
 for(const label of ['GND','3V3','5V']){const pins=board.pins.filter(p=>p.label===label);for(const p of pins.slice(1))edge(pins[0].id,p.id);}
 wires.forEach(w=>edge(w.a,w.b));
 components.forEach(c=>{if(c.type==='resistor')edge(`${c.id}:1`,`${c.id}:2`,'resistor',Number(c.value)||330);if(c.type==='button'){edge(`${c.id}:1l`,`${c.id}:1r`);edge(`${c.id}:2l`,`${c.id}:2r`);if(pressed[c.id])edge(`${c.id}:1l`,`${c.id}:2l`,'button');}});
 components.filter(c=>c.type==='switch'&&pressed[c.id]).forEach(c=>edge(c.id+':1',c.id+':2','button'));
 return graph;
}
export function findPath(graph,from,to,requireResistor=false,excludeResistors=false){
 const queue=[{node:from,hasR:false,resistance:0,path:[from]}];const seen=new Set();
 while(queue.length){const current=queue.shift();if(current.node===to&&(!requireResistor||current.hasR))return current;const key=current.node+':'+current.hasR;if(seen.has(key))continue;seen.add(key);
 for(const e of graph.get(current.node)||[]){if(excludeResistors&&e.type==='resistor')continue; if(current.path.includes(e.to))continue;queue.push({node:e.to,hasR:current.hasR||e.type==='resistor',resistance:current.resistance+e.value,path:[...current.path,e.to]});}}
 return null;
}
export function analyze(components,wires,outputs={},pressed={}){
 const graph=buildGraph(components,wires,pressed),issues=[],states={},inputs={};
 const grounds=[...board.pins.filter(p=>p.type==='ground'),...components.filter(c=>c.type==='supply').map(c=>({id:c.id+':-'}))];
 const sources=[...board.pins.filter(p=>p.type==='power'||outputs[p.bcm]!==undefined).map(p=>({...p,voltage:p.type==='power'?(p.label==='5V'?5:3.3):outputs[p.bcm]*3.3})),...components.filter(c=>c.type==='supply').map(c=>({id:c.id+':+',voltage:5}))];
 const zeros=[...grounds,...sources.filter(p=>p.voltage===0)];
 const issue=(code,message)=>{if(!issues.some(i=>i.code===code))issues.push({code,message});};
 for(const source of sources.filter(p=>p.voltage>0))for(const ground of zeros){if(findPath(graph,source.id,ground.id,false,true))issue('short','電源または出力がGNDに直結しています。配線を直してください。');}
 for(let i=0;i<sources.length;i++)for(let j=i+1;j<sources.length;j++){if(Math.abs(sources[i].voltage-sources[j].voltage)>.05&&findPath(graph,sources[i].id,sources[j].id,false,true))issue('source-conflict','異なる電圧の電源・出力が直結しています。配線を直してください。');}
 for(const p of board.pins.filter(p=>p.type==='gpio')){
  // Runtime Button inputs are logical pressed states (pull-up button to GND).
  inputs[p.bcm]=zeros.some(g=>findPath(graph,p.id,g.id))?1:0;
  for(const high of sources.filter(s=>s.voltage===5))if(findPath(graph,high.id,p.id))issue('5v-gpio','5VがGPIOにつながっています。GPIOには3.3Vを使ってください。');
 }
 for(const c of components){
  if(c.type==='led'||c.type==='buzzer'){
   const a=`${c.id}:${c.type==='led'?'A':'+'}`,k=`${c.id}:${c.type==='led'?'K':'-'}`;
   let value=0,connected=false;
   if(findPath(graph,a,k,false,true)){states[c.id]={value:0,connected:false};if(c.type==='led')issue('led-shunted-'+c.id,'LEDの両端が直接つながっています。LEDを迂回する線を外してください。');continue;}
   for(const source of sources.filter(p=>p.voltage>0))for(const ground of zeros){
    const positive=findPath(graph,source.id,a),negative=findPath(graph,k,ground.id);
    if(!positive||!negative)continue;connected=true;
    const bypass=findPath(graph,source.id,a,false,true)&&findPath(graph,k,ground.id,false,true);
    if(c.type==='led'&&bypass){issue('resistor-'+c.id,'LEDに直列の抵抗がありません。抵抗を通す配線にしてください。');continue;}
    const resistance=positive.resistance+negative.resistance;
    if(c.type==='led'&&resistance<100){issue('low-resistance-'+c.id,'LEDの抵抗が小さすぎます。まず330Ωで試してください。');continue;}
    value=Math.max(value,Math.min(1,source.voltage/3.3));
   }
   states[c.id]={value,connected};
  }
 }
 return {graph,issues,states,inputs};
}
export function checkLesson(lesson,components,wires,observed){
 const graph=buildGraph(components,wires);
 return lesson.checks.map(check=>({...check,passed:check.kind==='path'?(!!findPath(graph,check.from,check.to,check.viaType==='resistor')&&(check.viaType!=='resistor'||!findPath(graph,check.from,check.to,false,true))):observed.has(check.component)}));
}
