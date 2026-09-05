// Add new lesson objects here. The workspace does not hard-code lesson steps.
export const lessons=[{
 id:'workspace-demo',title:'LEDを点滅させる',label:'操作サンプル',description:'答えを見ながら、配線とコードを試してみましょう。',board:'raspberry-pi-4',
 steps:[{title:'配線する',text:'GPIO 17 → 抵抗 → LEDのA（＋）、LEDのK（−）→ GNDの順につなぎます。'},{title:'コードを動かす',text:'「実行」を押して点滅を確認。sleep(0.5) の数字を変えると、点滅の速さが変わります。'},{title:'答えと比べる',text:'右の「答え」で配線とコードを確認できます。配線が違うときは、接続線を選んで削除できます。'}],
 components:[{id:'r1',type:'resistor',x:555,y:250,value:330},{id:'led1',type:'led',x:690,y:330,color:'red'}],
 starterCode:'from gpiozero import LED\nfrom time import sleep\n\nled = LED(17)\n\nwhile True:\n    led.on()\n    sleep(0.5)\n    led.off()\n    sleep(0.5)\n',
 answer:{wires:[{a:'pi:11',b:'r1:1'},{a:'r1:2',b:'led1:A'},{a:'led1:K',b:'pi:6'}],code:'from gpiozero import LED\nfrom time import sleep\n\nled = LED(17)\n\nwhile True:\n    led.on()\n    sleep(0.5)\n    led.off()\n    sleep(0.5)\n',connections:[['GPIO 17 · 物理11','抵抗 · 1'],['抵抗 · 2','LED · A（＋）'],['LED · K（−）','GND · 物理6']]},
 checks:[{kind:'path',from:'pi:11',to:'led1:A',viaType:'resistor',label:'GPIO 17から抵抗を通してLEDへ'},{kind:'path',from:'led1:K',to:'pi:6',label:'LEDのK（−）からGNDへ'},{kind:'output',component:'led1',label:'LEDの点灯を確認'}]
}];
