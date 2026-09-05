# Pi Lab

答えを見ながら配線・Python・部品の動きを試せる、Raspberry Pi学習プラットフォーム。
v3。指定された40題から20教材を収録しました。基本入出力、センサー、OLED、サーボ、I2C/SPI/UART、外付けADC、RTCを配線とコードで試せます。

## できること

- 40ピンGPIOを持つ Raspberry Pi 4 Model B の作業台
- LED、抵抗、RGB LED、ボタン、スイッチ、ブザー、可変抵抗、ADC、各種センサー、OLED、サーボ、外部電源、UART機器の追加・移動・削除
- 端子同士のタップ配線、端子名の選択による配線、接続一覧、削除、元に戻す
- ローカルのSkulpt Python実行環境とgpiozeroの学習用モデル。変数・条件分岐・ループ・sleepが実際に実行されます
- 実行中のGPIO出力に応じたLED点灯・PWMの明るさ、ボタン入力、ブザー音
- ショート、5VからGPIOへの接続、LEDの抵抗省略・抵抗の迂回経路の検出
- 答えの配線・コード、作業台への反映、配線と点灯のチェック
- コードと配線をこのブラウザのlocalStorageに保存。クラウド共有ではありません

## 構成

ビルド不要の静的サイトです。`dist/` をそのまま配信します。GitHub Pagesでmainのルートを配信する場合、ルートの `index.html` から `dist/` に移動します。

| ファイル | 役割 |
|---|---|
| `dist/src/content.js` | 教材、手順、初期配置、答え、達成条件 |
| `dist/src/boards.js` | 正確な物理番号・BCM番号・端子種別 |
| `dist/src/components.js` | 部品の画像、寸法、端子座標 |
| `dist/src/circuit.js` | 配線グラフ、電源・抵抗・スイッチ・出力の判定 |
| `dist/src/python-worker.js` | Pythonの別スレッド実行と停止 |
| `dist/src/gpio-modules.js` | Python用gpiozero・time・signalの学習用モデル |
| `dist/src/app.js` | 操作、表示、ローカル保存 |

教材の追加は [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) を参照してください。
実行APIと制限は [docs/PYTHON_RUNTIME.md](docs/PYTHON_RUNTIME.md) を参照してください。

## シミュレーションの範囲

Raspberry Pi OS、CPU、メモリ、USB、無線、任意のPythonパッケージをエミュレートするものではありません。Skulptが対応するPython 3構文と、上記GPIO APIと教材用に限定したI2C・SPI・UART・センサードライバーのAPIを実行します。センサーの入力値はスライダー等で指定でき、実際に接続・給電された仮想機器だけがPythonから読み取れます。OLEDはピクセル表示、サーボは正規化位置を表示します。GPIOの論理状態と回路のつながりを学ぶためのモデルで、SPICEのような精密な電流・電圧計算ではありません。

ボタンは内部プルアップを使いGPIOとGNDにつなぐ構成に対応します。Pico / Pico 2のピン配置やMicroPython `machine` は、この版の対象外です。基板定義・Pythonアダプタは別ファイルなので、今後の教材に合わせて追加できます。

## 画像

基板は依頼に基づく生成画像です。画像自体を正確な端子図として使わず、GPIOヘッダ部分を40ピンのデータ表示で置き換えています。
電子部品はMITライセンスの [Wokwi Elements](https://github.com/wokwi/wokwi-elements) 由来です。出典とライセンスは `dist/assets/ATTRIBUTION.md` および同フォルダのライセンスファイルを参照してください。

## 検証

`node tests/circuit.test.mjs`、`node tests/runtime.test.mjs`、`node tests/lessons.test.mjs` で回路判定と実際のPython実行を検証できます。UIのブラウザ操作テストは未実施です。

## 参照資料

- https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio
- https://gpiozero.readthedocs.io/en/stable/recipes.html
- https://skulpt.org/using.html

ユーザー作品。Raspberry Pi公式サイトではありません。

## v3 教材一覧

| 番号 | 教材 |
|---|---|
| 01 | 単色LEDを光らせる |
| 02 | RGB LEDを光らせる |
| 03 | 押しボタンを読み取る |
| 04 | スイッチを読み取る |
| 05 | ブザーを鳴らす |
| 06 | PWMでLEDの明るさを変える |
| 07 | 可変抵抗をADC経由で読み取る |
| 08 | 温湿度センサーをつなぐ |
| 09 | 気圧センサーをつなぐ |
| 10 | 明るさ・照度センサーをつなぐ |
| 12 | ToF距離センサーをつなぐ |
| 13 | PIR人感センサーをつなぐ |
| 14 | IMU（加速度・ジャイロ）をつなぐ |
| 18 | OLEDディスプレイをつなぐ |
| 28 | サーボモーターを動かす |
| 32 | I2C機器をつなぐ |
| 33 | SPI機器をつなぐ |
| 34 | UART機器をつなぐ |
| 37 | 外付けADCをつなぐ |
| 40 | RTCをつなぐ |

未選択の20題は未収録です。Pico 2、Raspberry Pi OS全体、物理的な電圧・電流の精密再現は対象外です。部品によっては端子模式図を使い、実物の端子順を保証しません。
