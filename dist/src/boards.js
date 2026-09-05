// GPIO header data is independent from the generated cosmetic board image.
// https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio
const signals=['3V3','5V',2,'5V',3,'GND',4,14,'GND',15,17,18,27,'GND',22,23,'3V3',24,10,'GND',9,25,11,8,'GND',7,0,1,5,'GND',6,12,13,'GND',19,16,26,20,'GND',21];
export const board={id:'raspberry-pi-4',name:'Raspberry Pi 4 Model B',image:'./assets/raspberry-pi-4.webp',pins:signals.map((signal,i)=>({physical:i+1,id:`pi:${i+1}`,bcm:typeof signal==='number'?signal:null,type:typeof signal==='number'?'gpio':signal==='GND'?'ground':'power',label:typeof signal==='number'?`GPIO ${signal}`:signal}))};
export const getPin=id=>board.pins.find(p=>p.id===id);
export const physicalFor=bcm=>board.pins.find(p=>p.bcm===bcm)?.physical;
