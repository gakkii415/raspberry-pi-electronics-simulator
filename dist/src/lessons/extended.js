// Standalone authored lessons. Pin numbers on pi endpoints are physical header numbers.
const pinNames={1:'3.3V · 物理1',3:'SDA1 / GPIO2 · 物理3',5:'SCL1 / GPIO3 · 物理5',6:'GND · 物理6',8:'TXD / GPIO14 · 物理8',10:'RXD / GPIO15 · 物理10',12:'GPIO18 · 物理12',19:'MOSI / GPIO10 · 物理19',21:'MISO / GPIO9 · 物理21',23:'SCLK / GPIO11 · 物理23',24:'CE0 / GPIO8 · 物理24'};
const endpoint=e=>e.startsWith('pi:')?pinNames[e.split(':')[1]]:e.replace(':',' · ');
const i2c=id=>[['pi:1',`${id}:VCC`],['pi:6',`${id}:GND`],['pi:3',`${id}:SDA`],['pi:5',`${id}:SCL`]];
const src=(title,url)=>({title,url});
function lesson(number,title,description,components,pairs,code,steps,notes,sources,observation,output){return {id:`lesson-${number}`,number,category:'応用・通信',title,label:'応用',description,board:'raspberry-pi-4',components,starterCode:code,answer:{wires:pairs.map(([a,b])=>({a,b})),code,connections:pairs.map(([a,b])=>[endpoint(a),endpoint(b)])},steps:steps.map(([title,text])=>({title,text})),checks:[...pairs.map(([from,to])=>({kind:'path',from,to,label:`${endpoint(from)} → ${endpoint(to)}`})),...(output?[{kind:'output',component:output,label:'出力の変化を確認'}]:[])],notes,sources,observation};}
export const extendedLessons=[
lesson('18','OLEDディスプレイをつなぐ','SSD1306の128×64画面に図形を描き、座標と画面更新を学びます。',
[{id:'oled1',type:'oled',x:585,y:210}],i2c('oled1'),
`import board
import adafruit_ssd1306
from time import sleep

display = adafruit_ssd1306.SSD1306_I2C(128, 64, board.I2C())
x = 0
while True:
    display.fill(0)
    for dx in range(8):
        for dy in range(8):
            display.pixel(x + dx, 28 + dy, 1)
    display.show()
    x = (x + 4) % 120
    sleep(0.1)
`,
[['4本をつなぐ','VCCは3.3V、GNDは物理6、SDAは物理3、SCLは物理5へ接続します。'],['四角を表示する','実行すると8×8の四角が左から右へ動きます。左上が座標(0, 0)です。'],['更新を確かめる','sleep(0.1)を0.3に変えて動きを比べます。show()で描画内容を画面へ送ります。']],
['教材はSSD1306・I2C・128×64・アドレス0x3Cの3.3V対応モジュールです。SH1106やSPI型はドライバーと配線が異なります。','実機ではI2Cを有効化し、Adafruit Blinkaとadafruit-circuitpython-ssd1306を導入します。モジュールの端子順は印字で確認します。'],
[src('Adafruit SSD1306公式描画例','https://docs.circuitpython.org/projects/ssd1306/en/latest/examples.html')],
'待ち時間を変え、四角が進む速さを比較する。','oled1'),
lesson('28','サーボモーターを動かす','外部5V電源と共通GNDでSG90を動かし、PWMの指定値と位置を対応づけます。',
[{id:'servo1',type:'servo',x:585,y:160},{id:'power1',type:'supply',x:585,y:350,value:5}],
[['power1:+','servo1:VCC'],['power1:-','servo1:GND'],['power1:-','pi:6'],['pi:12','servo1:SIG']],
`from gpiozero import Servo
from time import sleep

servo = Servo(18)
while True:
    for position in (-0.5, 0, 0.5):
        servo.value = position
        print("position =", position)
        sleep(1)
`,
[['電源を分ける','外部5Vの＋をVCC、−をGNDへ接続します。外部電源の−をPiのGND（物理6）にもつなぎます。'],['信号を接続する','SIGをGPIO18（物理12）につなぎます。実機では電源を切って配線し、軸の周囲を空けます。'],['3つの位置を試す','実行すると−0.5、0、0.5へ順に移動します。'],['範囲を変える','±0.5を±0.25へ変え、振れ幅が小さくなることを確かめます。']],
['対象は位置制御型SG90です。連続回転型では同じ値が回転速度の指定になります。','実機ではSG90の仕様に適合する安定化外部5V電源を使います。Piの3.3V端子から給電せず、外部＋をPiの電源端子に接続しません。','GPIO Zeroのvalueは−1〜1の正規化位置です。実際の角度とパルス幅は個体ごとに確認し、端で無理に押し続けません。実機で揺れる場合はGPIO Zeroのピンファクトリー設定も確認します。'],
[src('GPIO Zero Servo API','https://gpiozero.readthedocs.io/en/stable/api_output.html#servo')],
'位置の指定値を±0.25に変え、移動範囲を比較する。','servo1'),
lesson('32','I2C機器をつなぐ','BH1750の候補アドレスを探索し、応答のない機器を例外で扱います。',
[{id:'light1',type:'bh1750',x:585,y:210}],i2c('light1'),
`from smbus2 import SMBus

# この教材にあるBH1750の候補だけを調べる
found = []
with SMBus(1) as bus:
    for address in (0x23, 0x5C):
        try:
            bus.read_byte(address)
        except OSError:
            print(hex(address), "応答なし")
        else:
            found.append(address)
            print(hex(address), "応答あり")
if not found:
    print("VCC・GND・SDA・SCLとアドレス設定を確認")
`,
[['共有する2本の信号','BH1750のVCCを3.3V、GNDを物理6、SDAを物理3、SCLを物理5へつなぎます。'],['アドレスを探す','実行して0x23の応答と0x5Cの応答なしを確認します。'],['未接続を試す','シミュレーターでSDAの線を外して再実行し、確認メッセージを読みます。線を戻して再実行します。']],
['教材はADDRがLowに設定された3.3V対応BH1750モジュール（0x23）です。ADDRがHighなら0x5Cになります。Pi側のバスは1です。','ここでは応答を確認するだけで、照度への変換は行いません。応答だけでは機種を特定できません。','実機ではI2Cを有効化しsmbus2を導入します。探索用の読み出しはすべての機器に安全とは限らないため、接続したBH1750の候補アドレスだけを調べます。実機の配線変更は電源を切って行います。'],
[src('smbus2 API','https://smbus2.readthedocs.io/en/latest/'),src('Linux BH1750ドライバーのアドレス定義','https://android.googlesource.com/kernel/common.git/+/ASB-2018-01-05_4.9-o-release/drivers/iio/light/bh1750.c')],
'SDAを外した状態と接続した状態で、応答結果を比較する。'),
lesson('33','SPI機器をつなぐ','MCP3008へ3バイトを送り、受信したビットから10ビットの値を取り出します。',
[{id:'adc1',type:'mcp3008',x:565,y:140},{id:'pot1',type:'pot',x:670,y:370}],
[['pi:1','adc1:VDD'],['pi:1','adc1:VREF'],['pi:6','adc1:AGND'],['pi:6','adc1:DGND'],['pi:23','adc1:CLK'],['pi:21','adc1:DOUT'],['pi:19','adc1:DIN'],['pi:24','adc1:CS'],['pi:1','pot1:VCC'],['pi:6','pot1:GND'],['pot1:SIG','adc1:CH0']],
`from spidev import SpiDev
from time import sleep

spi = SpiDev()
spi.open(0, 0)  # SPI0、CE0
spi.max_speed_hz = 500000
spi.mode = 0
try:
    while True:
        tx = [0x01, 0x80, 0x00]  # start、single-ended CH0、clock
        rx = spi.xfer2(tx)
        raw = ((rx[1] & 0x03) << 8) | rx[2]
        print("TX:", tx, "RX:", rx, "10bit:", raw)
        sleep(0.5)
finally:
    spi.close()
`,
[['電源と入力をつなぐ','VDDとVREFを3.3V、AGNDとDGNDをGNDへ。可変抵抗のVCCとGNDも同じ電源につなぎ、SIGをCH0へつなぎます。'],['4本のSPI信号','CLK→物理23、DOUT→21、DIN→19、CS→24へ接続します。'],['送受信を読む','実行してTX、RX、10bitの値を確認します。RXの2番目の下位2ビットと3番目の8ビットを連結します。'],['ビットの変化を観察','可変抵抗を動かし、10bitが0〜1023の範囲で変化することを確認します。']],
['MCP3008を3.3Vで動かし、CH0は0〜3.3Vに保ちます。実機のDIP16ではCH0=1、DGND=9、CS=10、DIN=11、DOUT=12、CLK=13、AGND=14、VREF=15、VDD=16です。','実機ではSPIを有効化しspidevを導入します。教材はSPIモード0、CE0を使います。CSをLowに保つ1回のxfer2で3バイトを交換します。','実機の電源にはデータシート推奨のデカップリングを施します。画面では通信に必要な端子を抜粋しています。'],
[src('Microchip MCP3008データシート','https://ww1.microchip.com/downloads/aemDocuments/documents/MSLD/ProductDocuments/DataSheets/MCP3004-MCP3008-Data-Sheet-DS20001295.pdf'),src('py-spidev公式API','https://github.com/doceme/py-spidev')],
'可変抵抗を動かし、RXの下位8ビットと上位2ビットが10ビット値へ合成される様子を見る。'),
lesson('34','UART機器をつなぐ','3.3V UART機器と送受信し、TX/RXの交差配線と改行・タイムアウトを学びます。',
[{id:'uart1',type:'uart',x:585,y:210}],
[['pi:1','uart1:VCC'],['pi:6','uart1:GND'],['pi:8','uart1:RX'],['pi:10','uart1:TX']],
`from serial import Serial
from time import sleep

with Serial('/dev/serial0', 9600, timeout=1) as port:
    while True:
        port.write(b'PING\\n')
        data = port.readline()
        if data:
            print("RX:", data.decode('utf-8', errors='replace').strip())
        else:
            print("1秒以内の受信なし")
        sleep(0.5)
`,
[['送信と受信を交差','Pi TX（物理8）→機器RX、Pi RX（物理10）→機器TXにつなぎます。'],['電源をそろえる','教材の3.3V機器のVCCを物理1、GNDを物理6へつなぎます。'],['文字列を受信する','実行し、機器の送信テキストを変えてRX表示を確認します。教材の機器は改行付きテキストを返します。'],['時間制限を読む','timeout=1は最大1秒の待ち時間です。受信なしでもループは続きます。']],
['対象は3.3V給電・3.3VロジックのUARTテキスト機器です。RS-232電圧や5VロジックをPiのGPIOに直結しません。','実機ではUARTを有効化し、シリアルログインコンソールを無効化してpyserialを導入します。相手機器も9600 baud・8N1に設定します。','PINGに対する応答は機器側の実装が必要です。この教材は改行付きUTF-8テキストを返す模擬機器です。readline()は改行またはタイムアウトまで読みます。'],
[src('pySerial公式入門','https://pyserial.readthedocs.io/en/latest/shortintro.html'),src('Raspberry Pi UART設定','https://www.raspberrypi.com/documentation/computers/configuration.html#configure-uarts')],
'機器の送信テキストを変更し、受信ログへ同じ内容が現れることを確かめる。'),
lesson('37','外付けADCをつなぐ','ADS1115の変換設定を指定し、符号付き16ビット値を電圧へ変換します。',
[{id:'adc1',type:'ads1115',x:565,y:155},{id:'pot1',type:'pot',x:670,y:365}],
[...i2c('adc1'),['pi:1','pot1:VCC'],['pi:6','pot1:GND'],['pot1:SIG','adc1:A0']],
`from smbus2 import SMBus
from time import sleep

with SMBus(1) as bus:
    while True:
        # A0-GND、±4.096Vレンジ、単発変換、128SPS
        bus.write_i2c_block_data(0x48, 1, [0xC3, 0x83])
        sleep(0.02)
        data = bus.read_i2c_block_data(0x48, 0, 2)
        raw = (data[0] << 8) | data[1]
        if raw >= 32768:
            raw -= 65536
        voltage = raw * 4.096 / 32768
        print("raw =", raw, "voltage =", round(voltage, 5), "V")
        sleep(0.3)
`,
[['I2Cと電源を配線','ADS1115のVCC→3.3V、GND→物理6、SDA→3、SCL→5へ接続します。'],['アナログ入力を作る','可変抵抗のVCC→3.3V、GND→GND、SIG→A0へつなぎます。'],['設定と変換を実行','0xC383で単発変換を開始し、結果の2バイトを符号付き整数として読みます。'],['1カウントを考える','可変抵抗を動かして電圧を確認します。この設定の1カウントは4.096÷32768=0.000125Vです。']],
['対象はADS1115・ADDR=GND・0x48の3.3V対応モジュールです。ADS1015は12ビットで、同じ換算式にはなりません。実機ではI2Cとsmbus2を用意します。','±4.096Vは変換レンジです。電源が3.3Vのこの回路で4.096Vや負電圧を入力してよい意味ではありません。A0は0〜3.3Vに保ちます。','16ビットは符号付きの全レンジです。単端入力は主に正側を使い、分解能と実際の測定精度は異なります。'],
[src('TI ADS1115データシート','https://www.ti.com/lit/ds/symlink/ads1115.pdf'),src('smbus2 API','https://smbus2.readthedocs.io/en/latest/')],
'可変抵抗を中央にし、約1.65Vと約13200カウントの対応を確かめる。'),
lesson('40','RTCをつなぐ','DS3231の日時レジスターを読み、BCDの各桁を数値へ戻します。',
[{id:'rtc1',type:'rtc',x:585,y:210}],i2c('rtc1'),
`from smbus2 import SMBus
from time import sleep

def bcd(value):
    return (value >> 4) * 10 + (value & 0x0F)

with SMBus(1) as bus:
    while True:
        data = bus.read_i2c_block_data(0x68, 0, 7)
        second = bcd(data[0] & 0x7F)
        minute = bcd(data[1] & 0x7F)
        if data[2] & 0x40:  # 12時間モードのAM/PMを処理
            hour = bcd(data[2] & 0x1F) % 12
            if data[2] & 0x20:
                hour += 12
        else:
            hour = bcd(data[2] & 0x3F)
        day = bcd(data[4] & 0x3F)
        month = bcd(data[5] & 0x1F)
        year = 2000 + bcd(data[6])
        if data[5] & 0x80:
            year += 100
        print(f"{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}")
        sleep(1)
`,
[['時計を接続する','3.3V対応DS3231のVCC→物理1、GND→6、SDA→3、SCL→5へつなぎます。'],['日時を読む','実行し、0x68のレジスター0から7バイトを一度に読みます。教材の日時を変えて表示を確認します。'],['BCDを読み解く','例として0x34は十の位3・一の位4で34です。単なる整数として読むと52になる点を比べます。'],['日付の位置を確認','data[3]は曜日、data[4]は日です。月の上位ビットは世紀で、月の値から除いています。']],
['対象はDS3231・I2C 0x68です。DS1307とは電源条件やレジスターの意味が異なります。実機ではI2Cとsmbus2を用意します。','教材のRTCには初期日時があります。実機では時刻設定と発振停止フラグの確認が別途必要で、読み出すだけでは現在時刻に合いません。この例は2000年を世紀の基準にしています。','バックアップ電池の種類は基板仕様で確認します。充電回路付き基板に非充電式CR2032をそのまま装着しません。PiのI2C信号は3.3Vにプルアップします。'],
[src('Analog Devices DS3231データシート','https://www.analog.com/media/en/technical-documentation/data-sheets/ds3231.pdf')],
'教材の秒や日付を変え、BCDから復元した日時が一致することを確認する。')
];
