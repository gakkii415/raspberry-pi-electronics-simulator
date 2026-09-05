// Pins x/y are percentages of the full SVG box.
export const newDefinitions={
  "rgb": {
    "name": "RGB LED",
    "title": "RGB LED",
    "asset": "rgb.svg",
    "width": 65,
    "height": 112,
    "pins": [
      {
        "name": "R",
        "label": "R",
        "x": 20.18,
        "y": 60.62,
        "title": "R · 赤アノード"
      },
      {
        "name": "K",
        "label": "K",
        "x": 42.73,
        "y": 74.4,
        "title": "K · 共通カソード"
      },
      {
        "name": "G",
        "label": "G",
        "x": 62.67,
        "y": 60.62,
        "title": "G · 緑アノード"
      },
      {
        "name": "B",
        "label": "B",
        "x": 84.74,
        "y": 60.62,
        "title": "B · 青アノード"
      }
    ],
    "assetKind": "illustration",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/rgb-led-element.ts",
    "license": "MIT",
    "assetNote": "Wokwi RGB LED; common terminal mapped to common cathode K."
  },
  "pot": {
    "name": "可変抵抗",
    "title": "可変抵抗",
    "asset": "pot.svg",
    "width": 90,
    "height": 90,
    "pins": [
      {
        "name": "GND",
        "label": "GND",
        "x": 38.365,
        "y": 90.622,
        "title": "GND · 端子1"
      },
      {
        "name": "SIG",
        "label": "SIG",
        "x": 51.594,
        "y": 90.622,
        "title": "SIG · ワイパー"
      },
      {
        "name": "VCC",
        "label": "VCC",
        "x": 64.823,
        "y": 90.622,
        "title": "VCC · 3.3V"
      }
    ],
    "assetKind": "illustration",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/potentiometer-element.ts",
    "license": "MIT",
    "assetNote": "Wokwi potentiometer; upstream art credits FreeSVG potentiometer."
  },
  "switch": {
    "name": "スイッチ",
    "title": "スイッチ",
    "asset": "switch.svg",
    "width": 65,
    "height": 70.58,
    "pins": [
      {
        "name": "1",
        "label": "1",
        "x": 20.233,
        "y": 97.47,
        "title": "端子1"
      },
      {
        "name": "2",
        "label": "2",
        "x": 49.804,
        "y": 97.47,
        "title": "端子2 · 共通"
      }
    ],
    "assetKind": "illustration",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/slide-switch-element.ts",
    "license": "MIT",
    "assetNote": "SPDT slide switch used as SPST; third physical terminal is unused."
  },
  "mpu6050": {
    "name": "MPU6050",
    "title": "MPU6050",
    "asset": "mpu6050.svg",
    "width": 125,
    "height": 93.75,
    "pins": [
      {
        "name": "SDA",
        "label": "SDA",
        "x": 55.882,
        "y": 9.444,
        "title": "SDA · I²Cデータ"
      },
      {
        "name": "SCL",
        "label": "SCL",
        "x": 67.647,
        "y": 9.444,
        "title": "SCL · I²Cクロック"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 79.412,
        "y": 9.444,
        "title": "GND"
      },
      {
        "name": "VCC",
        "label": "VCC",
        "x": 91.176,
        "y": 9.444,
        "title": "VCC · 3.3V"
      }
    ],
    "assetKind": "model-illustration",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/mpu6050-element.ts",
    "license": "MIT",
    "assetNote": "Wokwi MPU6050 module. Auxiliary pins remain visible but are not used by lessons."
  },
  "pir": {
    "name": "PIR 人感センサー",
    "title": "PIR 人感センサー",
    "asset": "pir.svg",
    "width": 100,
    "height": 101.87,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 39.888,
        "y": 99.567,
        "title": "VCC · 5V"
      },
      {
        "name": "OUT",
        "label": "OUT",
        "x": 50.626,
        "y": 99.567,
        "title": "OUT · 3.3V信号"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 61.347,
        "y": 99.567,
        "title": "GND"
      }
    ],
    "assetKind": "illustration",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/pir-motion-sensor-element.ts",
    "license": "MIT",
    "assetNote": "Wokwi PIR motion sensor illustration, representative of HC-SR501-style module."
  },
  "servo": {
    "name": "サーボ",
    "title": "サーボ",
    "asset": "servo.svg",
    "width": 145,
    "height": 101.92,
    "pins": [
      {
        "name": "GND",
        "label": "GND",
        "x": 0,
        "y": 41.824,
        "title": "GND · 外部電源と共通"
      },
      {
        "name": "VCC",
        "label": "VCC",
        "x": 0,
        "y": 49.77,
        "title": "VCC · 外部5V"
      },
      {
        "name": "SIG",
        "label": "SIG",
        "x": 0,
        "y": 57.716,
        "title": "SIG · PWM"
      }
    ],
    "assetKind": "illustration",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Wokwi generic hobby servo, no exact make/model claimed."
  },
  "mcp3008": {
    "name": "MCP3008",
    "title": "MCP3008",
    "asset": "mcp3008.svg",
    "width": 170,
    "height": 171,
    "pins": [
      {
        "name": "VDD",
        "label": "VDD",
        "x": 1.765,
        "y": 15.205,
        "title": "VDD · 3.3V"
      },
      {
        "name": "VREF",
        "label": "VREF",
        "x": 1.765,
        "y": 23.977,
        "title": "VREF · 3.3V基準電圧"
      },
      {
        "name": "AGND",
        "label": "AGND",
        "x": 1.765,
        "y": 32.749,
        "title": "AGND · アナログGND"
      },
      {
        "name": "DGND",
        "label": "DGND",
        "x": 1.765,
        "y": 41.52,
        "title": "DGND · デジタルGND"
      },
      {
        "name": "CLK",
        "label": "CLK",
        "x": 1.765,
        "y": 50.292,
        "title": "CLK · SPIクロック"
      },
      {
        "name": "DOUT",
        "label": "DOUT",
        "x": 1.765,
        "y": 59.064,
        "title": "DOUT · Pi MISOへ"
      },
      {
        "name": "DIN",
        "label": "DIN",
        "x": 1.765,
        "y": 67.836,
        "title": "DIN · Pi MOSIから"
      },
      {
        "name": "CS",
        "label": "CS",
        "x": 1.765,
        "y": 76.608,
        "title": "CS · SPI CE0へ"
      },
      {
        "name": "CH0",
        "label": "CH0",
        "x": 1.765,
        "y": 85.38,
        "title": "CH0 · アナログ入力0"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. ADC · DIP pin subset"
  },
  "dht22": {
    "name": "DHT22 MODULE",
    "title": "DHT22 MODULE",
    "asset": "dht22.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 26.0,
        "title": "VCC · 3.3V"
      },
      {
        "name": "DATA",
        "label": "DATA",
        "x": 1.765,
        "y": 41.0,
        "title": "DATA · プルアップ付き"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 56.0,
        "title": "GND · 共通グランド"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. MODULE + PULL-UP"
  },
  "bmp280": {
    "name": "BMP280",
    "title": "BMP280",
    "asset": "bmp280.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 26.0,
        "title": "VCC · 3.3V"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 41.0,
        "title": "GND · 共通グランド"
      },
      {
        "name": "SDA",
        "label": "SDA",
        "x": 1.765,
        "y": 56.0,
        "title": "SDA · I²Cデータ"
      },
      {
        "name": "SCL",
        "label": "SCL",
        "x": 1.765,
        "y": 71.0,
        "title": "SCL · I²Cクロック"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. I2C · 0x76"
  },
  "bh1750": {
    "name": "BH1750",
    "title": "BH1750",
    "asset": "bh1750.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 26.0,
        "title": "VCC · 3.3V"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 41.0,
        "title": "GND · 共通グランド"
      },
      {
        "name": "SDA",
        "label": "SDA",
        "x": 1.765,
        "y": 56.0,
        "title": "SDA · I²Cデータ"
      },
      {
        "name": "SCL",
        "label": "SCL",
        "x": 1.765,
        "y": 71.0,
        "title": "SCL · I²Cクロック"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. I2C · 0x23"
  },
  "vl53l0x": {
    "name": "VL53L0X",
    "title": "VL53L0X",
    "asset": "vl53l0x.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 26.0,
        "title": "VCC · 3.3V"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 41.0,
        "title": "GND · 共通グランド"
      },
      {
        "name": "SDA",
        "label": "SDA",
        "x": 1.765,
        "y": 56.0,
        "title": "SDA · I²Cデータ"
      },
      {
        "name": "SCL",
        "label": "SCL",
        "x": 1.765,
        "y": 71.0,
        "title": "SCL · I²Cクロック"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. I2C · 0x29"
  },
  "oled": {
    "name": "SSD1306 OLED",
    "title": "SSD1306 OLED",
    "asset": "oled.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 26.0,
        "title": "VCC · 3.3V"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 41.0,
        "title": "GND · 共通グランド"
      },
      {
        "name": "SDA",
        "label": "SDA",
        "x": 1.765,
        "y": 56.0,
        "title": "SDA · I²Cデータ"
      },
      {
        "name": "SCL",
        "label": "SCL",
        "x": 1.765,
        "y": 71.0,
        "title": "SCL · I²Cクロック"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. I2C · 0x3C · 128x64"
  },
  "ads1115": {
    "name": "ADS1115",
    "title": "ADS1115",
    "asset": "ads1115.svg",
    "width": 170,
    "height": 111,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 23.423,
        "title": "VCC · 3.3V"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 36.937,
        "title": "GND · 共通グランド"
      },
      {
        "name": "SDA",
        "label": "SDA",
        "x": 1.765,
        "y": 50.45,
        "title": "SDA · I²Cデータ"
      },
      {
        "name": "SCL",
        "label": "SCL",
        "x": 1.765,
        "y": 63.964,
        "title": "SCL · I²Cクロック"
      },
      {
        "name": "A0",
        "label": "A0",
        "x": 1.765,
        "y": 77.477,
        "title": "A0 · アナログ入力0"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. I2C · 0x48"
  },
  "rtc": {
    "name": "DS3231 RTC",
    "title": "DS3231 RTC",
    "asset": "rtc.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 26.0,
        "title": "VCC · 3.3V"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 41.0,
        "title": "GND · 共通グランド"
      },
      {
        "name": "SDA",
        "label": "SDA",
        "x": 1.765,
        "y": 56.0,
        "title": "SDA · I²Cデータ"
      },
      {
        "name": "SCL",
        "label": "SCL",
        "x": 1.765,
        "y": 71.0,
        "title": "SCL · I²Cクロック"
      }
    ],
    "assetKind": "generic-terminal-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. I2C · 0x68"
  },
  "supply": {
    "name": "5V SUPPLY",
    "title": "5V SUPPLY",
    "asset": "supply.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "+",
        "label": "+",
        "x": 1.765,
        "y": 26.0,
        "title": "＋ · 外部5V"
      },
      {
        "name": "-",
        "label": "-",
        "x": 1.765,
        "y": 41.0,
        "title": "− · Pi GNDと共通"
      }
    ],
    "assetKind": "functional-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. EXTERNAL · ISOLATED"
  },
  "uart": {
    "name": "3.3V UART",
    "title": "3.3V UART",
    "asset": "uart.svg",
    "width": 170,
    "height": 100,
    "pins": [
      {
        "name": "VCC",
        "label": "VCC",
        "x": 1.765,
        "y": 26.0,
        "title": "VCC · 3.3V"
      },
      {
        "name": "GND",
        "label": "GND",
        "x": 1.765,
        "y": 41.0,
        "title": "GND · 共通グランド"
      },
      {
        "name": "TX",
        "label": "TX",
        "x": 1.765,
        "y": 56.0,
        "title": "TX · 送信 → Pi RX"
      },
      {
        "name": "RX",
        "label": "RX",
        "x": 1.765,
        "y": 71.0,
        "title": "RX · 受信 ← Pi TX"
      }
    ],
    "assetKind": "functional-schematic",
    "source": "https://github.com/wokwi/wokwi-elements/blob/main/src/servo-element.ts",
    "license": "MIT",
    "assetNote": "Abstract labeled connector diagram; does not depict actual model geometry or physical pin ordering. Wokwi servo connector artwork reused; panel and labels added. TX → RX / RX → TX"
  }
};
