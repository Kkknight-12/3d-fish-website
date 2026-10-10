import { LOOP_SECONDS, TAU, makeGrid, startsPlaying } from './motion.js';
import { clamp, scrollProgress, followProgress, sampleJourney } from './scroll.js';
import { createTurn, stepTurn, turnSettled, spineColumns, degrees, preparePoint } from './spine.js';
import { silhouette } from './silhouette.js';
import { createCanvasRenderer, selectRenderer } from './canvas-renderer.js';
import {viewBeat,createChoreography,stepChoreography} from './view-beat.js';
import {createViewRenderer} from './view-renderer.js';

let canvas=document.querySelector('#fish');
const fallback=document.querySelector('#fish-fallback');
const stage=document.querySelector('#stage'),journey=document.querySelector('#journey'),poster=document.querySelector('.poster');
const pauseButton=document.querySelector('#pause'),status=document.querySelector('#motion-status'),liveDot=document.querySelector('#live-dot');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),reduceToggle=document.querySelector('#reduce-motion');
const dialog=document.querySelector('#about'),chapters=[...document.querySelectorAll('.chapter')];
const encounterCanvas=document.querySelector('#encounter');
let viewRenderer=null,beat=viewBeat(0),lastOpacity=-1;
let choreography=createChoreography(),paintedMotion=-1;
const chapterButtons=[...document.querySelectorAll('[data-chapter-target]')];
let manualReduced=null;
try{const saved=sessionStorage.getItem('koi-reduce-motion');if(saved!==null)manualReduced=saved==='true';}catch{}
let reduced=manualReduced??reducedMotion.matches,playing=startsPlaying(reduced),failed=false;
let current=1,elapsed=0,previous=0,raf=0,renderer=null,artwork=null,frame=0;
let pointerX=0,pointerY=0,tiltX=0,tiltY=0,targetProgress=0,visibleProgress=0,scrollStart=0,scrollTravel=0;
let stageWidth=0,stageHeight=0,scene=sampleJourney(0),lastChapter=-1;
let measuredViewportWidth=0,measuredViewportHeight=0;
let scrollDirty=false,sceneVersion=0,paintedProgress=-1,turnReady=false,layoutCache=null,lastRecord=0;
let turn=createTurn(scene.angle);
const fullSpine=new Float32Array(73*4);let spineVersion=-1;
const chapterParts=chapters.map(chapter=>({chapter,scenery:chapter.querySelector('.chapter-scenery'),top:0,height:1}));
const progressRule=document.querySelector('.journey-progress'),chapterCount=document.querySelector('#chapter-count'),cueLabel=document.querySelector('#cue-label'),cueArrow=document.querySelector('#cue-arrow');
const outline=[];for(let i=0;i<silhouette.length;i+=2){const point=preparePoint(silhouette[i],silhouette[i+1]);point.dx=(point.dxTail+point.dxFin)*1.4;point.dy=(point.spine+point.tail+point.fin)*1.4;outline.push(point);}
const query=new URLSearchParams(location.search),profileEnabled=query.has('profile');
const pixelBudget=clamp(Number(query.get('budget'))||1100000,300000,1600000);
let profileStart=0,profilePrevious=0,profileSamples=[],profileWindows=[];
function resetTimingClock(){profileStart=0;profilePrevious=0;profileSamples=[];}
function recordTiming(now,paintMS,renderMS){
  if(!profileEnabled)return;
  if(!profileStart)profileStart=now;
  if(now-profileStart<2000)return;
  if(profilePrevious)profileSamples.push({interval:now-profilePrevious,paint:paintMS,render:renderMS});
  profilePrevious=now;
  if(profileSamples.length===180){
    const stat=key=>{const values=profileSamples.map(s=>s[key]).sort((a,b)=>a-b);return{mean:+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2),p50:+values[90].toFixed(2),p95:+values[171].toFixed(2),max:+values[179].toFixed(2)};};
    const result={samples:180,at:+(now/1000).toFixed(2),visible:document.visibilityState,interval:stat('interval'),paint:stat('paint'),render:stat('render'),over33:profileSamples.filter(s=>s.interval>33.4).length,over50:profileSamples.filter(s=>s.interval>50).length};
    canvas.dataset.timing=JSON.stringify(result);profileWindows.push(result);if(profileWindows.length>4)profileWindows.shift();
    canvas.dataset.timingWindows=JSON.stringify(profileWindows);
    profileSamples=[];
  }
}

// Native scrolling remains in charge. No wheel/touch interception, smooth-scroll
// library, per-section observer, or second animation loop competes with this clock.
function requestTick(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function readScroll(){scrollDirty=true;requestTick();}
function measure(snap=true){
  const bounds=stage.getBoundingClientRect(),previousProgress=targetProgress;
  const resized=stageWidth>0&&(Math.abs(stageWidth-bounds.width)>.5||Math.abs(stageHeight-bounds.height)>.5);
  stageWidth=bounds.width;stageHeight=bounds.height;
  measuredViewportWidth=innerWidth;measuredViewportHeight=innerHeight;
  scrollStart=journey.getBoundingClientRect().top+window.scrollY;
  scrollTravel=Math.max(0,journey.offsetHeight-innerHeight);
  if(resized)window.scrollTo({top:scrollStart+scrollTravel*previousProgress,behavior:'instant'});
  targetProgress=scrollProgress(window.scrollY,scrollStart,scrollTravel);scrollDirty=false;
  if(snap)visibleProgress=targetProgress;
  if(!turnReady)choreography=createChoreography(targetProgress);
  chapterParts.forEach(part=>{const b=part.chapter.getBoundingClientRect();part.top=b.top+window.scrollY;part.height=b.height;});
  paintedProgress=-1;paintStory();
  if(!turnReady){turn=createTurn(scene.angle);turnReady=true;}
  layoutCache=null;renderer?.resize();viewRenderer?.resize();renderFrame();requestTick();
}
function goTo(progress){window.scrollTo({top:scrollStart+scrollTravel*progress,behavior:reduced?'instant':'smooth'});}
chapterButtons.forEach(button=>button.addEventListener('click',()=>goTo(Number(button.dataset.chapterTarget))));
document.querySelector('#journey-cue').addEventListener('click',()=>goTo(scene.chapter===0?.5:scene.chapter===1?.85:0));
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();pauseButton.focus({preventScroll:true});});
window.addEventListener('scroll',readScroll,{passive:true});
// Browser scroll-range clamping can occur before ResizeObserver delivery. Read
// the new range before the next RAF consumes that clamp as deliberate scrolling.
window.addEventListener('resize',()=>measure(true));
window.addEventListener('pageshow',()=>measure(true));
const resizeObserver=new ResizeObserver(()=>measure(true));resizeObserver.observe(stage);resizeObserver.observe(journey);

document.querySelector('#about-open').addEventListener('click',()=>dialog.showModal());
document.querySelector('#about-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});

function updateControls(){
  const active=playing&&!failed;
  pauseButton.setAttribute('aria-label',active?'Pause swimming':'Play swimming');
  pauseButton.querySelector('.pause-label').textContent=active?'Pause':'Play';
  pauseButton.querySelector('.pause-symbol').textContent=active?'Ⅱ':'▷';
  liveDot.classList.toggle('is-paused',!active);
  status.textContent=failed?'Still artwork · rendering unavailable':reduced?active?'Reduced journey · swimming':'Reduced motion · still':active?'A moment in motion':'Swimming paused';
  canvas.dataset.playing=String(active);canvas.dataset.reducedMotion=String(reduced);
  reduceToggle.checked=reduced;document.documentElement.classList.toggle('is-reduced',reduced);
}
function applyPreference(){
  reduced=manualReduced??reducedMotion.matches;playing=startsPlaying(reduced);
  pointerX=pointerY=tiltX=tiltY=0;visibleProgress=targetProgress;previous=0;
  choreography=createChoreography(targetProgress);paintedMotion=-1;
  viewRenderer?.reset(targetProgress,reduced);
  resetTimingClock();
  paintedProgress=-1;lastRecord=0;updateControls();paintStory();stepTurn(turn,scene.angle,0,reduced);renderFrame();requestTick();
}
reduceToggle.addEventListener('change',()=>{
  manualReduced=reduceToggle.checked===reducedMotion.matches?null:reduceToggle.checked;
  try{if(manualReduced===null)sessionStorage.removeItem('koi-reduce-motion');else sessionStorage.setItem('koi-reduce-motion',String(manualReduced));}catch{}
  applyPreference();
});
reducedMotion.addEventListener('change',()=>{if(manualReduced===null)applyPreference();});
pauseButton.addEventListener('click',()=>{playing=!playing;previous=0;lastRecord=0;resetTimingClock();updateControls();requestTick();});
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;previous=0;resetTimingClock();if(!document.hidden)measure(true);});
document.querySelectorAll('.current').forEach(button=>button.addEventListener('click',()=>{
  current=Number(button.dataset.current);
  document.querySelectorAll('.current').forEach(other=>{const selected=other===button;other.classList.toggle('is-active',selected);other.setAttribute('aria-pressed',String(selected));});
  requestTick();
}));
window.addEventListener('pointermove',event=>{
  if(!playing||reduced||event.pointerType==='touch')return;
  const b=stage.getBoundingClientRect();pointerX=clamp((event.clientX-b.left)/b.width-.5,-.5,.5);pointerY=clamp((event.clientY-b.top)/b.height-.5,-.5,.5);
});
stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;});

function paintStory(){
  if(visibleProgress===paintedProgress&&choreography.progress===paintedMotion)return;
  paintedProgress=visibleProgress;paintedMotion=choreography.progress;
  const story=sampleJourney(visibleProgress,stageWidth<=640,reduced);
  scene=sampleJourney(choreography.progress,stageWidth<=640,reduced);sceneVersion++;
  beat=viewRenderer?viewBeat(choreography.progress,reduced):viewBeat(0);
  if(beat.approach){
    const angleDelta=((270-scene.angle+540)%360)-180;
    scene.angle+=angleDelta*beat.approach;
  }
  const displayY=scrollStart+visibleProgress*scrollTravel,viewportMiddle=displayY+innerHeight*.5;
  chapterParts.forEach(part=>{
    const distance=(part.top+part.height*.5-viewportMiddle)/innerHeight;
    part.chapter.style.opacity=String(reduced?1:clamp(1-Math.abs(distance)*.35,.55,1));
    part.scenery.style.transform=reduced?'none':`translate3d(0,${distance*innerHeight*.07}px,0)`;
  });
  progressRule.style.transform=`scaleX(${visibleProgress})`;
  stage.dataset.motionProgress=choreography.progress.toFixed(6);
  stage.dataset.progress=visibleProgress.toFixed(6);stage.dataset.targetProgress=targetProgress.toFixed(6);stage.dataset.chapter=String(story.chapter+1);
  if(story.chapter!==lastChapter){
    chapterButtons.forEach((button,index)=>{if(index===story.chapter)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    chapterCount.textContent=`0${story.chapter+1} / 03`;
    cueLabel.textContent=['Scroll to follow the current','Keep drifting. There is more ahead.','Return to the surface'][story.chapter];
    cueArrow.textContent=story.chapter===2?'↑':'↓';lastChapter=story.chapter;
  }
}
function fishLayout(width,height,image){
  if(layoutCache&&layoutCache.sceneVersion===sceneVersion&&layoutCache.turnVersion===turn.version&&layoutCache.width===width&&layoutCache.height===height)return layoutCache.pose;
  if(spineVersion!==turn.version){spineColumns(turn,72,fullSpine);spineVersion=turn.version;}
  const mobile=width<=640,angle=degrees(turn.angles[0]),r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),aspect=image.height/image.width;
  const bounds={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};
  for(const p of outline){
    const at=Math.round(p.u*72)*4,x=fullSpine[at],y=fullSpine[at+1],cs=fullSpine[at+2],sn=fullSpine[at+3];
    for(let ix=-1;ix<=1;ix+=2)for(let iy=-1;iy<=1;iy+=2){
      const dx=p.dx*ix,dy=p.dy*iy;
      const lateral=(p.y+dy)*aspect,lx=x+dx*cs-lateral*sn,ly=y+dx*sn+lateral*cs;
      const px=lx*c-ly*s,py=lx*s+ly*c;
      bounds.left=Math.min(bounds.left,px);bounds.right=Math.max(bounds.right,px);bounds.bottom=Math.min(bounds.bottom,py);bounds.top=Math.max(bounds.top,py);
    }
  }
  bounds.left-=.01;bounds.right+=.01;bounds.bottom-=.01;bounds.top+=.01;
  const margin=mobile?14:18;
  const baseWidth=mobile?Math.min((width-30)/.90,(height-100)/.89,650):Math.min(width*.83,(height-36)/.79,1180);
  let fishWidth=Math.max(10,Math.min(baseWidth*scene.scale,(width-margin*2)/(bounds.right-bounds.left),(height-margin*2)/(bounds.top-bounds.bottom)));
  // The overhead view approaches the same nose registration as the new artwork.
  // This is an in-plane preparatory turn; the front anatomy comes from new paint.
  fishWidth=fishWidth*(1-beat.approach)+Math.min(height,width*1.25)*beat.approach;
  let centerX=width*scene.x-(bounds.left+bounds.right)/2*fishWidth,centerY=height*scene.y-(bounds.bottom+bounds.top)/2*fishWidth;
  centerX=clamp(centerX,margin-bounds.left*fishWidth,width-margin-bounds.right*fishWidth);
  centerY=clamp(centerY,margin-bounds.bottom*fishWidth,height-margin-bounds.top*fishWidth);
  if(beat.approach){
    const noseX=width*.5-(.479*c+.0175*s)*fishWidth,noseY=height*.27-(.479*s-.0175*c)*fishWidth;
    centerX+=(noseX-centerX)*beat.approach;centerY+=(noseY-centerY)*beat.approach;
  }
  const pose={fishWidth,fishHeight:fishWidth*aspect,centerX,centerY,angle,turn};
  layoutCache={sceneVersion,turnVersion:turn.version,width,height,pose};return pose;
}
function renderFrame(){
  const spatialActive=Boolean(!failed&&viewRenderer&&(viewRenderer.diagnostic||beat.active||viewRenderer.hasDepth()));
  const overheadOpacity=spatialActive?0:1;
  if(lastOpacity!==overheadOpacity){canvas.style.opacity=String(overheadOpacity);lastOpacity=overheadOpacity;}
  if(renderer&&!spatialActive)renderer.render(elapsed,current,tiltX,tiltY);
  else if(!renderer&&artwork){const p=fishLayout(stageWidth,stageHeight,artwork);fallback.style.width=`${p.fishWidth}px`;fallback.style.left=`${p.centerX}px`;fallback.style.top=`${stageHeight-p.centerY}px`;fallback.style.transform=`translate(-50%,-50%) rotate(${-p.angle}deg)`;}
  encounterCanvas.style.visibility=failed?'hidden':'';
  if(!failed)viewRenderer?.render(beat,elapsed,current,choreography.progress,tiltX,tiltY);
}
function tick(now){
  raf=0;if(document.hidden)return;
  if(innerWidth!==measuredViewportWidth||innerHeight!==measuredViewportHeight){measure(true);previous=0;return;}
  // Real elapsed time, with no frame-rate-dependent cap or manufactured first step.
  const seconds=previous?Math.max(0,(now-previous)/1000):0;previous=now;
  if(scrollDirty){targetProgress=scrollProgress(window.scrollY,scrollStart,scrollTravel);scrollDirty=false;}
  visibleProgress=followProgress(visibleProgress,targetProgress,seconds,reduced);
  stepChoreography(choreography,visibleProgress,seconds,reduced);
  if(playing&&!failed)elapsed+=seconds;
  if(playing&&!reduced){const response=1-Math.exp(-seconds/.14);tiltX+=(pointerX-tiltX)*response;tiltY+=(pointerY-tiltY)*response;}
  const beforePaint=performance.now();paintStory();stepTurn(turn,scene.angle,seconds,reduced);viewRenderer?.step(choreography.progress,seconds,reduced);
  const beforeRender=performance.now();renderFrame();recordTiming(now,beforeRender-beforePaint,performance.now()-beforeRender);
  if((playing&&!failed)||Math.abs(visibleProgress-targetProgress)>.00001||Math.abs(choreography.progress-visibleProgress)>.00001||Math.abs(choreography.velocity)>.0001||!turnSettled(turn,scene.angle)||(viewRenderer&&!viewRenderer.settled()))requestTick();else{previous=0;resetTimingClock();}
}

function createRenderer(image) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL unavailable');
  if(profileEnabled){const info=gl.getExtension('WEBGL_debug_renderer_info');canvas.dataset.gpu=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    attribute vec2 a_uv;
    uniform vec2 u_resolution; uniform vec2 u_size; uniform vec2 u_center; uniform float u_angle;
    uniform float u_phase; uniform float u_current; uniform vec4 u_spine[73];
    varying vec2 v_uv;
    void main(){
      float u=a_uv.x,v=a_uv.y,across=v-.5;
      float tail=1.0-smoothstep(.13,.60,u),head=1.0-smoothstep(.73,.91,u);
      float edge=smoothstep(.09,.40,abs(across)),finDistance=(u-.76)/.15;
      float pectoral=exp(-finDistance*finDistance)*edge;
      float dx=u_current*(tail*edge*.020*sin(u_phase*2.0+v*9.0)+pectoral*.018*sin(u_phase*2.0+v*7.0));
      float dy=u_current*(head*(.012+.112*tail)*sin(u_phase*2.0-u*7.4)+tail*edge*.045*sin(u_phase*3.0-u*10.0+across*8.0)+pectoral*.048*sin(u_phase*2.0+across*5.0+u*4.0));
      vec4 spine=u_spine[int(floor(u*72.0+.5))];
      float lateral=(across+dy)*u_size.y/u_size.x;
      vec2 local=vec2(spine.x+dx*spine.z-lateral*spine.w,spine.y+dx*spine.w+lateral*spine.z)*u_size.x;
      float c=cos(u_angle),s=sin(u_angle);
      vec2 p=vec2(local.x*c-local.y*s,local.x*s+local.y*c)+u_center;
      gl_Position=vec4(p/u_resolution*2.0-1.0,0.0,1.0);v_uv=a_uv;
    }`));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision mediump float; uniform sampler2D u_image; varying vec2 v_uv;
    void main(){gl_FragColor=texture2D(u_image,v_uv);}`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const grid = makeGrid();
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer); gl.bufferData(gl.ARRAY_BUFFER, grid.uv, gl.STATIC_DRAW);
  const uvAttribute = gl.getAttribLocation(program, 'a_uv');
  gl.enableVertexAttribArray(uvAttribute); gl.vertexAttribPointer(uvAttribute, 2, gl.FLOAT, false, 0, 0);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const locations = Object.fromEntries(['u_resolution','u_size','u_center','u_angle','u_phase','u_current','u_spine[0]'].map(key => [key, gl.getUniformLocation(program,key)]));
  let width = 0, height = 0;
  function resize() {
    const bounds = stage.getBoundingClientRect(); width = bounds.width; height = bounds.height;
    const dpr = Math.min(devicePixelRatio || 1, 1.5,Math.sqrt(pixelBudget/Math.max(1,width*height)));
    canvas.dataset.pixelRatio=dpr.toFixed(3);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  function render(seconds, strength, tx = 0, ty = 0) {
    const phase = (seconds % LOOP_SECONDS) / LOOP_SECONDS * TAU;
    // Swimming is evaluated in the vertex shader; no per-vertex allocation or
    // streaming position buffer competes with native page scrolling.
    gl.uniform1f(locations.u_phase,phase);gl.uniform1f(locations.u_current,strength);
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    // Fit the entire alpha silhouette throughout the strongest current, including
    // its broad tail sweep. Bounds were sampled from the generated artwork.
    const {fishWidth,fishHeight,centerX,centerY,angle} = fishLayout(width,height,image);
    gl.uniform4fv(locations['u_spine[0]'],fullSpine);
    gl.uniform2f(locations.u_resolution,width,height);
    gl.uniform2f(locations.u_size,fishWidth,fishHeight);
    gl.uniform2f(locations.u_center,centerX+tx*9,centerY-ty*7);
    // Positive GL angle points the fish up-right on screen.
    gl.uniform1f(locations.u_angle,angle*Math.PI/180+tx*0.035);
    gl.drawElements(gl.TRIANGLES,grid.indices.length,gl.UNSIGNED_SHORT,0);
    recordFrame(phase,strength,{angle,centerX,centerY,fishWidth});
  }
  resize();
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); useCanvasArtwork('WebGL context lost'); });
  return { render, resize,qaLoseContext(){
    const loss=gl.getExtension('WEBGL_lose_context');
    if(loss)loss.loseContext();else encounterCanvas.dataset.qaContextLoss='unsupported';
  } };
}

function recordFrame(phase,strength,pose){
  frame++;const now=performance.now();if(lastRecord&&now-lastRecord<200)return;lastRecord=now;
  canvas.dataset.frame=String(frame);canvas.dataset.phase=phase.toFixed(5);
  canvas.dataset.current=String(strength);canvas.dataset.journeyProgress=visibleProgress.toFixed(6);
  canvas.dataset.heading=pose.angle.toFixed(4);canvas.dataset.centerX=pose.centerX.toFixed(3);
  canvas.dataset.centerY=pose.centerY.toFixed(3);canvas.dataset.fishWidth=pose.fishWidth.toFixed(3);
  canvas.dataset.spine=Array.from(turn.angles,v=>degrees(v).toFixed(2)).join(',');
}
function makeSoftwareRenderer(image){
  // A canvas that has owned a WebGL context cannot switch to 2D after context loss.
  // Replacing only the drawing surface preserves the timeline, phase and controls.
  const replacement=document.createElement('canvas');replacement.id='fish';replacement.setAttribute('aria-hidden','true');
  canvas.replaceWith(replacement);canvas=replacement;
  lastOpacity=-1;
  return createCanvasRenderer(canvas,image,fishLayout,recordFrame,pixelBudget);
}
function useCanvasArtwork(reason){
  try{
    renderer=makeSoftwareRenderer(artwork);failed=false;
    canvas.dataset.renderer='canvas-deforming-mesh';canvas.classList.add('is-ready');fallback.classList.add('is-hidden');
    canvas.dataset.fallbackReason=reason;
    updateControls();measure(true);
    console.info('Koi Flow is using its animated Canvas renderer:',reason);
  }catch(error){useStillArtwork(error.message);}
}

function useStillArtwork(reason) {
  failed = true; playing = false; renderer = null;
  canvas.dataset.renderer = 'static-fallback';
  canvas.classList.remove('is-ready'); fallback.classList.remove('is-hidden');
  pauseButton.disabled = true;
  document.querySelectorAll('.current').forEach(button => { button.disabled = true; });
  updateControls();paintStory();renderFrame();requestTick();
  console.warn('Koi Flow is displaying the original still artwork:', reason);
}

updateControls();
measure(true);
const image = new Image();
image.onload = () => {
  artwork=image;
  if(query.get('renderer')==='still'){useStillArtwork('Requested still-renderer QA route');return;}
  try {
    // A documented local QA route exercises the fallback without GPU settings.
    // Matched local observations favored predictable Canvas pacing. WebGL is an
    // optional higher-density route with the same drawing-surface pixel budget.
    const requestWebgl=query.get('renderer')==='webgl';
    const chosen=selectRenderer(()=>createRenderer(image),()=>makeSoftwareRenderer(image),!requestWebgl);
    renderer=chosen.renderer;canvas.dataset.renderer=chosen.type;
    renderer.render(elapsed,current);
    if(chosen.reason)console.info('Koi Flow is using its animated Canvas renderer:',chosen.reason);
    canvas.classList.add('is-ready'); fallback.classList.add('is-hidden');
    updateControls();measure(true);
    if(query.get('qa')==='lose-context'&&chosen.type==='webgl-deforming-mesh')requestAnimationFrame(()=>renderer?.qaLoseContext?.());
  } catch (error) { useStillArtwork(error.message); }
};
image.onerror = () => { useStillArtwork('Artwork failed to load'); status.textContent = 'Artwork could not load · refresh to retry'; };
image.src = 'assets/koi.webp';

function loadView(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
Promise.all([loadView('assets/koi.webp'),loadView('assets/koi-face-proof-v4-ivory.png')]).then(([original,front])=>{
  viewRenderer=createViewRenderer(encounterCanvas,original,front,fishLayout,pixelBudget,{diagnostic:query.get('qa')==='spine'});
  viewRenderer.reset(choreography.progress,reduced);
  encounterCanvas.dataset.views='ready';paintedProgress=-1;paintStory();renderFrame();requestTick();
  if(query.get('qa')==='lose-spatial-context')requestAnimationFrame(()=>viewRenderer.qaLoseContext());
}).catch(()=>{encounterCanvas.dataset.views='unavailable';console.warn('Matching views could not load; the original swimming artwork remains available.');});
