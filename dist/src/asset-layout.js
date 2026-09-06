// Project full-image percentages into a centered CSS object-fit box.
// This keeps interactive terminals aligned when art and component ratios differ.
export function imagePoint(x,y,width,height,ratio=1,fit='contain'){
 const scale=(fit==='cover'?Math.max:Math.min)(width/ratio,height);
 const imageWidth=scale*ratio,imageHeight=scale;
 return {x:((width-imageWidth)/2+imageWidth*x/100)/width*100,y:((height-imageHeight)/2+imageHeight*y/100)/height*100};
}
