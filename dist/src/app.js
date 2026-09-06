import {attachViewportGestures} from './viewport.js';
import {board,getPin} from './boards.js';
import {definitions} from './components.js';
import {lessons} from './content.js';
import {checkLesson} from './circuit.js';
import {simulate,controls,defaults} from './hardware.js';

const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={play:'<path d="m7 4 12 8-12 8z"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',plus:'<path d="M12 5v14M5 12h14"/>',undo:'<path d="m9 4-5 5 5 5M4 9h9a7 7 0 0 1 0 14"/>',wire:'<path d="M5 5v9a5 5 0 0 0 10 0V5"/><circle cx="5" cy="4" r="2"/><circle cx="15" cy="4" r="2"/>',check:'<path d="m5 12 4 4L19 6"/>',trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]||''}</svg>`;
const lesson=lessons.find(l=>l.id===location.hash.slice(1))||lessons[0],KEY='pi-lab-workspace-v3-'+lesson.id,history=[];
let state={components:structuredClone(lesson.components),wires:[],code:lesson.starterCode},selected=null,from=null,running=false,worker=null,outputs={},pressed={},observed=new Set(),zoom=1,audioCtx=null,oscillator=null,volume=null,deviceOutputs={},lastSimulation=null;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.components)&&saved.components.length<=24&&Array.isArray(saved.wires)&&saved.wires.length<=80&&typeof saved.code==='string'&&saved.code.length<50000&&saved.components.every(c=>definitions[c.type]&&typeof c.id==='string'&&/^[A-Za-z0-9_-]+$/.test(c.id)&&Number.isFinite(c.x)&&Number.isFinite(c.y))){state=saved;const ids=new Set([...board.pins.map(p=>p.id),...state.components.flatMap(c=>definitions[c.type].pins.map(p=>`${c.id}:${p.name}`))]);state.wires=state.wires.filter(w=>ids.has(w.a)&&ids.has(w.b));}}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#saved').textContent='この端末に保存済み';}catch{$('#saved').textContent='保存できません';}}
function snapshot(){history.push(structuredClone(state));if(history.length>40)history.shift();}
function mutate(fn){stop(false);snapshot();fn();selected=null;from=null;observed.clear();save();renderStage();renderReference();}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2600);}
function pinName(id){if(id.startsWith('pi:')){const p=getPin(id);return p?`${p.label} · 物理${p.physical}`:id;}const [cid,pid]=id.split(':');const c=state.components.find(c=>c.id===cid);return c?`${definitions[c.type].name} ${cid} · ${definitions[c.type].pins.find(p=>p.name===pid)?.label||pid}`:id;}

$('#app').innerHTML=`
 <div class="lesson-heading"><div><span class="eyebrow">20 LESSONS <span class="sample-badge">${esc(lesson.label)}</span></span><h1><span class="lesson-number">${esc(lesson.number)}</span>${esc(lesson.title)}</h1><p>${esc(lesson.description)}</p>${lessons.length>1?`<label class="lesson-picker">教材 <select id="lesson-select">${lessons.map(l=>`<option value="${esc(l.id)}" ${l.id===lesson.id?'selected':''}>${esc(l.number)}. ${esc(l.title)}</option>`).join('')}</select></label>`:''}</div><div class="lesson-actions"><span id="saved">この端末に保存</span><button id="reset" class="quiet">最初から</button></div></div>
 <div class="workspace">
  <section class="workbench panel" aria-label="回路の作業台"><div class="panel-header"><div class="panel-title">${icon('wire')}<h2>作業台</h2><span id="run-state" class="state-label">停止中</span></div><div class="toolbar"><button class="quiet icon-btn" id="undo" title="元に戻す" aria-label="元に戻す">${icon('undo')}</button><button id="add-toggle" class="secondary">${icon('plus')}部品を追加</button></div></div>
   <div class="parts-tray" id="parts-tray" hidden>${Object.entries(definitions).map(([type,d])=>`<button data-add="${type}"><img src="./assets/${d.asset}" alt=""><span>${d.name}</span></button>`).join('')}</div>
   <div class="canvas-viewport" id="viewport"><div class="canvas-size" id="canvas-size"><div class="canvas" id="canvas"><div class="board-label">RASPBERRY PI 4 <span>40-PIN GPIO</span></div><img class="board-image" src="${board.image}" alt="真上から見たRaspberry Pi 4基板の生成画像" draggable="false"><div class="header-mask"></div><div id="board-pins"></div><svg id="wires" class="wires" viewBox="0 0 850 560" aria-label="接続線"></svg><div id="parts"></div><div class="canvas-note" id="canvas-note">端子 → 端子 の順にタップして接続</div></div></div></div>
   <div class="canvas-actions"><button id="gpio-open" class="secondary">GPIO / GND を選ぶ</button><button id="view-reset" class="quiet" aria-label="作業台の表示位置と拡大率を戻す">表示を戻す</button><span id="selection-note" role="status"></span></div>
   <div id="selected-tools" class="selected-tools" hidden></div>
   <div id="component-inputs" class="component-inputs" hidden></div><div id="device-results" class="device-results" hidden></div>
   <div class="wiring-status" id="wiring-status" role="status"></div>
  </section>
  <div class="side-panels"><section class="editor panel"><div class="panel-header"><div class="panel-title"><span class="file-dot"></span><h2>main.py</h2><span class="language">Python</span></div><button id="run" class="run">${icon('play')}実行</button></div><div class="code-area"><div id="line-numbers" aria-hidden="true"></div><textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Pythonコード"></textarea></div><div class="console-header"><span>出力</span><button id="clear-console" class="quiet">クリア</button></div><pre class="console" id="console" role="log" aria-live="polite">実行すると、ここに結果が表示されます。</pre></section>
  </div>
 </div><footer class="app-footer"><span>20教材 · 配線とコードを試す</span><span>GPIOの動作を再現する学習用シミュレータ</span></footer>
 <div class="bottom-dock"><button id="check-open" aria-controls="check-sheet" aria-expanded="false">${icon('check')}答え・確認<span id="check-progress"></span></button></div>
 <section id="check-sheet" class="check-sheet" role="dialog" aria-modal="false" aria-labelledby="check-title" hidden><div class="sheet-heading"><h2 id="check-title">答え・確認</h2><button id="check-close" aria-label="確認パネルを閉じる">閉じる ×</button></div><div id="reference-content"></div></section>
 <dialog id="pin-dialog" class="pin-dialog"><div class="dialog-head"><h2 id="pin-dialog-title">Raspberry Pi のピン</h2><button id="pin-close">閉じる ×</button></div><p id="pin-dialog-hint">接続する端子を選んでください。</p><div class="pin-legend"><span class="gpio">GPIO：信号</span><span class="ground">GND：接地</span><span class="power">3V3 / 5V：電源</span></div><div id="pin-targets" class="pin-targets" aria-label="端子を表示する機器"></div><div id="pin-grid" class="pin-grid"></div></dialog>`;

function pinPosition(id){if(id.startsWith('pi:')){const p=getPin(id);if(!p)return null;return {x:116+Math.floor((p.physical-1)/2)*12.35,y:p.physical%2===0?183:197};}const [cid,pid]=id.split(':'),c=state.components.find(c=>c.id===cid);if(!c)return null;const d=definitions[c.type],p=d.pins.find(p=>p.name===pid);return p?{x:c.x+d.width*p.x/100,y:c.y+d.height*p.y/100}:null;}
function pinHitSize(d,p){return Math.max(2,Math.min(12,...d.pins.filter(other=>other!==p).map(other=>Math.hypot((other.x-p.x)*d.width/100,(other.y-p.y)*d.height/100)*.75)));}
function terminalType(name){return /GND/.test(name)?'ground':/^(VCC|VDD|VIN|VREF|5V|3V3)$/.test(name)?'power':'gpio';}
function wireColor(w){const a=getPin(w.a),b=getPin(w.b);return [a,b].some(p=>p?.type==='ground')?'#344654':[a,b].some(p=>p?.type==='power')?'#d96153':'#cc9141';}
function renderWires(){
 $('#wires').innerHTML=state.wires.map((w,i)=>{const a=pinPosition(w.a),b=pinPosition(w.b);if(!a||!b)return '';const top=Math.min(a.y,b.y)-38-(i%4)*14;const path=`M${a.x},${a.y} C${a.x},${top} ${b.x},${top} ${b.x},${b.y}`;return `<g data-wire="${i}" class="wire ${selected?.wire===i?'selected':''}" tabindex="0" role="button" aria-label="${esc(pinName(w.a)+' から '+pinName(w.b))}"><path d="${path}" class="wire-hit"/><path d="${path}" class="wire-line" stroke="${wireColor(w)}"/></g>`;}).join('');
}
function renderStage(){
 $('#board-pins').innerHTML=board.pins.map(p=>{const pos=pinPosition(p.id);return `<button class="pin board-pin ${p.type} ${p.physical%2?'odd':'even'}${from===p.id?' pending':''}" style="left:${pos.x}px;top:${pos.y}px" data-pin="${p.id}" aria-label="${esc(pinName(p.id))}" title="${esc(pinName(p.id))}"><span>${esc(p.label)}</span></button>`;}).join('');
 $('#parts').innerHTML=state.components.map(c=>{const d=definitions[c.type];return `<div class="component ${selected?.part===c.id?'selected':''}" style="left:${c.x}px;top:${c.y}px;width:${d.width}px" data-component="${c.id}"><button class="component-handle" data-drag="${c.id}" aria-label="${esc(d.name+' '+c.id)}を選択・移動">${d.name}<span>${c.type==='resistor'?esc(c.value)+'Ω':esc(c.id)}</span></button><button class="terminal-open" data-terminals="${c.id}" aria-label="${esc(d.name)}の端子を大きく表示">端子</button><div class="part-art" style="height:${d.height}px"><img id="image-${c.id}" src="./assets/${d.asset}" style="object-fit:${d.imageFit||'contain'}" alt="${d.name}" draggable="false">${c.type==='button'?`<button class="press-button" data-press="${c.id}" aria-label="${esc(c.id)}を押す"></button>`:''}${c.type==='buzzer'?`<span class="buzzer-state" id="buzzer-${c.id}">OFF</span>`:''}${d.pins.map(p=>`<button class="pin part-pin${from===`${c.id}:${p.name}`?' pending':''}" style="left:${p.x}%;top:${p.y}%;width:${pinHitSize(d,p)}px;height:${pinHitSize(d,p)}px" data-pin="${c.id}:${p.name}" title="${esc(pinName(`${c.id}:${p.name}`))}" aria-label="${esc(pinName(`${c.id}:${p.name}`))}"><span>${p.label}</span></button>`).join('')}</div></div>`;}).join('');
 renderWires();renderTools();renderControls();updateCircuit();$('#undo').disabled=history.length===0;
 $('#selection-note').textContent=from?`${pinName(from)} → 接続先をタップ`:'';
}

function renderControls(){
 const items=[];
 for(const c of state.components){
  if(c.type==='button')items.push(`<button class="secondary" data-press="${c.id}" aria-label="${esc(c.id)}を押す">${esc(c.id)} を押す</button>`);
  const values={...defaults(c),...(state.deviceValues?.[c.id]||{})};
  if(controls[c.type])items.push(`<fieldset class="sensor-controls"><legend>${esc(definitions[c.type].name)}</legend>${controls[c.type].map(([key,label,min,max,step,initial,unit])=>`<label><span>${esc(label)} <output id="control-${c.id}-${key}">${esc(values[key])}${esc(unit)}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${values[key]}" data-device="${c.id}" data-field="${key}" data-unit="${esc(unit)}" aria-label="${esc(definitions[c.type].name+' '+label)}"></label>`).join('')}</fieldset>`);
  if(c.type==='uart')items.push(`<label class="uart-control">機器から送る文字列<input type="text" maxlength="120" value="${esc(values.text)}" data-device="${c.id}" data-field="text" aria-label="UART機器から送る文字列"></label>`);
 }
 $('#component-inputs').hidden=!items.length;$('#component-inputs').innerHTML=items.join('');
 $('#device-results').innerHTML=state.components.filter(c=>!['led','resistor','button','buzzer','supply'].includes(c.type)).map(c=>`<div class="device-result" id="result-${c.id}"><span>${esc(definitions[c.type].name)}</span><output id="device-status-${c.id}">未接続</output>${c.type==='oled'?`<canvas id="oled-${c.id}" width="128" height="64" aria-label="OLEDの表示"></canvas>`:''}${c.type==='servo'?`<svg class="servo-gauge" viewBox="0 0 120 70" aria-label="サーボの位置"><path d="M10 60a50 50 0 0 1 100 0" fill="none" stroke="#d7e2d3" stroke-width="4"/><line id="servo-${c.id}" x1="60" y1="60" x2="60" y2="12" stroke="#407853" stroke-width="5" stroke-linecap="round"/></svg>`:''}${c.type==='rgb'?`<div class="rgb-swatch" id="rgb-${c.id}"></div>`:''}</div>`).join('');
 $('#device-results').hidden=!$('#device-results').children.length;
}
function renderDeviceResults(result){
 for(const c of state.components){
  const status=$(`#device-status-${c.id}`);if(!status)continue;
  const device=result.devices.find(d=>d.id===c.id),value=deviceOutputs[c.id];
  status.textContent=device?.ready?(observed.has(c.id)?'動作確認済み':'接続済み'):'配線を確認';
  if(c.type==='rgb'){const channels=result.states[c.id]?.channels||[0,0,0];const color=`rgb(${channels.map(n=>Math.round(n*255)).join(',')})`;$(`#rgb-${c.id}`).style.background=color;const img=$(`#image-${c.id}`);if(img)img.style.filter=channels.some(n=>n>0)?`drop-shadow(0 0 12px ${color})`:'';status.textContent=channels.map((n,i)=>'RGB'[i]+':'+Math.round(n*100)+'%').join(' ');}
  if(c.type==='servo'){const position=device?.ready&&typeof value==='number'?value:0;const angle=(position+1)*Math.PI/2;$(`#servo-${c.id}`).setAttribute('x2',String(60-48*Math.cos(angle)));$(`#servo-${c.id}`).setAttribute('y2',String(60-48*Math.sin(angle)));if(value!==undefined&&device?.ready)status.textContent=value===null?'信号停止':'位置 '+position.toFixed(2);}
  if(c.type==='oled'){const canvas=$(`#oled-${c.id}`),ctx=canvas.getContext('2d');ctx.fillStyle=value?.fill?'#c7fbeb':'#112b27';ctx.fillRect(0,0,128,64);if(value&&device?.ready){for(const [x,y,color] of value.pixels||[]){ctx.fillStyle=color?'#c7fbeb':'#112b27';ctx.fillRect(x,y,1,1);}if(value.text){ctx.fillStyle='#c7fbeb';ctx.font='8px monospace';ctx.fillText(value.text,0,10);}}}
  if(c.type==='uart'&&value!==undefined)status.textContent='Pi → 機器: '+String(value?.text??value);
 }
}
document.addEventListener('input',e=>{const input=e.target.closest('[data-device]');if(!input)return;const id=input.dataset.device,key=input.dataset.field;state.deviceValues??={};state.deviceValues[id]??={};state.deviceValues[id][key]=input.type==='range'?Number(input.value):input.value;const out=$(`#control-${id}-${key}`);if(out)out.textContent=input.value+(input.dataset.unit||'');save();updateCircuit();});

function renderTools(){const area=$('#selected-tools');area.hidden=!selected;if(!selected)return;if(selected.wire!==undefined){area.innerHTML=`<span>接続線 ${selected.wire+1}</span><button class="quiet danger" id="delete-selected">${icon('trash')}削除</button>`;}else{const c=state.components.find(c=>c.id===selected.part);if(!c){area.hidden=true;return;}area.innerHTML=`<span>${definitions[c.type].name} ${esc(c.id)}</span>${c.type==='resistor'?`<label>抵抗値 <select id="resistance">${[330,1000,10000].map(v=>`<option value="${v}" ${c.value===v?'selected':''}>${v} Ω</option>`).join('')}</select></label>`:''}<button class="quiet danger" id="delete-selected">${icon('trash')}削除</button>`;}}
function renderReference(){
 const checks=checkLesson(lesson,state.components,state.wires,observed),target=$('#reference-content');
 target.innerHTML=`<h3>今の回路を確認</h3><div class="check-list">${checks.map(c=>`<div class="check-row ${c.passed?'passed':''}"><span>${c.passed?icon('check'):'○'}</span>${esc(c.label)}</div>`).join('')}</div><p class="reference-note">${checks.every(c=>c.passed)?'配線と動作を確認できました。'+(lesson.observation||''):'配線し、「実行」で動作を確認しましょう。'}</p>`;
 $('#check-progress').textContent=checks.filter(c=>c.passed).length+' / '+checks.length;
}
function openPins(componentId=null){
 const c=state.components.find(c=>c.id===componentId),pins=c?definitions[c.type].pins.map(p=>({id:c.id+':'+p.name,label:p.label,type:terminalType(p.name)})):board.pins;
 $('#pin-dialog-title').textContent=c?definitions[c.type].name+' の端子':'Raspberry Pi のピン';
 $('#pin-dialog-hint').textContent=from?pinName(from)+' → 接続先を選択':'接続元の端子を選択';
 $('#pin-targets').innerHTML=`<button data-pin-target="pi" aria-pressed="${!c}">Raspberry Pi</button>${state.components.map(part=>`<button data-pin-target="${part.id}" aria-pressed="${part.id===c?.id}">${esc(definitions[part.type].name)} · ${esc(part.id)}</button>`).join('')}`;
 $('#pin-grid').innerHTML=pins.map(p=>`<button class="pin-choice ${p.type}${from===p.id?' chosen':''}" data-choose-pin="${esc(p.id)}"><span>${esc(p.label)}</span><small>${p.physical?'物理 '+p.physical:esc(c.id)}</small></button>`).join('');
 if(!$('#pin-dialog').open)$('#pin-dialog').showModal();
}
function toggleCheck(open){
 $('#check-sheet').hidden=!open;$('#check-open').setAttribute('aria-expanded',String(open));
 if(open){renderReference();$('#check-close').focus({preventScroll:true});}else $('#check-open').focus({preventScroll:true});
}
function connect(a,b){if(!a||!b)return toast('接続元と接続先を選んでください。');if(a===b)return toast('違う端子を選んでください。');if(state.wires.some(w=>w.a===a&&w.b===b||w.a===b&&w.b===a))return toast('すでにつながっています。');if(state.wires.length>=80)return toast('配線は80本までです。');mutate(()=>state.wires.push({a,b}));}
function selectPin(id){if(running)stop(false);if(from===id){from=null;renderStage();return;}if(from){connect(from,id);return;}from=id;selected=null;renderStage();}
function appendLog(text){const output=$('#console');if(output.dataset.empty!=='false'){output.textContent='';output.dataset.empty='false';}output.textContent=(output.textContent+text).slice(-10000);output.scrollTop=output.scrollHeight;}
function updateCircuit(){const result=simulate(state.components,state.wires,outputs,pressed,state.deviceValues||{});lastSimulation=result;for(const c of state.components){const value=result.states[c.id]?.value||0;if(value>0)observed.add(c.id);if(c.type==='led'){const img=$(`#image-${c.id}`);if(img){img.style.filter=value>0?`brightness(${1+value*.35}) drop-shadow(0 0 ${4+value*14}px #ff452e)`:'';img.classList.toggle('lit',value>0);}}if(c.type==='button'){const img=$(`#image-${c.id}`);if(img)img.style.filter=pressed[c.id]?'brightness(.7)':'';}if(c.type==='buzzer'){const el=$(`#buzzer-${c.id}`);if(el){el.textContent=value?'ON':'OFF';el.classList.toggle('on',value>0);}}}
 const status=$('#wiring-status');status.hidden=!result.issues.length;status.classList.toggle('error',result.issues.length>0);status.innerHTML=result.issues.length?`${icon('wire')}<span>${esc(result.issues[0].message)}</span>`:'';

 if(worker){worker.postMessage({type:'inputs',values:result.inputs});worker.postMessage({type:'devices',devices:result.devices});}renderDeviceResults(result);
 if(volume)volume.gain.value=running&&state.components.some(c=>c.type==='buzzer'&&result.states[c.id]?.value>0)?0.035:0;
 if(result.issues.length&&running){appendLog('\n配線エラー: '+result.issues[0].message+'\n');stop(false);}
 renderReference();return result;}
function stop(log=true){if(worker){worker.terminate();worker=null;}const wasRunning=running;running=false;outputs={};deviceOutputs={};pressed={};activePresses.clear();if(volume)volume.gain.value=0;$('#run').innerHTML=icon('play')+'実行';$('#run').classList.remove('is-running');$('#run-state').textContent='停止中';$('#run-state').classList.remove('live');if(log&&wasRunning)appendLog('\n停止しました。\n');updateCircuit();}
function run(){if(running){stop();return;}outputs={};const preflight=simulate(state.components,state.wires,outputs,pressed,state.deviceValues||{});outputs={};if(preflight.issues.length){appendLog(preflight.issues[0].message+'\n');toast('配線を確認してください。');updateCircuit();return;}
 $('#console').textContent='';$('#console').dataset.empty='false';observed.clear();deviceOutputs={};running=true;$('#run').innerHTML=icon('stop')+'停止';$('#run').classList.add('is-running');$('#run-state').textContent='実行中';$('#run-state').classList.add('live');
 try{worker=new Worker('./src/python-worker.js');const activeWorker=worker;worker.onmessage=({data})=>{if(worker!==activeWorker)return;if(data.type==='gpio'){outputs[data.pin]=data.value;updateCircuit();}if(data.type==='device-read'){if(lastSimulation?.devices.some(d=>d.id===data.id&&d.ready)){observed.add(data.id);renderReference();}}if(data.type==='device-output'){if(lastSimulation?.devices.some(d=>d.id===data.id&&d.ready)){deviceOutputs[data.id]=data.value;observed.add(data.id);renderDeviceResults(lastSimulation);renderReference();}}if(data.type==='stdout')appendLog(data.text);if(data.type==='error'){appendLog(data.message+'\n');stop(false);}if(data.type==='done'){appendLog('\n実行が完了しました。出力は停止まで保持されます。\n');worker.terminate();worker=null;$('#run-state').textContent='コード終了';}};worker.onerror=()=>{appendLog('実行環境を読み込めませんでした。ページを再読み込みしてください。\n');stop(false);};const result=updateCircuit();if(worker){worker.postMessage({type:'inputs',values:result.inputs});worker.postMessage({type:'devices',devices:result.devices});worker.postMessage({type:'run',code:state.code});}
 if(state.components.some(c=>c.type==='buzzer')){audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();if(!oscillator){oscillator=audioCtx.createOscillator();volume=audioCtx.createGain();volume.gain.value=0;oscillator.frequency.value=880;oscillator.connect(volume).connect(audioCtx.destination);oscillator.start();}}
 }catch(error){appendLog(String(error)+'\n');stop(false);}}
function updateLineNumbers(){$('#line-numbers').textContent=state.code.split('\n').map((_,i)=>i+1).join('\n');}
function setZoom(next){zoom=Math.max(.25,Math.min(6,next));$('#canvas').style.transform=`scale(${zoom})`;$('#canvas-size').style.width=`${850*zoom}px`;$('#canvas-size').style.height=`${560*zoom}px`;}
function fit(){setZoom(($('#viewport').clientWidth-2)/850);$('#viewport').scrollTo(0,0);}

const gestures=attachViewportGestures($('#viewport'),()=>zoom,setZoom,()=>{if(drag)save();drag=null;activePresses.clear();refreshPressed();});
$('#code').value=state.code;updateLineNumbers();
$('#code').addEventListener('input',e=>{state.code=e.target.value;updateLineNumbers();save();});$('#code').addEventListener('scroll',e=>$('#line-numbers').scrollTop=e.target.scrollTop);
$('#code').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target,start=t.selectionStart,end=t.selectionEnd;t.setRangeText('    ',start,end,'end');state.code=t.value;updateLineNumbers();save();}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}});
$('#run').onclick=run;$('#add-toggle').onclick=()=>$('#parts-tray').hidden=!$('#parts-tray').hidden;
$('#undo').onclick=()=>{if(!history.length)return;stop(false);state=history.pop();$('#code').value=state.code;updateLineNumbers();from=null;selected=null;observed.clear();save();renderStage();renderReference();};
$('#reset').onclick=()=>{mutate(()=>state={components:structuredClone(lesson.components),wires:[],code:lesson.starterCode});$('#code').value=state.code;updateLineNumbers();toast('最初の状態に戻しました。元に戻すこともできます。');};
$('#view-reset').onclick=fit;$('#gpio-open').onclick=()=>openPins();$('#pin-close').onclick=()=>$('#pin-dialog').close();$('#check-open').onclick=()=>toggleCheck($('#check-sheet').hidden);$('#check-close').onclick=()=>toggleCheck(false);
$('#clear-console').onclick=()=>$('#console').textContent='';$('#help-button').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
document.addEventListener('click',e=>{const pinTarget=e.target.closest('[data-pin-target]');if(pinTarget){openPins(pinTarget.dataset.pinTarget);return;}const choice=e.target.closest('[data-choose-pin]');if(choice){$('#pin-dialog').close();selectPin(choice.dataset.choosePin);return;}const terminal=e.target.closest('[data-terminals]');if(terminal){openPins(terminal.dataset.terminals);return;}const pin=e.target.closest('[data-pin]');if(pin){selectPin(pin.dataset.pin);return;}const wire=e.target.closest('[data-wire]');if(wire){selected={wire:Number(wire.dataset.wire)};from=null;renderWires();renderTools();return;}const add=e.target.closest('[data-add]');if(add){if(state.components.length>=24)return toast('部品は24個までです。');const type=add.dataset.add;mutate(()=>state.components.push({id:type+Date.now().toString(36),type,x:540+(state.components.length%3)*45,y:150+(state.components.length%4)*85,value:330}));toast(definitions[type].name+'を追加しました。');return;}
 if(e.target.closest('#delete-selected')){const old=selected;mutate(()=>{if(old.wire!==undefined)state.wires.splice(old.wire,1);else{state.components=state.components.filter(c=>c.id!==old.part);state.wires=state.wires.filter(w=>!w.a.startsWith(old.part+':')&&!w.b.startsWith(old.part+':'));}});}
});
document.addEventListener('change',e=>{if(e.target.id==='resistance'){const id=selected?.part,value=Number(e.target.value);mutate(()=>{state.components.find(c=>c.id===id).value=value;});}});
document.addEventListener('keydown',e=>{const wire=e.target.closest('[data-wire]');if(wire&&(e.key==='Enter'||e.key===' ')){e.preventDefault();wire.dispatchEvent(new MouseEvent('click',{bubbles:true}));}if(e.key==='Escape'){if(!$('#check-sheet').hidden)toggleCheck(false);from=null;selected=null;renderStage();}});
let drag=null;const activePresses=new Map();function refreshPressed(){pressed=Object.fromEntries([...activePresses.values()].map(id=>[id,true]));updateCircuit();}
document.addEventListener('pointerdown',e=>{if(gestures.isPinching())return;const press=e.target.closest('[data-press]');if(press){e.preventDefault();press.setPointerCapture(e.pointerId);activePresses.set(e.pointerId,press.dataset.press);refreshPressed();return;}const handle=e.target.closest('[data-drag]');if(!handle)return;e.preventDefault();if(running)stop(false);const c=state.components.find(c=>c.id===handle.dataset.drag);snapshot();selected={part:c.id};from=null;drag={pointerId:e.pointerId,id:c.id,x:e.clientX,y:e.clientY,startX:c.x,startY:c.y};handle.setPointerCapture(e.pointerId);renderTools();});
document.addEventListener('pointermove',e=>{if(gestures.isPinching()||!drag||drag.pointerId!==e.pointerId)return;const c=state.components.find(c=>c.id===drag.id),d=definitions[c.type];c.x=Math.max(24,Math.min(825-d.width,drag.startX+(e.clientX-drag.x)/zoom));c.y=Math.max(80,Math.min(500-d.height,drag.startY+(e.clientY-drag.y)/zoom));const el=document.querySelector(`[data-component="${c.id}"]`);el.style.left=c.x+'px';el.style.top=c.y+'px';renderWires();});
const release=e=>{if(e?.pointerId!==undefined){activePresses.delete(e.pointerId);}else activePresses.clear();refreshPressed();if(drag&&(!e||e.pointerId===undefined||drag.pointerId===e.pointerId)){drag=null;save();renderStage();}};
document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);window.addEventListener('blur',()=>release());
document.addEventListener('keydown',e=>{const press=e.target.closest('[data-press]');if(press&&(e.key===' '||e.key==='Enter')){e.preventDefault();activePresses.set('key-'+press.dataset.press,press.dataset.press);refreshPressed();}});document.addEventListener('keyup',e=>{const press=e.target.closest('[data-press]');if(press){activePresses.delete('key-'+press.dataset.press);refreshPressed();}});
renderStage();renderReference();fit();save();let resizeTimer,lastViewportWidth=$('#viewport').clientWidth;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const width=$('#viewport').clientWidth;if(width!==lastViewportWidth&&zoom<1)fit();lastViewportWidth=width;},160);});

if($('#lesson-select'))$('#lesson-select').onchange=e=>{save();location.hash=e.target.value;};window.addEventListener('hashchange',()=>location.reload());
