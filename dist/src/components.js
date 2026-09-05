import {newDefinitions} from './extra-components.js';
export const definitions={
 ...newDefinitions,
 led:{name:'LED',asset:'led-red-off.svg',width:90,height:100.56,pins:[{name:'A',label:'A ＋',x:62.05,y:88.85},{name:'K',label:'K −',x:38.33,y:88.85}]},
 resistor:{name:'抵抗',asset:'resistor-330.svg',width:130,height:24.93,pins:[{name:'1',label:'1',x:0,y:50},{name:'2',label:'2',x:99.44,y:50}]},
 button:{name:'ボタン',asset:'pushbutton-released.svg',width:102,height:68,pins:[{name:'1l',label:'1L',x:0.61,y:28.17},{name:'2l',label:'2L',x:0.61,y:70.5},{name:'1r',label:'1R',x:99.5,y:28.17},{name:'2r',label:'2R',x:99.5,y:70.5}]},
 buzzer:{name:'ブザー',asset:'buzzer.svg',width:85,height:100,pins:[{name:'+',label:'＋',x:57.47,y:100},{name:'-',label:'−',x:42.53,y:100}]}
};
