const outputSource = {title:'GPIO Zero：LED・RGBLED・PWMLED・Buzzer',url:'https://gpiozero.readthedocs.io/en/stable/api_output.html'};
const inputSource = {title:'GPIO Zero：Button と内部プルアップ',url:'https://gpiozero.readthedocs.io/en/stable/api_input.html#button'};
const wire = (a,b) => ({a,b});
const path = (from,to,label,viaType) => ({kind:'path',from,to,label,...(viaType?{viaType}:{})});
const observed = (component,label) => ({kind:'output',component,label});
const ledParts = () => [{id:'r1',type:'resistor',x:555,y:225,value:330},{id:'led1',type:'led',x:715,y:300,color:'red'}];
const ledWires = () => [wire('pi:11','r1:1'),wire('r1:2','led1:A'),wire('led1:K','pi:6')];
const ledConnections = () => [['GPIO 17 · 物理11','抵抗330Ω · 1'],['抵抗330Ω · 2','LED · A（＋）'],['LED · K（−）','GND · 物理6']];
const ledChecks = () => [path('pi:11','led1:A','GPIO 17 → 抵抗 → LEDのA','resistor'),path('led1:K','pi:6','LEDのK → GND'),observed('led1','実行してLEDが光った')];
function lesson(number,title,description,steps,components,code,wires,connections,checks,notes,sources,observation) {
  return {id:`lesson-${number}`,number,category:'GPIOの基礎',title,label:number==='07'?'基礎＋':'はじめて',description,board:'raspberry-pi-4',steps,components,starterCode:code,answer:{wires,code,connections},checks,notes,sources,observation};
}

export const basicLessons = [
lesson('01','単色LED','最初の回路を作り、PythonでLEDを点滅させます。',[
 {title:'答えを開いて配線する',text:'「答え」の配線を見ながら、物理11 → 抵抗330Ω → LEDのA、LEDのK → 物理6をつなぎます。端子を順に選ぶと線を引けます。'},
 {title:'点滅を動かす',text:'そのまま「実行」。0.5秒ずつ点灯と消灯を繰り返します。LED(17) の17はGPIO番号です。'},
 {title:'速さを変える',text:'「停止」して、2つの sleep(0.5) を sleep(0.2) に変更し、もう一度実行します。'}
],ledParts(),`from gpiozero import LED
from time import sleep

led = LED(17)
while True:
    led.on()
    sleep(0.5)
    led.off()
    sleep(0.5)
`,ledWires(),ledConnections(),ledChecks(),['LEDはAが＋、Kが−です。抵抗330ΩはLEDと直列に入れます。','物理11はGPIO 17です。コードに物理番号11を入れると、別のGPIOを操作します。'],[outputSource],'待ち時間を0.5秒から0.2秒に変え、点滅が速くなることを確認する。'),

lesson('02','RGB LED','赤・緑・青を別々のGPIOから動かし、光を混ぜます。',[
 {title:'3色を別々につなぐ',text:'GPIO 17（物理11）→ 抵抗 → R、GPIO 27（物理13）→ 抵抗 → G、GPIO 22（物理15）→ 抵抗 → B。3本とも330Ωを入れます。'},
 {title:'共通の脚をつなぐ',text:'RGB LEDのKをGND（物理6）につなぎます。この部品は共通カソード型です。'},
 {title:'赤・緑・青・黄色を見る',text:'「実行」で1秒ごとに色が変わります。color の3つの値は、左から赤・緑・青の明るさです。'},
 {title:'自分の色を作る',text:'停止後、(1, 1, 0) を (0.5, 0, 1) に変えて再実行。赤を半分、青を全点灯にした色を見ます。'}
],[{id:'rr',type:'resistor',x:550,y:130,value:330},{id:'rg',type:'resistor',x:550,y:210,value:330},{id:'rb',type:'resistor',x:550,y:290,value:330},{id:'rgb1',type:'rgb',x:715,y:360}],`from gpiozero import RGBLED
from time import sleep

led = RGBLED(red=17, green=27, blue=22)
while True:
    led.color = (1, 0, 0)
    sleep(1)
    led.color = (0, 1, 0)
    sleep(1)
    led.color = (0, 0, 1)
    sleep(1)
    led.color = (1, 1, 0)
    sleep(1)
`,[wire('pi:11','rr:1'),wire('rr:2','rgb1:R'),wire('pi:13','rg:1'),wire('rg:2','rgb1:G'),wire('pi:15','rb:1'),wire('rb:2','rgb1:B'),wire('rgb1:K','pi:6')],[['GPIO 17 · 物理11','赤用330Ω · 1'],['赤用330Ω · 2','RGB LED · R'],['GPIO 27 · 物理13','緑用330Ω · 1'],['緑用330Ω · 2','RGB LED · G'],['GPIO 22 · 物理15','青用330Ω · 1'],['青用330Ω · 2','RGB LED · B'],['RGB LED · K','GND · 物理6']],[path('pi:11','rgb1:R','赤に直列抵抗がある','resistor'),path('pi:13','rgb1:G','緑に直列抵抗がある','resistor'),path('pi:15','rgb1:B','青に直列抵抗がある','resistor'),path('rgb1:K','pi:6','共通K → GND'),observed('rgb1','RGB LEDが光った')],['抵抗は共通Kに1本ではなく、R・G・Bに1本ずつ使います。','実物の脚順は製品によって異なります。R・G・B・Kの表示を製品資料で確かめます。'],[outputSource],'4つ目の色の数値を変え、赤・緑・青の混ざり方を見る。'),

lesson('03','押しボタン','押している間だけ変わる入力を、コンソールで読み取ります。',[
 {title:'異なる接点を使う',text:'ボタンの1LをGPIO 17（物理11）、2LをGND（物理6）につなぎます。'},
 {title:'押して値を読む',text:'「実行」して、回路上のボタンを押します。コンソールが「押した」に変わり、離すと「離した」に戻ります。'},
 {title:'読み取り間隔を変える',text:'停止後、sleep(0.2) を sleep(1) に変えます。再実行して、短く押したときに読み逃すことがあるか試します。'}
],[{id:'button1',type:'button',x:650,y:270}],`from gpiozero import Button
from time import sleep

button = Button(17, pull_up=True)
while True:
    if button.is_pressed:
        print("押した")
    else:
        print("離した")
    sleep(0.2)
`,[wire('pi:11','button1:1l'),wire('button1:2l','pi:6')],[['GPIO 17 · 物理11','ボタン · 1L'],['ボタン · 2L','GND · 物理6']],[path('pi:11','button1:1l','GPIO 17 → 1L'),path('button1:2l','pi:6','2L → GND'),observed('button1','Pythonがボタンを読み取った')],['1Lと1Rは内部でつながり、2Lと2Rも内部でつながっています。異なる組の1Lと2Lを使います。','pull_up=True でPi内蔵のプルアップを使います。押すとGPIOはLOWになりますが、is_pressed はTrueになります。'],[inputSource],'ボタンを押す・離す操作とコンソールの表示を対応させる。'),

lesson('04','スイッチ','切り替えた位置を保つスイッチで、ONとOFFを読み取ります。',[
 {title:'スイッチを入力につなぐ',text:'端子1をGPIO 17（物理11）、端子2をGND（物理6）につなぎます。'},
 {title:'ONとOFFを試す',text:'「実行」して、回路上のスイッチを切り替えます。閉じると「ON」、開くと「OFF」が表示されます。'},
 {title:'ボタンとの違いを観察する',text:'切り替えたあと手を離して待ちます。スイッチは位置を保つため、同じ表示が続きます。'}
],[{id:'sw1',type:'switch',x:650,y:270}],`from gpiozero import Button
from time import sleep

switch = Button(17, pull_up=True)
while True:
    if switch.is_pressed:
        print("ON: 接点が閉じています")
    else:
        print("OFF: 接点が開いています")
    sleep(0.3)
`,[wire('pi:11','sw1:1'),wire('sw1:2','pi:6')],[['GPIO 17 · 物理11','スイッチ · 1'],['スイッチ · 2','GND · 物理6']],[path('pi:11','sw1:1','GPIO 17 → 端子1'),path('sw1:2','pi:6','端子2 → GND'),observed('sw1','Pythonがスイッチを読み取った')],['2端子のON/OFFスイッチです。GPIO ZeroのButtonは、このような接点入力にも使えます。','この回路では、接点を閉じるとGNDにつながりONになります。3.3Vへの配線は不要です。'],[inputSource],'ONにしたまま待ち、押しボタンと違って入力が保たれることを確認する。'),

lesson('05','ブザー','ブザーを一定の間隔でON/OFFして、通知のパターンを作ります。',[
 {title:'極性を合わせる',text:'ブザーの＋をGPIO 17（物理11）、−をGND（物理6）につなぎます。'},
 {title:'通知を動かす',text:'「実行」で0.2秒ON、0.8秒OFFを繰り返します。回路上の動作表示でON/OFFを確認します。'},
 {title:'パターンを変える',text:'停止して sleep(0.8) を sleep(0.2) に変更し、再実行。通知の間隔が短くなります。'}
],[{id:'bz1',type:'buzzer',x:665,y:265}],`from gpiozero import Buzzer
from time import sleep

buzzer = Buzzer(17)
while True:
    buzzer.on()
    print("ON")
    sleep(0.2)
    buzzer.off()
    print("OFF")
    sleep(0.8)
`,[wire('pi:11','bz1:+'),wire('bz1:-','pi:6')],[['GPIO 17 · 物理11','ブザー · ＋'],['ブザー · −','GND · 物理6']],[path('pi:11','bz1:+','GPIO 17 → ＋'),path('bz1:-','pi:6','− → GND'),observed('bz1','ブザーがONになった')],['この教材は3.3Vで動く小電流のアクティブブザーを想定しています。実物は消費電流を確認し、GPIOの許容を超える製品にはトランジスタ駆動が必要です。','BuzzerはON/OFFを制御します。受動ブザーで音階を鳴らすコードではありません。'],[outputSource],'OFFの待ち時間を変え、ON表示が現れる間隔を比較する。'),

lesson('06','PWMでLED調光','LEDを消灯・弱い光・半分・全点灯に切り替えます。',[
 {title:'LED回路を組む',text:'GPIO 17（物理11）→ 抵抗330Ω → LEDのA、LEDのK → GND（物理6）をつなぎます。'},
 {title:'4段階の明るさを見る',text:'「実行」。value が0、0.1、0.5、1の順に変わります。0は消灯、1は全点灯です。'},
 {title:'中間の値を試す',text:'停止して0.1を0.25に変更し、再実行します。暗い段階の明るさが変わることを確認します。'}
],ledParts(),`from gpiozero import PWMLED
from time import sleep

led = PWMLED(17)
while True:
    for brightness in [0, 0.1, 0.5, 1]:
        led.value = brightness
        print("明るさ:", brightness)
        sleep(1)
`,ledWires(),ledConnections(),ledChecks(),['PWMは高速なON/OFFの比率で明るさを変えます。GPIOの出力電圧そのものを連続的に変える機能ではありません。','value は0〜1で指定します。調光していても、直列抵抗は必要です。'],[outputSource],'0.1を0.25へ変更し、暗い段階だけが明るくなることを見る。'),

lesson('07','可変抵抗','つまみの位置をMCP3008で読み取り、割合と電圧の目安を表示します。',[
 {title:'つまみをADCにつなぐ',text:'可変抵抗のVCCを3.3V（物理1）、GNDを物理6、中央のSIGをMCP3008のCH0につなぎます。'},
 {title:'ADCの電源をつなぐ',text:'MCP3008のVDDとVREFを3.3V（物理1）、AGNDとDGNDをGND（物理6）へ。4本とも必要です。'},
 {title:'SPIの4本をつなぐ',text:'CLK → 物理23、DOUT → 物理21、DIN → 物理19、CS → 物理24。「答え」で各接続を照合します。'},
 {title:'つまみを動かして読む',text:'「実行」中に可変抵抗のつまみを動かします。コンソールの割合が0〜1、電圧の目安が0〜3.3Vの範囲で変わります。'}
],[{id:'adc1',type:'mcp3008',x:560,y:140},{id:'pot1',type:'pot',x:720,y:365}],`from gpiozero import MCP3008
from time import sleep

pot = MCP3008(channel=0)
while True:
    ratio = pot.value
    print("割合:", round(ratio, 3), "電圧の目安:", round(ratio * 3.3, 2), "V")
    sleep(0.3)
`,[wire('pi:1','pot1:VCC'),wire('pot1:GND','pi:6'),wire('pot1:SIG','adc1:CH0'),wire('pi:1','adc1:VDD'),wire('pi:1','adc1:VREF'),wire('adc1:AGND','pi:6'),wire('adc1:DGND','pi:6'),wire('pi:23','adc1:CLK'),wire('pi:21','adc1:DOUT'),wire('pi:19','adc1:DIN'),wire('pi:24','adc1:CS')],[['3.3V · 物理1','可変抵抗 · VCC'],['GND · 物理6','可変抵抗 · GND'],['可変抵抗 · SIG（中央）','MCP3008 · CH0（ICの1番脚）'],['3.3V · 物理1','MCP3008 · VDD（ICの16番脚）'],['3.3V · 物理1','MCP3008 · VREF（ICの15番脚）'],['GND · 物理6','MCP3008 · AGND（ICの14番脚）'],['GND · 物理6','MCP3008 · DGND（ICの9番脚）'],['GPIO 11 / SCLK · 物理23','MCP3008 · CLK（ICの13番脚）'],['GPIO 9 / MISO · 物理21','MCP3008 · DOUT（ICの12番脚）'],['GPIO 10 / MOSI · 物理19','MCP3008 · DIN（ICの11番脚）'],['GPIO 8 / CE0 · 物理24','MCP3008 · CS（ICの10番脚）']],[path('pi:1','pot1:VCC','つまみVCC → 3.3V'),path('pot1:GND','pi:6','つまみGND → GND'),path('pot1:SIG','adc1:CH0','つまみSIG → CH0'),path('pi:1','adc1:VDD','ADCのVDD → 3.3V'),path('pi:1','adc1:VREF','ADCのVREF → 3.3V'),path('adc1:AGND','pi:6','ADCのAGND → GND'),path('adc1:DGND','pi:6','ADCのDGND → GND'),path('pi:23','adc1:CLK','SCLK → CLK'),path('pi:21','adc1:DOUT','MISO → DOUT'),path('pi:19','adc1:DIN','MOSI → DIN'),path('pi:24','adc1:CS','CE0 → CS'),observed('adc1','PythonがCH0を読み取った')],['Raspberry Piには汎用のアナログ入力がないため、間にADCを入れます。このレッスンはつまみの位置の読み取りが目標です。','VREFを3.3Vにつないだので、割合×3.3を電圧の目安にしています。可変抵抗もADCも5Vではなく3.3Vで使います。','実機でハードウェアSPIを使う場合は、Raspberry Piの設定でSPIを有効にします。10kΩ程度の可変抵抗を想定しています。'],[{title:'GPIO Zero：MCP3008とSPIの既定ピン',url:'https://gpiozero.readthedocs.io/en/stable/api_spi.html'},{title:'Microchip：MCP3004/3008データシート',url:'https://ww1.microchip.com/downloads/en/DeviceDoc/21295d.pdf'}],'つまみを端・中央・反対の端に動かし、割合が約0・0.5・1になることを見る。')
];
