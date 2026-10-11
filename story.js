import {WaterTravel,HeightField,makeReflectionPixels,refractPixels} from './heightfield-water.js';
import {clamp,ease,storyState} from './story-state.js';
const root=document.documentElement,stage=document.querySelector('#stage'),water=document.querySelector('#water'),ctx=water.getContext('2d');
const maskCanvas=document.createElement('canvas'),maskCtx=maskCanvas.getContext('2d',{willReadFrequently:true});const travel=new WaterTravel();let field,sourcePixels,outputImage,lastWaterTime=0,lastWaterSource=null,lastWaterCenter=null;
// Browser-native post-process samples the existing fish pixels, not its mesh.
// Small displacement at the fins; head attenuation prevents face distortion.
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';svg.innerHTML='<defs><filter id="koi-water-refraction" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage result="surface-normal" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="surface-normal" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';document.body.append(svg);const normalImage=svg.querySelector('feImage'),normalCanvas=document.createElement('canvas'),normalCtx=normalCanvas.getContext('2d');let normalPixels;
const notes=[...document.querySelectorAll('[data-beat]')],titles=[...document.querySelectorAll('.chapter-title')];
const notesDialog=document.querySelector('#field-notes');
document.querySelectorAll('[data-notes]').forEach(button=>button.addEventListener('click',()=>{notesDialog.querySelectorAll('section').forEach(s=>s.hidden=s.id!=='notes-'+button.dataset.notes);notesDialog.showModal();}));
document.querySelector('#field-close').addEventListener('click',()=>notesDialog.close());
notesDialog.addEventListener('click',event=>{if(event.target===notesDialog){const b=notesDialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)notesDialog.close();}});
document.querySelector('#story-restart').addEventListener('click',()=>window.scrollTo({top:0,behavior:root.classList.contains('is-reduced')?'instant':'smooth'}));
let width=0,height=0,scale=1,clock=0,last=0,lastDraw=-1,lastP=-1,lastReduced=null,raf=0;
function resize(){width=innerWidth;height=innerHeight;scale=Math.min(1,560/Math.max(width,height));water.width=Math.max(2,Math.round(width*scale));water.height=Math.max(2,Math.round(height*scale));const gridScale=224/Math.max(width,height);maskCanvas.width=Math.max(32,Math.round(width*gridScale));maskCanvas.height=Math.max(32,Math.round(height*gridScale));field=new HeightField(maskCanvas.width,maskCanvas.height);travel.seed(null);travel.amount=0;sourcePixels=makeReflectionPixels(water.width,water.height);outputImage=ctx.createImageData(water.width,water.height);normalCanvas.width=128;normalCanvas.height=96;normalPixels=normalCtx.createImageData(128,96);lastWaterSource=null;lastWaterCenter=null;lastWaterTime=clock;lastDraw=-1;request();}
function paintType(p,reduced){
 const s=storyState(p);root.style.setProperty('--story-p',p.toFixed(4));
 notes.forEach(note=>{let a=s[note.dataset.beat];const mobile=innerWidth<=640;if(mobile&&note.classList.contains('diet-note'))a*=ease((p-.46)/.05);const lift=mobile&&note.classList.contains('movement-note')?-(1-ease((p-.44)/.07))*stage.getBoundingClientRect().height*.43:0;note.style.opacity=a.toFixed(4);note.style.transform=reduced?'none':`translate3d(${(1-a)*(note.classList.contains('diet-note')?65:-24)}px,${(1-a)*44+lift}px,0)`;const visible=a>.08;note.classList.toggle('is-visible',visible);note.inert=!visible;note.setAttribute('aria-hidden',String(!visible));note.querySelectorAll('.draw-line').forEach(path=>path.style.strokeDashoffset=String(450*(1-a)));note.querySelectorAll('.diet-word').forEach((word,i)=>word.style.transform=reduced?'none':`translateX(${(1-a)*(i+1)*35}px)`);});
 titles.forEach((title,i)=>{const a=s['title'+i];title.style.opacity=String(a*(1-.85*(i===0?s.habitat:i===1?s.movement:Math.max(s.life,s.birth))));title.querySelectorAll(':scope > span').forEach((line,j)=>{const entry=i===0?ease((p-.16)/.13):i===1?1-ease((p-.245)/.09):1-ease((p-.605)/.09);const exit=i===0?0:i===1?ease((p-.555)/.085):ease((p-.9)/.055);const x=(i===0?-entry:entry-exit)*(j===0?-1:1)*width*.48;line.style.transform=reduced?'none':`translate3d(${x}px,${i===1?(1-a)*(j?25:-25):0}px,0)`;line.style.clipPath=reduced?'none':`inset(0 0 ${i===1?(1-a)*100:0}% 0)`;});});
}
function drawWater(seconds,reduced){
 const started=performance.now(),fish=document.querySelector('#fish'),encounter=document.querySelector('#encounter'),spatial=Number(fish.style.opacity)===0,source=spatial?encounter:fish,b=stage.getBoundingClientRect();
 const contour=(source.waterContour||[]).map(p=>({x:p.x+b.left,y:p.y+b.top})),gs=maskCanvas.width/width;
 const dt=Math.max(0,seconds-lastWaterTime);lastWaterTime=seconds;
 if(reduced){travel.seed(null);travel.amount=0;field.reset();lastWaterSource=null;lastWaterCenter=null;}else if(dt>0&&contour.length>3){
  const center=contour.reduce((a,p)=>({x:a.x+p.x/contour.length,y:a.y+p.y/contour.length}),{x:0,y:0});
  if(lastWaterSource!==source||lastWaterCenter&&Math.hypot(center.x-lastWaterCenter.x,center.y-lastWaterCenter.y)>Math.max(width,height)*.3){field.initialized=false;field.lastTail=null;travel.seed(source.waterTranslation);}
  field.waveCoefficient=travel.coefficient;travel.update(source.waterTranslation,dt,Math.max(width,height));
  lastWaterSource=source;lastWaterCenter=center;
  maskCtx.clearRect(0,0,maskCanvas.width,maskCanvas.height);maskCtx.save();maskCtx.filter='blur(1.5px)';maskCtx.fillStyle='white';maskCtx.beginPath();contour.forEach((p,i)=>i?maskCtx.lineTo(p.x*gs,p.y*maskCanvas.height/height):maskCtx.moveTo(p.x*gs,p.y*maskCanvas.height/height));maskCtx.closePath();maskCtx.fill();maskCtx.restore();
  const data=maskCtx.getImageData(0,0,maskCanvas.width,maskCanvas.height).data,mask=field.mask;for(let i=0;i<mask.length;i++)mask[i]=data[i*4+3]/255;
  const tail=source.waterTail?{x:(source.waterTail.x+b.left)*gs,y:(source.waterTail.y+b.top)*maskCanvas.height/height}:null;
  const depth=spatial?Math.abs(Number(encounter.dataset.headPitch)||0):0,exposure=.25+.75*Math.max(0,1-depth/75);
  const head=source.waterHead?{x:(source.waterHead.x+b.left)*gs,y:(source.waterHead.y+b.top)*maskCanvas.height/height}:null,dx=head&&tail?head.x-tail.x:0,dy=head&&tail?head.y-tail.y:0,length=Math.hypot(dx,dy)||1;
  // The koi swims against the selected current even while its screen center holds.
  // Shift the previous displaced volume relative to that flow, not the artwork.
  const current=Number(fish.dataset.current)||1,flow={x:dx/length*dt*3.2*current,y:dy/length*dt*3.2*current};
  field.drive(mask,tail,exposure,flow,dt);
 }
 if(!reduced&&dt>0){field.advance(dt);if(contour.length<4){field.initialized=false;field.lastTail=null;lastWaterSource=null;lastWaterCenter=null;}}
 water.dataset.travelSpeed=travel.speed.toFixed(4);water.dataset.waveCoefficient=field.waveCoefficient.toFixed(4);
 const stats=refractPixels(field,sourcePixels,outputImage.data,water.width,water.height);
 ctx.putImageData(outputImage,0,0);
 const opticsStarted=performance.now(),head=source.waterHead,headX=head?.x||b.width*.8,headY=head?.y||b.height*.3;
 for(let y=0;y<96;y++)for(let x=0;x<128;x++){
  const px=x/127*b.width,py=y/95*b.height,gx=Math.max(1,Math.min(field.width-2,Math.round((px+b.left)/width*(field.width-1)))),gy=Math.max(1,Math.min(field.height-2,Math.round((py+b.top)/height*(field.height-1)))),k=gy*field.width+gx,i=(y*128+x)*4;
  const headDistance=Math.hypot(px-headX,py-headY),protect=Math.min(1,Math.max(0,(headDistance-80)/80));
  normalPixels.data[i]=128+field.normalX[k]*5.5*protect;normalPixels.data[i+1]=128+field.normalY[k]*5.5*protect;normalPixels.data[i+2]=128;normalPixels.data[i+3]=255;
 }
 normalCtx.putImageData(normalPixels,0,0);normalImage.setAttribute('href',normalCanvas.toDataURL());root.classList.toggle('water-optics-ready',!reduced);water.dataset.opticsMS=(performance.now()-opticsStarted).toFixed(2);

 water.dataset.build='heightfield-1';water.dataset.time=seconds.toFixed(3);water.dataset.grid=`${field.width}x${field.height}`;water.dataset.energy=field.energy().toFixed(5);water.dataset.steps=String(field.steps);water.dataset.displacement=stats.maxDisplacement.toFixed(3);water.dataset.affectedPixels=String(stats.affected);water.dataset.renderMS=(performance.now()-started).toFixed(2);water.dataset.anchors=String(contour.length);water.dataset.readback='local-pressure-mask-only';
}
function request(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;const fish=document.querySelector('#fish'),reduced=root.classList.contains('is-reduced'),playing=fish?.dataset.playing==='true'&&!reduced;const p=Number(stage.dataset.progress)||0;
 const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing)clock+=dt;
 if(p!==lastP||reduced!==lastReduced){paintType(p,reduced);lastP=p;lastReduced=reduced;lastDraw=-1;}
 if(lastDraw<0||(playing&&now-lastDraw>45)){drawWater(clock,reduced);lastDraw=now;}
 root.classList.toggle('motion-held',!playing);if(playing)request();else last=0;
}
new MutationObserver(request).observe(stage,{subtree:true,attributes:true,attributeFilter:['data-playing','data-progress','data-reduced-motion'],childList:true});
new MutationObserver(request).observe(root,{attributes:true,attributeFilter:['class']});
addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{last=0;request();});resize();
