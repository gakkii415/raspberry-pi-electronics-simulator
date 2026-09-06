// Keep the world point beneath the fingers fixed as pinch scale and center change.
export function anchoredScroll(scroll, oldCenter, newCenter, ratio){
 return (scroll+oldCenter)*ratio-newCenter;
}
export function attachViewportGestures(viewport,getZoom,setZoom,onPinch){
 const pointers=new Map();let previous=null,suppressUntil=0,frame=0,pending=null;
 const point=e=>{const r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const pair=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};};
 const flush=()=>{frame=0;if(!pending)return;const {scale,left,top}=pending;pending=null;setZoom(scale);viewport.scrollLeft=left;viewport.scrollTop=top;};
 viewport.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  pointers.set(e.pointerId,point(e));
  if(pointers.size===2){if(pending)flush();previous=pair();onPinch();suppressUntil=Date.now()+350;e.preventDefault();}
  if(!e.target.closest('button,[data-wire]'))viewport.setPointerCapture(e.pointerId);
 },{capture:true});
 viewport.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),p=point(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2){
   e.preventDefault();const now=pair();if(!previous){previous=now;return;}
   const oldScale=pending?.scale??getZoom(),scale=Math.max(.25,Math.min(6,oldScale*now.d/previous.d)),ratio=scale/oldScale;
   pending={scale,left:anchoredScroll(pending?.left??viewport.scrollLeft,previous.x,now.x,ratio),top:anchoredScroll(pending?.top??viewport.scrollTop,previous.y,now.y,ratio)};
   previous=now;suppressUntil=Date.now()+350;if(!frame)frame=requestAnimationFrame(flush);
  }else if(!e.target.closest('button,[data-wire]')){
   if(Math.hypot(p.x-old.x,p.y-old.y)>1){viewport.scrollLeft-=p.x-old.x;viewport.scrollTop-=p.y-old.y;suppressUntil=Date.now()+350;}
  }
 },{capture:true});
 const release=e=>{pointers.delete(e.pointerId);if(pointers.size<2){if(pending)flush();previous=null;}};
 window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',()=>{pointers.clear();previous=null;});
 viewport.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 viewport.addEventListener('wheel',e=>{
  if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();if(pending)flush();const p=point(e),old=getZoom(),next=Math.max(.25,Math.min(6,old*Math.exp(-e.deltaY*.01))),left=anchoredScroll(viewport.scrollLeft,p.x,p.x,next/old),top=anchoredScroll(viewport.scrollTop,p.y,p.y,next/old);setZoom(next);viewport.scrollLeft=left;viewport.scrollTop=top;
 },{passive:false});
 return {isPinching:()=>pointers.size>=2};
}
