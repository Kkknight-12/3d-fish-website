import {clamp,ease,storyState} from './story-state.js';
const root=document.documentElement,stage=document.querySelector('#stage'),water=document.querySelector('#water'),ctx=water.getContext('2d');
const notes=[...document.querySelectorAll('[data-beat]')],titles=[...document.querySelectorAll('.chapter-title')];
const field=document.querySelector('#field-notes');
document.querySelectorAll('[data-notes]').forEach(button=>button.addEventListener('click',()=>{field.querySelectorAll('section').forEach(s=>s.hidden=s.id!=='notes-'+button.dataset.notes);field.showModal();}));
document.querySelector('#field-close').addEventListener('click',()=>field.close());
field.addEventListener('click',event=>{if(event.target===field){const b=field.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)field.close();}});
document.querySelector('#story-restart').addEventListener('click',()=>window.scrollTo({top:0,behavior:root.classList.contains('is-reduced')?'instant':'smooth'}));
let width=0,height=0,scale=1,clock=0,last=0,lastDraw=-1,lastP=-1,lastReduced=null,rings=[],spawnAt=-10,raf=0;
function resize(){width=innerWidth;height=innerHeight;scale=Math.min(1,1100/width);water.width=Math.round(width*scale);water.height=Math.round(height*scale);lastDraw=-1;request();}
function paintType(p,reduced){
 const s=storyState(p);root.style.setProperty('--story-p',p.toFixed(4));
 notes.forEach(note=>{let a=s[note.dataset.beat];const mobile=innerWidth<=640;if(mobile&&note.classList.contains('diet-note'))a*=ease((p-.46)/.05);const lift=mobile&&note.classList.contains('movement-note')?-(1-ease((p-.44)/.07))*stage.getBoundingClientRect().height*.43:0;note.style.opacity=a.toFixed(4);note.style.transform=reduced?'none':`translate3d(${(1-a)*(note.classList.contains('diet-note')?65:-24)}px,${(1-a)*44+lift}px,0)`;const visible=a>.08;note.classList.toggle('is-visible',visible);note.inert=!visible;note.setAttribute('aria-hidden',String(!visible));note.querySelectorAll('.draw-line').forEach(path=>path.style.strokeDashoffset=String(450*(1-a)));note.querySelectorAll('.diet-word').forEach((word,i)=>word.style.transform=reduced?'none':`translateX(${(1-a)*(i+1)*35}px)`);});
 titles.forEach((title,i)=>{const a=s['title'+i];title.style.opacity=String(a*(1-.85*(i===0?s.habitat:i===1?s.movement:Math.max(s.life,s.birth))));title.querySelectorAll(':scope > span').forEach((line,j)=>{const entry=i===0?ease((p-.16)/.13):i===1?1-ease((p-.245)/.09):1-ease((p-.605)/.09);const exit=i===0?0:i===1?ease((p-.555)/.085):ease((p-.9)/.055);const x=(i===0?-entry:entry-exit)*(j===0?-1:1)*width*.48;line.style.transform=reduced?'none':`translate3d(${x}px,${i===1?(1-a)*(j?25:-25):0}px,0)`;line.style.clipPath=reduced?'none':`inset(0 0 ${i===1?(1-a)*100:0}% 0)`;});});
}
function fishCenter(){const fish=document.querySelector('#fish'),encounter=document.querySelector('#encounter'),b=stage.getBoundingClientRect();let x=Number(fish.dataset.centerX)||b.width*.57,y=b.height-(Number(fish.dataset.centerY)||b.height*.58);if(Number(fish.style.opacity)===0&&encounter.dataset.fittedBounds){try{const f=JSON.parse(encounter.dataset.fittedBounds);x=(f[0]+f[2])/2;y=(f[1]+f[3])/2;}catch{}}return{x:b.left+x,y:b.top+y};}
function drawWater(seconds,reduced){
 ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);
 // Broad moving light contours: intentionally visible on the red pond surface.
 const t=reduced?0:seconds;
 ctx.lineCap='round';
 for(let layer=0;layer<2;layer++)for(let j=-2;j<8;j++){
  ctx.beginPath();for(let k=0;k<=38;k++){const x=k/38*width,y=j*height/6+Math.sin(x/width*8+t*.32+j*.8+layer)*height*.075+Math.sin(x/width*19-t*.23+j)*height*.023+layer*height*.065;if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.strokeStyle=layer?'rgba(255,224,172,.09)':'rgba(255,242,207,.17)';ctx.lineWidth=layer?5:1.4;ctx.stroke();
 }
 const center=fishCenter();
 // Rings originate at the current projected fish position, leaving a short wake.
 if(!reduced&&seconds-spawnAt>.8){rings.push({x:center.x,y:center.y,born:seconds});spawnAt=seconds;}
 rings=rings.filter(r=>seconds-r.born<4.5);
 for(const r of reduced?[{...center,born:seconds-1.5}]:rings){const age=seconds-r.born,a=(1-age/4.5)*.55;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(-.25);ctx.beginPath();ctx.ellipse(0,0,50+age*48,18+age*22,0,0,Math.PI*2);ctx.strokeStyle=`rgba(255,242,207,${a})`;ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,56+age*48,21+age*22,0,.2,Math.PI*1.75);ctx.strokeStyle=`rgba(255,220,157,${a*.55})`;ctx.lineWidth=3;ctx.stroke();ctx.restore();}
 water.dataset.time=seconds.toFixed(3);water.dataset.rings=String(rings.length);
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
