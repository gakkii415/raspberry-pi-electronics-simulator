# Pi Lab added component assets

Source: https://github.com/wokwi/wokwi-elements (MIT, Copyright 2020 Uri Shaked). Full license in WOKWI-LICENSE.txt; retain it with distribution.

SVGs were extracted from source templates, with interactive bindings removed and neutral static values substituted. RGB common terminal is exposed as K. Servo horn is fixed at neutral. No remote resources are needed.

The potentiometer source additionally credits https://freesvg.org/potentiometer for its SVG art; preserve this credit.

Exact source files and fidelity limitations are recorded per component in definitions.js. MPU6050 is a model illustration. RGB, pot, PIR, switch and servo are component illustrations. Slide-switch third terminal is unused. DHT22, BMP280, BH1750, VL53L0X, MCP3008, OLED, ADS1115 and DS3231 use visibly labeled generic terminal diagrams because a matching module illustration is unavailable in the supplied source. These diagrams reuse Wokwi servo socket geometry. They do not claim to show physical package pin order. DHT22 bare 4-pin and SSD1306 8-pin illustrations were deliberately not substituted for the requested modules.

Supply and UART use functional schematic panels. Always expose assetNote (e.g. as help text), and show the model name. Never label generic diagrams as exact component pictures.
