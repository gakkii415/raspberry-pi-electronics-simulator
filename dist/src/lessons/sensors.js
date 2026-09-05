// Researched, self-contained lesson objects. Pin numbers after pi: are physical.
const commonI2CNotes = [
  '実機ではRaspberry PiのI2Cを有効にし、使用するPythonライブラリを仮想環境にインストールします。配線の変更は電源を切って行います。',
  'この教材は3.3Vで動作する完成モジュールを使用します。実物の端子順は製品で違うため、位置ではなくVCC・GND・SDA・SCLの印字を確認してください。'
];
function makeSensor({number,title,type,description,steps,code,notes,sources,observation,digital=false,power5=false,label='初級'}) {
 const id='sensor1';
 const pairs=digital ? [[power5?'pi:2':'pi:1',`${id}:VCC`],['pi:6',`${id}:GND`],['pi:7',`${id}:${type==='pir'?'OUT':'DATA'}`]] : [['pi:1',`${id}:VCC`],['pi:6',`${id}:GND`],['pi:3',`${id}:SDA`],['pi:5',`${id}:SCL`]];
 const piLabels={'pi:1':'3.3V · 物理1','pi:2':'5V · 物理2','pi:6':'GND · 物理6','pi:7':'GPIO 4 · 物理7','pi:3':'SDA / GPIO 2 · 物理3','pi:5':'SCL / GPIO 3 · 物理5'};
 const connections=pairs.map(([a,b])=>[piLabels[a],`${type.toUpperCase()} · ${b.split(':')[1]}`]);
 return {id:`lesson-${number}`,number,category:'センサー',title,label,description,board:'raspberry-pi-4',steps,components:[{id,type,x:630,y:190}],starterCode:code,answer:{wires:pairs.map(([a,b])=>({a,b})),code,connections},checks:[...pairs.map(([from,to],i)=>({kind:'path',from,to,label:connections[i].join(' → ')})),{kind:'output',component:id,label:'配線したセンサーから値を読み取る'}],notes,sources,observation};
}
export const sensorLessons=[
 makeSensor({number:'08',title:'温湿度センサーをつなぐ',type:'dht22',digital:true,
 description:'DHT22モジュールのDATA線から、温度（℃）と相対湿度（%）を読み取ります。',
 steps:[
 {title:'電源の2本をつなぐ',text:'プルアップ抵抗付き3端子DHT22モジュールを使います。VCCをPiの3.3V（物理1）、GNDを物理6へつなぎます。'},
 {title:'DATAをGPIO 4へ',text:'DATAをGPIO 4（物理7）へ接続します。コードのboard.D4はGPIO番号4で、物理4番ピンではありません。'},
 {title:'温度と湿度を読む',text:'「実行」を押し、出力に温度と湿度が2秒ごとに表示されることを確認します。'},
 {title:'環境を変えてみる',text:'温度を24→30℃、湿度を50→70%に動かし、次の読み取りで両方の数値が変わるか比べます。'}],
 code:`import board
import adafruit_dht
from time import sleep

sensor = adafruit_dht.DHT22(board.D4, use_pulseio=False)
try:
    while True:
        try:
            temperature = sensor.temperature
            humidity = sensor.humidity
            print(f"温度 {temperature:.1f} ℃ / 湿度 {humidity:.1f} %")
        except RuntimeError:
            print("読み取りを再試行します")
        sleep(2.0)
finally:
    sensor.exit()
`,
 notes:['DHT22の実測更新は最短でも約2秒間隔です。短いsleepにしても新しい測定結果が増えるわけではありません。','裸の4端子DHT22と、この教材の3端子モジュールは別です。裸の素子を使う場合はDATAと3.3Vの間に外付けプルアップ抵抗が必要です。','実機ではAdafruit Blinkaとadafruit-circuitpython-dhtを用意します。DATAも3.3Vにそろえます。'],
 sources:[{title:'Adafruit DHT22仕様と測定間隔',url:'https://learn.adafruit.com/dht/overview'},{title:'Adafruit DHT Python API',url:'https://docs.circuitpython.org/projects/dht/en/latest/api.html'}],
 observation:'温度・湿度のスライダーを別々に変え、2秒後の出力のどちらが変わるか確認する。'}),
 makeSensor({number:'09',title:'気圧センサーをつなぐ',type:'bmp280',
 description:'BMP280とI2Cで通信し、気圧（hPa）と温度（℃）を表示します。',
 steps:[
 {title:'3.3VとGNDをつなぐ',text:'BMP280のVCCを物理1、GNDを物理6へつなぎます。この教材のモジュールはI2Cアドレス0x76です。'},
 {title:'通信線をつなぐ',text:'SDAをGPIO 2（物理3）、SCLをGPIO 3（物理5）へつなぎます。SDAはデータ、SCLは通信のタイミングを運びます。'},
 {title:'気圧を表示する',text:'「実行」を押し、約1013 hPaの気圧と温度が繰り返し出力されることを確認します。'},
 {title:'気圧だけを変える',text:'気圧を1013→980 hPaに動かします。気圧の出力だけが下がることを確かめてから、温度も変えてみます。'}],
 code:`from smbus2 import SMBus
from bmp280 import BMP280
from time import sleep

with SMBus(1) as bus:
    sensor = BMP280(i2c_dev=bus)
    while True:
        temperature = sensor.get_temperature()
        pressure = sensor.get_pressure()
        print(f"気圧 {pressure:.1f} hPa / 温度 {temperature:.1f} ℃")
        sleep(0.5)
`,
 notes:[...commonI2CNotes,'このコードはPimoroniのbmp280ライブラリを使用します。BMP280は気圧と温度を測定し、湿度は測定しません。','アドレスは基板の設定で0x76または0x77になります。この教材は0x76に設定済みです。表示する気圧は測定場所の値で、海面更正気圧とは異なります。'],
 sources:[{title:'Pimoroni BMP280 Python使用例',url:'https://github.com/pimoroni/bmp280-python/blob/master/examples/temperature-and-pressure.py'},{title:'Adafruit BMP280端子と電源',url:'https://learn.adafruit.com/adafruit-bmp280-barometric-pressure-plus-temperature-sensor-breakout/pinouts'}],
 observation:'気圧のスライダーを1013から980 hPaへ下げ、出力が追従することを確認する。'}),
 makeSensor({number:'10',title:'明るさ・照度センサーをつなぐ',type:'bh1750',
 description:'BH1750の2バイトの測定値を、明るさの単位lux（lx）に変換します。',
 steps:[
 {title:'電源を配線する',text:'BH1750のVCCを3.3V（物理1）、GNDを物理6へつなぎます。アドレス0x23のモジュールを使います。'},
 {title:'I2Cを配線する',text:'SDAを物理3、SCLを物理5へつなぎます。電源2本と通信2本、合計4本を確認します。'},
 {title:'照度を読み取る',text:'「実行」を押します。コードは0x10で連続測定を開始し、最初の測定を待ってから2バイトを読みます。'},
 {title:'明暗を比べる',text:'照度を300→20→800 lxと動かし、暗い環境ほど小さい値になることを確認します。'}],
 code:`from smbus2 import SMBus, i2c_msg
from time import sleep

with SMBus(1) as bus:
    bus.write_byte(0x23, 0x10)  # 連続・高分解能モード
    sleep(0.18)               # 最初の測定を待つ
    while True:
        message = i2c_msg.read(0x23, 2)
        bus.i2c_rdwr(message)
        data = list(message)
        raw = data[0] * 256 + data[1]
        lux = raw / 1.2
        print(f"照度 {lux:.1f} lx")
        sleep(0.5)
`,
 notes:[...commonI2CNotes,'BH1750のADDRがLowのとき7ビットアドレスは0x23、Highのときは0x5Cです。この教材ではLowに設定済みです。','0x10の標準設定では測定に最大180msかかり、上位・下位の2バイトを組み合わせて1.2で割るとlxになります。','i2c_msg.readは余分なコマンドを送らず2バイトを読みます。照度は受光面に届く光の量なので、センサーの向きや影でも変わります。'],
 sources:[{title:'ROHM BH1750FVIデータシート（WEMOS公開）',url:'https://www.wemos.cc/en/latest/_static/files/bh1750fvi-tr.pdf'},{title:'smbus2公式ドキュメント',url:'https://smbus2.readthedocs.io/en/latest/'}],
 observation:'照度を20 lxから800 lxへ上げ、Pythonで変換したlxが同じ方向に増えることを確認する。'}),
 makeSensor({number:'12',title:'ToF距離センサーをつなぐ',type:'vl53l0x',
 description:'VL53L0Xモジュールから、対象物までの距離をミリメートルで読み取ります。',
 steps:[
 {title:'モジュールへ電源を供給',text:'VL53L0XのVCCを3.3V（物理1）、GNDを物理6につなぎます。3.3V入力に対応する完成モジュールを使います。'},
 {title:'I2Cを接続する',text:'SDAを物理3、SCLを物理5へつなぎます。VL53L0Xの標準アドレスは0x29です。'},
 {title:'距離を表示する',text:'「実行」を押します。sensor.rangeはmmなので、出力の500 mmは50 cmを表します。'},
 {title:'対象物を近づける',text:'距離を500→100 mmに下げて出力を見ます。1000 mmにも動かし、cmへの換算値も追従することを確認します。'}],
 code:`import board
import adafruit_vl53l0x
from time import sleep

sensor = adafruit_vl53l0x.VL53L0X(board.I2C())
while True:
    distance = sensor.range
    print(f"距離 {distance} mm / {distance / 10:.1f} cm")
    sleep(0.5)
`,
 notes:[...commonI2CNotes,'実機ではAdafruit Blinkaとadafruit-circuitpython-vl53l0xを使用します。裸のセンサーICにこの配線をそのまま適用せず、電源回路付きモジュールを使います。','ToFは光の往復時間を使う距離測定です。実機の測定可能距離は、対象物の反射率、角度、周囲の光などで変わります。','この練習のスライダーは距離の入力です。実機特有の反射や測定範囲外のエラーは再現しません。'],
 sources:[{title:'Adafruit VL53L0X Python API（rangeはmm）',url:'https://docs.circuitpython.org/projects/vl53l0x/en/latest/api.html'},{title:'Adafruit VL53L0Xモジュールの端子',url:'https://learn.adafruit.com/adafruit-vl53l0x-micro-lidar-distance-sensor-breakout/pinouts'}],
 observation:'距離を500 mmから100 mmに変え、出力が50.0 cmから10.0 cmになることを確認する。'}),
 makeSensor({number:'13',title:'PIR人感センサーをつなぐ',type:'pir',digital:true,power5:true,
 description:'HC-SR501の3.3V出力をGPIO 4で読み、動きの有無を表示します。',
 steps:[
 {title:'5V電源をつなぐ',text:'HC-SR501のVCCを5V（物理2）、GNDを物理6へつなぎます。このセンサーの電源は3.3Vではなく5Vです。'},
 {title:'OUTをつなぐ',text:'OUTをGPIO 4（物理7）へつなぎます。HC-SR501は5V給電でも検知出力が約3.3Vになるモジュールです。'},
 {title:'待機状態を読む',text:'「実行」を押し、未検知のとき「動きなし」が繰り返し表示されるか確認します。'},
 {title:'動きを切り替える',text:'人感の操作を「検知」に切り替え、「動きを検知」になることを確認します。「未検知」に戻したときの表示も比べます。'}],
 code:`from gpiozero import MotionSensor
from time import sleep

pir = MotionSensor(4)
while True:
    if pir.motion_detected:
        print("動きを検知")
    else:
        print("動きなし")
    sleep(0.3)
`,
 notes:['実物は端子の並びが基板ごとに違います。HC-SR501のVCC・OUT・GNDの印字を確認し、電源を切った状態で配線します。','PIRは赤外線の変化を検出します。静止した人を常に検出する在席センサーではありません。','実機は電源投入直後に安定待ちが必要で、検知後にOUTが一定時間Highを保ちます。保持時間や再検知設定はこの教材では簡略化しています。','実機ではgpiozeroを使用します。MotionSensor(4)の4はBCM番号で、物理7番に対応します。'],
 sources:[{title:'GPIO Zero MotionSensorの配線とAPI',url:'https://gpiozero.readthedocs.io/en/stable/api_input.html#motionsensor-d-sun-pir'},{title:'Adafruit PIRセンサーの接続',url:'https://learn.adafruit.com/pir-passive-infrared-proximity-motion-sensor/connecting-to-a-pir'}],
 observation:'人感を未検知→検知→未検知と切り替え、出力メッセージが変わることを確認する。'}),
 makeSensor({number:'14',title:'IMU（加速度・ジャイロ）をつなぐ',type:'mpu6050',label:'中級',
 description:'MPU6050の加速度3軸と角速度3軸を読み、向きと回転の違いを観察します。',
 steps:[
 {title:'電源とI2Cを配線する',text:'VCCを3.3V（物理1）、GNDを物理6、SDAを物理3、SCLを物理5へつなぎます。アドレスは0x68です。'},
 {title:'起動と測定範囲を確認',text:'コードは0x6Bに0を書いてスリープを解除し、加速度を±2 g、角速度を±250 °/sに設定します。「実行」を押してください。'},
 {title:'静止時の値を見る',text:'初期値は加速度X=0、Y=0、Z=1 g、角速度はすべて0です。静止中でも加速度には重力の約1 gが含まれます。'},
 {title:'傾きと回転を比べる',text:'加速度Xを1、Zを0にして横向きを表します。次に角速度Zを90 °/sにし、加速度と別の行が変わることを確認します。'}],
 code:`from smbus2 import SMBus
from time import sleep

def signed16(high, low):
    value = high * 256 + low
    if value >= 32768:
        value -= 65536
    return value

def read_axes(bus, register, scale):
    data = bus.read_i2c_block_data(0x68, register, 6)
    return [signed16(data[i], data[i + 1]) / scale
            for i in (0, 2, 4)]

with SMBus(1) as bus:
    bus.write_byte_data(0x68, 0x6B, 0)  # スリープ解除
    bus.write_byte_data(0x68, 0x1C, 0)  # ±2 g
    bus.write_byte_data(0x68, 0x1B, 0)  # ±250 °/s
    sleep(0.1)
    while True:
        ax, ay, az = read_axes(bus, 0x3B, 16384.0)
        gx, gy, gz = read_axes(bus, 0x43, 131.0)
        print(f"加速度 g: X={ax:.2f} Y={ay:.2f} Z={az:.2f}")
        print(f"角速度 °/s: X={gx:.1f} Y={gy:.1f} Z={gz:.1f}")
        sleep(0.5)
`,
 notes:[...commonI2CNotes,'加速度は0x3Bから6バイト、角速度は0x43から6バイトです。各軸の上位・下位を結合し、符号付き16ビット値に戻します。','この設定では加速度を16384で割るとg、角速度を131で割ると°/sです。測定範囲を変更したら換算係数も変更します。','角速度は回転の速さで、向きの角度ではありません。90 °/sは1秒で90度回る速さです。静止すると角速度はおおむね0に戻ります。','アドレスはAD0がLowで0x68、Highで0x69です。スライダーは各軸の測定値を独立に指定するため、剛体の運動そのものは再現しません。'],
 sources:[{title:'Adafruit MPU6050ドライバのレジスタ定義',url:'https://github.com/adafruit/Adafruit_CircuitPython_MPU6050/blob/main/adafruit_mpu6050.py'},{title:'Adafruit MPU6050の加速度・角速度換算',url:'https://github.com/adafruit/Adafruit_MPU6050/blob/master/Adafruit_MPU6050.cpp'},{title:'TDK MPU6050の電源と測定範囲',url:'https://product.tdk.com/en/search/sensor/mortion-inertial/imu/info?part_no=MPU-6050'}],
 observation:'加速度X・Zと角速度Zを変え、gと°/sの出力が別々に追従することを確認する。'})
];
