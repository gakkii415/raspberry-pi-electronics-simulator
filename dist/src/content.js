import {basicLessons} from './lessons/basic.js';
import {sensorLessons} from './lessons/sensors.js';
import {extendedLessons} from './lessons/extended.js';
const titles={'01':'単色LEDを光らせる','02':'RGB LEDを光らせる','03':'押しボタンを読み取る','04':'スイッチを読み取る','05':'ブザーを鳴らす','06':'PWMでLEDの明るさを変える','07':'可変抵抗をADC経由で読み取る'};
export const lessons=[...basicLessons,...sensorLessons,...extendedLessons].sort((a,b)=>Number(a.number)-Number(b.number)).map(l=>({...l,title:titles[l.number]||l.title}));
