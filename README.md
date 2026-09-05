# Pi Lab

答えを見ながら配線・Python・部品の動きを試せる、Raspberry Pi学習プラットフォーム。
旧版を置き換えた v2 です。教材本編は未投入で、操作確認用のLED点滅サンプル1件だけを収録しています。

## できること

- 40ピンGPIOを持つ Raspberry Pi 4 Model B の作業台
- LED、抵抗、4端子ボタン、ブザーの追加・移動・削除
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

Raspberry Pi OS、CPU、メモリ、USB、無線、任意のPythonパッケージをエミュレートするものではありません。Skulptが対応するPython 3構文と、上記GPIO APIを実行します。GPIOの論理状態と回路のつながりを学ぶためのモデルで、SPICEのような精密な電流・電圧計算ではありません。

ボタンは内部プルアップを使いGPIOとGNDにつなぐ構成に対応します。Pico / Pico 2のピン配置やMicroPython `machine` は、この版の対象外です。基板定義・Pythonアダプタは別ファイルなので、今後の教材に合わせて追加できます。

## 画像

基板は依頼に基づく生成画像です。画像自体を正確な端子図として使わず、GPIOヘッダ部分を40ピンのデータ表示で置き換えています。
電子部品はMITライセンスの [Wokwi Elements](https://github.com/wokwi/wokwi-elements) 由来です。出典とライセンスは `dist/assets/ATTRIBUTION.md` および同フォルダのライセンスファイルを参照してください。

## 検証

`node tests/circuit.test.mjs` と `node tests/runtime.test.mjs` で回路判定と実際のPython実行を検証できます。UIのブラウザ操作テストは未実施です。

## 参照資料

- https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio
- https://gpiozero.readthedocs.io/en/stable/recipes.html
- https://skulpt.org/using.html

ユーザー作品。Raspberry Pi公式サイトではありません。
