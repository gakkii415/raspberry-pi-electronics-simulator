# Raspberry Pi 電子工作シミュレータ

ターミナルや電子工作に触れたことがない人向けの、日本語ハンズオン型Webシミュレータです。

## 学べること

1. LEDを光らせる
2. ボタンの入力を読む
3. ボタンでLEDを操作する
4. PWMでLEDの明るさを変える
5. 3色の信号機を作る
6. ボタン式アラームを作る
7. DS18B20温度センサーを読む

各レッスンは「配線する → 動かす → 実機で作る」の3工程です。40ピンGPIO上で物理番号とBCM番号を確認しながら配線し、動作とGPIO信号を同時に観察できます。理解チェック、実機用Pythonコード、初心者向けターミナル練習、トラブルシューティングも含みます。配線状況と進捗はブラウザ内に保存されます。

## 設計時に参照したサイト

- [Physical Computing with Python](https://projects.raspberrypi.org/en/projects/physical-computing) — LEDから入力・センサーへ進む段階学習
- [Raspberry Pi hardware documentation](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html) — 40ピンGPIOと3.3V入出力の仕様
- [GPIO Zero Basic Recipes](https://gpiozero.readthedocs.io/en/stable/recipes.html) — LED、Button、PWM、複数出力のコードと用語
- [Wokwi](https://docs.wokwi.com/) — 仮想回路で失敗しながら試せる即時フィードバック

見た目や文章を複製せず、それぞれの学習設計上の長所だけを取り入れています。

## 注意

このWebアプリの動作は概念学習のためのシミュレーションです。40ピン表示は端子の特定を助けますが、ブレッドボード上の実寸配置までは再現していません。実機では部品のデータシートとRaspberry Pi公式資料も確認し、配線変更前に必ず電源を切ってください。
