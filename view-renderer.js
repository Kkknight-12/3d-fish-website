import {convexContour} from './water-motion.js';
import {createMouthBarbels,projectMouthBarbels,barbelVisibility} from './mouth-barbels.js';
import {volumeClipPolygon,padVolumeTexture} from './volume-raster.js';
import {eyeCharts,intrinsicEyeUV,refineEyeSurface,eraseTextureEyes,makeEyeTexture,anatomicalFaceUV,makeIntrinsicSkinAtlas,intrinsicSkinUV} from './eye-atlas.js';
import {buildContinuousBody,bodyContour,CONTINUOUS_BODY_JOIN} from './body-geometry.js';
import {createReferenceFit,computeReferenceFit} from './reference-fit.js';
import {faceProofUV} from './head-geometry.js';
import {ramp,breathOpening} from './view-beat.js';
import {preparePoint} from './spine.js';
import {DEPTH_STRIDE,HEAD_JOIN_U,HEAD_PAINT_TOP,HEAD_PAINT_BOTTOM,isDorsalHead,turnPitch,restPitch,createDepthTurn,stepDepthTurn,depthSettled,depthColumns,surfacePoint,pectoralSurfacePoint,headSurfacePoint,volumeSurfacePoint,facePoint3D,project3D,fitProjection,spineLinePoint} from './pose-3d.js';

// Existing painted body/fins plus one closed head/chest volume. Two registered
// texture charts share that volume; no separate face or extra fin layers.
export function createViewRenderer(canvas,originalImage,frontImage,getLayout,pixelBudget,{diagnostic=false}={}){
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('View Canvas unavailable');
  const depth=createDepthTurn(),columns=new Float64Array(73*DEPTH_STRIDE);
  const columnViews=Array.from({length:73},(_,i)=>columns.subarray(i*DEPTH_STRIDE,(i+1)*DEPTH_STRIDE));
  const aspect=originalImage.height/originalImage.width,head=columnViews[72];
  const meshes=[];
  const referenceFit=createReferenceFit(originalImage,{width:1254,height:1254});
  function makeMesh(image,face=false,region=null){
    const vertices=[],triangles=[];let grid=null;
    const vertex=(u,v)=>{vertices.push({u,v,sx:u*image.width,sy:v*image.height,x:0,y:0,z:0,local:{},wave:{},motion:preparePoint(u,1-v),column:u>.60?new Float64Array(7):columnViews[Math.round(u*72)]});return vertices.length-1;};
    let alpha=null;
    if(!face||region){const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const scan=probe.getContext('2d',{willReadFrequently:true});scan.drawImage(image,0,0);alpha=scan.getImageData(0,0,image.width,image.height).data;}
    function add(a,b,c){
      const p=vertices[a],q=vertices[b],r=vertices[c],sx1=q.sx-p.sx,sy1=q.sy-p.sy,sx2=r.sx-p.sx,sy2=r.sy-p.sy,det=sx1*sy2-sx2*sy1;

      if(Math.abs(det)<.001)return;
      const x=Math.max(0,Math.min(p.sx,q.sx,r.sx)-2),y=Math.max(0,Math.min(p.sy,q.sy,r.sy)-2),w=Math.min(image.width,Math.max(p.sx,q.sx,r.sx)+2)-x,h=Math.min(image.height,Math.max(p.sy,q.sy,r.sy)+2)-y;
      if(alpha){let solid=false;for(let yy=Math.floor(y);yy<Math.ceil(y+h)&&!solid;yy+=6)for(let xx=Math.floor(x);xx<Math.ceil(x+w);xx+=6)if(alpha[(Math.min(image.height-1,yy)*image.width+Math.min(image.width-1,xx))*4+3]>4){solid=true;break;}if(!solid)return;}
      triangles.push({p,q,r,image,face,ix1:sy2/det,ix2:-sy1/det,iy1:-sx2/det,iy2:sx1/det,x,y,w,h,depth:0});
    }
    if(region){
      const [left,top,right,bottom]=region,cols=14,rows=18;
      for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertex(left+(right-left)*x/cols,top+(bottom-top)*y/rows);
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;add(a,b,c);add(b,d,c);}
    }else if(face){
      const rings=6,segments=32;vertex(.518,.637);
      for(let ring=1;ring<=rings;ring++)for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2,k=ring/rings;vertex(.518+Math.cos(a)*.151*k,.637+Math.sin(a)*.148*k);}
      for(let j=0;j<segments;j++)add(0,1+j,1+(j+1)%segments);
      for(let ring=1;ring<rings;ring++)for(let j=0;j<segments;j++){const a=1+(ring-1)*segments+j,b=1+(ring-1)*segments+(j+1)%segments,c=1+ring*segments+j,d=1+ring*segments+(j+1)%segments;add(a,c,b);add(b,c,d);}
    }else{
      const xs=[...Array.from({length:25},(_,i)=>i/24),HEAD_JOIN_U].sort((a,b)=>a-b),ys=[...Array.from({length:13},(_,i)=>i/12),HEAD_PAINT_TOP,HEAD_PAINT_BOTTOM].sort((a,b)=>a-b),cols=xs.length-1,rows=ys.length-1;grid={xs,ys,cols};for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertex(xs[x],ys[y]);
      // Refine only original pectoral tiles; preserve every original tail tile.
      const refine=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&((xs[x]+xs[x+1])/2>.60)&&((xs[x]+xs[x+1])/2<.92)&&(((ys[y]+ys[y+1])/2<.43)||((ys[y]+ys[y+1])/2>.62))&&!isDorsalHead((xs[x]+xs[x+1])/2,(ys[y]+ys[y+1])/2);
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;
        if(!refine(x,y)){add(a,b,c);add(b,d,c);continue;}
        const n=2,patch=[];
        for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
          if((i===0||i===n)&&(j===0||j===n)){patch.push(j===0?(i===0?a:b):(i===0?c:d));continue;}
          const at=vertex(xs[x]+(xs[x+1]-xs[x])*i/n,ys[y]+(ys[y+1]-ys[y])*j/n),v=vertices[at];
          // Weld refinement boundaries adjoining unchanged body/head cells.
          if(i===0&&!refine(x-1,y))v.boundary={a:vertices[a],b:vertices[c],mix:j/n};
          else if(i===n&&!refine(x+1,y))v.boundary={a:vertices[b],b:vertices[d],mix:j/n};
          else if(j===0&&!refine(x,y-1))v.boundary={a:vertices[a],b:vertices[b],mix:i/n};
          else if(j===n&&!refine(x,y+1))v.boundary={a:vertices[c],b:vertices[d],mix:i/n};
          patch.push(at);
        }
        for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;add(patch[k],patch[k+1],patch[k+n+1]);add(patch[k+1],patch[k+n+2],patch[k+n+1]);}
      }
    }
    // Fine head tiles must meet the existing coarse body edge exactly, not
    // resample nearby bones independently and leave a source-alpha crack.
    if(region){const body=meshes[0],g=body.grid;
      for(const v of vertices){const vertical=Math.abs(v.u-region[0])<1e-9||Math.abs(v.u-region[2])<1e-9;
        const horizontal=Math.abs(v.v-region[1])<1e-9||Math.abs(v.v-region[3])<1e-9;if(!vertical&&!horizontal)continue;
        const axis=vertical?g.ys:g.xs,value=vertical?v.v:v.u;let i=0;while(i<axis.length-2&&value>axis[i+1])i++;
        const fixed=(vertical?g.xs:g.ys).findIndex(n=>Math.abs(n-(vertical?v.u:v.v))<1e-9);
        const a=vertical?i*(g.cols+1)+fixed:fixed*(g.cols+1)+i,b=vertical?a+g.cols+1:a+1;
        v.boundary={a:body.vertices[a],b:body.vertices[b],mix:(value-axis[i])/(axis[i+1]-axis[i])};
      }
    }
    const mesh={face,region,vertices,triangles,grid};meshes.push(mesh);return mesh;
  }
  // Keep only the original painted fins/rear fish on the old sheet. The core
  // is painted once on the continuous closed skin, with an exact UV cutout.
  const finImage=document.createElement('canvas');finImage.width=originalImage.width;finImage.height=originalImage.height;
  const finCtx=finImage.getContext('2d');finCtx.drawImage(originalImage,0,0);finCtx.globalCompositeOperation='destination-out';finCtx.beginPath();
  for(let i=0;i<=192;i++){const u=CONTINUOUS_BODY_JOIN+(1-CONTINUOUS_BODY_JOIN)*i/192,p=bodyContour(u,aspect);if(i)finCtx.lineTo(u*finImage.width,p.top*finImage.height);else finCtx.moveTo(u*finImage.width,p.top*finImage.height);}
  for(let i=192;i>=0;i--){const u=CONTINUOUS_BODY_JOIN+(1-CONTINUOUS_BODY_JOIN)*i/192,p=bodyContour(u,aspect);finCtx.lineTo(u*finImage.width,p.bottom*finImage.height);}finCtx.closePath();finCtx.fill();
  // The planar secondary fins cannot describe an anterior attachment. Keep
  // their original paint for shallow views, and retire only these unsupported
  // projected fragments as the fish pitches toward the viewer.
  const anteriorFinImage=document.createElement('canvas');anteriorFinImage.width=finImage.width;anteriorFinImage.height=finImage.height;
  const minorCtx=anteriorFinImage.getContext('2d');minorCtx.drawImage(finImage,0,0);minorCtx.globalCompositeOperation='destination-out';
  const minorMasks=[
    [[.89,0],[1,0],[1,1],[.89,1]],
    [[.455,.425],[.46,.285],[.61,.245],[.69,.34],[.714,.40],[.68,.401],[.60,.435],[.55,.454],[.50,.473],[.455,.479]],
    [[.435,.606],[.49,.606],[.52,.618],[.60,.650],[.69,.685],[.695,.726],[.60,.747],[.50,.736],[.435,.716]]
  ];
  for(const poly of minorMasks){minorCtx.beginPath();poly.forEach(([u,v],i)=>{if(i)minorCtx.lineTo(u*finImage.width,v*finImage.height);else minorCtx.moveTo(u*finImage.width,v*finImage.height);});minorCtx.closePath();minorCtx.fill();}
  let lastFinTrim=-1,lastBarbelTrim=-1;
  function updateFinTrim(trim,barbelTrim){if(trim===lastFinTrim&&barbelTrim===lastBarbelTrim)return;minorCtx.globalCompositeOperation='copy';minorCtx.globalAlpha=1;minorCtx.drawImage(finImage,0,0);minorCtx.globalCompositeOperation='destination-out';for(const [index,poly] of minorMasks.entries()){minorCtx.globalAlpha=index===0?barbelTrim:trim;minorCtx.beginPath();poly.forEach(([u,v],i)=>{if(i)minorCtx.lineTo(u*finImage.width,v*finImage.height);else minorCtx.moveTo(u*finImage.width,v*finImage.height);});minorCtx.closePath();minorCtx.fill();}minorCtx.globalAlpha=1;lastFinTrim=trim;lastBarbelTrim=barbelTrim;}
  makeMesh(finImage);
  const skinTexture=image=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.fillStyle='#eee4cf';g.fillRect(0,0,c.width,c.height);g.drawImage(image,0,0);return c;};
  const opaqueOriginal=eraseTextureEyes(skinTexture(originalImage)),opaqueFront=eraseTextureEyes(skinTexture(frontImage),true);
  {const g=opaqueOriginal.getContext('2d'),fade=g.createLinearGradient(opaqueOriginal.width*.951,0,opaqueOriginal.width*.974,0);fade.addColorStop(0,'rgba(239,231,212,0)');fade.addColorStop(1,'rgba(239,231,212,1)');g.fillStyle=fade;g.fillRect(opaqueOriginal.width*.951,0,opaqueOriginal.width*.049,opaqueOriginal.height);}
  const eyes=eyeCharts(aspect).map(e=>({...e,image:makeEyeTexture(frontImage,e)}));
  const intrinsicSkin=makeIntrinsicSkinAtlas(opaqueOriginal,opaqueFront,eyes,aspect);
  const bellyTexture=document.createElement('canvas');bellyTexture.width=frontImage.width;bellyTexture.height=frontImage.height;const bellyCtx=bellyTexture.getContext('2d');bellyCtx.fillStyle='#eee4cf';bellyCtx.fillRect(0,0,bellyTexture.width,bellyTexture.height);
  // Experimental GPU painter is intentionally not selectable: it does not yet
  // implement the dynamic fin trim. The accepted renderer is Canvas only.
  const painter=null;
  const paddedTextures=new WeakMap();
  function textureData(image,p,q,r,front=false){
    const uv=v=>typeof front==='function'?front(v):front?[v.frontU*image.width,v.frontV*image.height]:[v.sx,v.sy];
    let [px,py]=uv(p),[qx,qy]=uv(q),[rx,ry]=uv(r);
    let padded=paddedTextures.get(image);if(!padded){padded=padVolumeTexture(image);paddedTextures.set(image,padded);}image=padded.image;px+=padded.pad;py+=padded.pad;qx+=padded.pad;qy+=padded.pad;rx+=padded.pad;ry+=padded.pad;
    const dx1=qx-px,dy1=qy-py,dx2=rx-px,dy2=ry-py,det=dx1*dy2-dx2*dy1;
    if(Math.abs(det)<.001)return null;
    const x=Math.max(0,Math.min(px,qx,rx)-2),y=Math.max(0,Math.min(py,qy,ry)-2),w=Math.min(image.width,Math.max(px,qx,rx)+2)-x,h=Math.min(image.height,Math.max(py,qy,ry)+2)-y;
    if(w<=0||h<=0)return null;
    return {image,px,py,ix1:dy2/det,ix2:-dy1/det,iy1:-dx2/det,iy2:dx1/det,x,y,w,h};
  }
  function makeFittedVolume(){
    const model=refineEyeSurface(buildContinuousBody({aspect,rings:24,segments:20,faceBounds:[.04,.05,.97,.96],faceExtent:[-.090,.052,-.036,.112]}),eyes),vertices=model.vertices.map(v=>({...v,sx:v.originalU*originalImage.width,sy:v.originalV*originalImage.height,volumeZ:v.z,ySource:v.y,defaultFrontU:v.frontU,defaultFrontV:v.frontV,x:0,y:0,z:0,local:{},wave:{},motion:preparePoint(v.u,1-v.v),column:new Float64Array(7)}));
    // Fixed anatomical UVs are registered once before texture matrices are cached.
    for(const v of vertices){const registered=anatomicalFaceUV(v.ySource,v.volumeZ);v.frontU=v.defaultFrontU;v.frontV=registered.v;}
    const body=meshes[0],g=body.grid,xi=g.xs.findIndex(x=>Math.abs(x-CONTINUOUS_BODY_JOIN)<1e-9);
    for(const v of vertices)if(v.seam){let i=0;while(i<g.ys.length-2&&v.v>g.ys[i+1])i++;v.boundary={a:body.vertices[i*(g.cols+1)+xi],b:body.vertices[(i+1)*(g.cols+1)+xi],mix:(v.v-g.ys[i])/(g.ys[i+1]-g.ys[i])};}
    const triangles=model.triangles.map(t=>{const p=vertices[t.a],q=vertices[t.b],r=vertices[t.c];const eye=t.chart==='dorsal'?eyes.find(e=>[p,q,r].some(v=>intrinsicEyeUV(v,e).r<1.55)):null;const eyeData=eye?textureData(eye.image,p,q,r,v=>{const uv=intrinsicEyeUV(v,eye);return[uv.u*eye.image.width,uv.v*eye.image.height];}):null;const dorsalAtlas=t.chart==='dorsal'?textureData(intrinsicSkin,p,q,r,v=>{const uv=intrinsicSkinUV(v);return[uv.u*intrinsicSkin.width,uv.v*intrinsicSkin.height];}):null;return{p,q,r,eye:eyeData,dorsalAtlas,volume:true,chart:t.chart,materialU:(p.u+q.u+r.u)/3,original:textureData(opaqueOriginal,p,q,r),front:textureData(opaqueFront,p,q,r,true),belly:textureData(bellyTexture,p,q,r,true),depth:0};});
    meshes.push({volume:true,vertices,triangles});
  }
  makeFittedVolume();
  const volumeMesh=meshes.find(m=>m.volume);
  const barbels=createMouthBarbels(volumeMesh.vertices,volumeMesh.triangles);
  const triangles=[...meshes.flatMap(m=>m.triangles),...barbels.triangles],paint=[];
  canvas.dataset.tiles=meshes.map(m=>m.triangles.length).join('/');canvas.dataset.targetRate='30';canvas.dataset.paintSources='continuous-skin-intrinsic-eyes';canvas.dataset.pectoralLayers='1';canvas.dataset.headJoin='continuous-closed-body';canvas.dataset.method=diagnostic?'shared-spatial-spine-diagnostic':'continuous-skin-curved-root-proof';
  let width=0,height=0,dpr=1,wasVisible=false,lastDraw=-Infinity,target=0;
  const fitted={scale:1,x:0,y:0};
  function resize(){const b=canvas.getBoundingClientRect();width=b.width;height=b.height;dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(pixelBudget/Math.max(1,width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);painter?.resize(canvas.width,canvas.height);wasVisible=false;lastDraw=-Infinity;}
  function reset(progress,reduced){target=turnPitch(progress,reduced);depth.angles.forEach((_,i)=>depth.angles[i]=restPitch(target,i));depth.velocity=0;lastDraw=-Infinity;}
  function step(progress,seconds,reduced){target=turnPitch(progress,reduced);stepDepthTurn(depth,target,seconds,reduced);}
  function hasDepth(){return depth.angles.some(a=>Math.abs(a)>.00001)||Math.abs(depth.velocity)>.0001;}
  function settled(){return depthSettled(depth,target);}
  function point(p,pose,tx,ty,out={}){return project3D(p,pose,width,height,tx,ty,out);}
  function fittedPoint(p,pose,tx,ty){const out=point(p,pose,tx,ty);out.x=out.x*fitted.scale+fitted.x;out.y=out.y*fitted.scale+fitted.y;return out;}
  function drawDiagnostic(pose,seconds,strength,tx,ty){
    const line=[];for(let i=0;i<=72;i++){const local=spineLinePoint(i/72,seconds,strength,columnViews[i],aspect,{});line.push(fittedPoint(local,pose,tx,ty));}
    ctx.lineWidth=5;ctx.lineCap='round';
    for(let i=0;i<72;i++){ctx.strokeStyle=`hsl(${35+i/72*155} 83% 63%)`;ctx.beginPath();ctx.moveTo(line[i].x,line[i].y);ctx.lineTo(line[i+1].x,line[i+1].y);ctx.stroke();}
    // Draw the active closed-skin mesh, not the retired ovoid diagnostic.
    ctx.strokeStyle='#fdf0d5';ctx.lineWidth=.5;ctx.beginPath();
    for(const t of paint)if(t.volume){ctx.moveTo(t.p.x,t.p.y);ctx.lineTo(t.q.x,t.q.y);ctx.lineTo(t.r.x,t.r.y);ctx.closePath();}ctx.stroke();
    const nose=line[72];ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(nose.x,nose.y,7,0,Math.PI*2);ctx.fill();
    ctx.font='12px ui-monospace, monospace';ctx.textAlign='left';ctx.fillStyle='#fff';ctx.fillText(`HEAD ${Math.round(depth.angles[0]*180/Math.PI)}° → TAIL ${Math.round(depth.angles[5]*180/Math.PI)}°`,20,height-50);ctx.fillText('Same bones, phase and projection as the fish · native scroll',20,height-30);
    canvas.dataset.projectedSpine=JSON.stringify(line.filter((_,i)=>i%12===0).map(p=>[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)]));
  }
  function render(beat,seconds,strength,progress,tx=0,ty=0){
    const visible=diagnostic||beat.active||hasDepth();if(!visible&&!wasVisible)return;
    const now=performance.now();if(visible&&wasVisible&&now-lastDraw<30)return;
    const pose=getLayout(width,height,originalImage);depthColumns(pose.turn,depth,72,columns);
    canvas.waterTranslation={x:pose.centerX,y:pose.centerY};
    updateFinTrim(ramp(.08,.30,depth.angles[0]),ramp(.22,.30,depth.angles[0]));
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,width,height);
    if(visible){
      for(const mesh of meshes)for(const v of mesh.vertices){
        if(mesh.volume||(!mesh.region&&v.u>.60)){const at=Math.min(71,Math.floor(v.u*72)),mix=Math.min(1,v.u*72-at),a=columnViews[at],b=columnViews[at+1];for(let j=0;j<7;j++)v.column[j]=a[j]+(b[j]-a[j])*mix;for(const [x,y] of [[3,4],[5,6]]){const n=Math.hypot(v.column[x],v.column[y]);v.column[x]/=n;v.column[y]/=n;}}
        if(v.boundary){const {a,b,mix}=v.boundary;v.x=a.x+(b.x-a.x)*mix;v.y=a.y+(b.y-a.y)*mix;v.z=a.z+(b.z-a.z)*mix;continue;}
        const local=mesh.volume?volumeSurfacePoint(v.motion,v.volumeZ,v.frontU,v.frontV,seconds,strength,v.column,aspect,v.local,v.wave,0):mesh.region?headSurfacePoint(v.motion,seconds,strength,v.column,aspect,v.local,v.wave):pectoralSurfacePoint(v.motion,seconds,strength,v.column,aspect,v.local,v.wave);
        point(local,pose,tx,ty,v);
      }
      const barbelAlpha=barbelVisibility(depth.angles[0]);
      projectMouthBarbels(barbels,head,p=>point(p,pose,tx,ty));
      paint.length=0;
      for(const t of triangles){const p=t.p,q=t.q,r=t.r,area=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);if(t.barbel&&barbelAlpha===0)continue;if(t.volume||t.barbel?area>=-.015:t.face?area<=.015:Math.abs(area)<=.015)continue;t.depth=(p.z+q.z+r.z)/3;paint.push(t);}
      const bounds=[Infinity,Infinity,-Infinity,-Infinity];
      for(const t of paint)for(const v of [t.p,t.q,t.r]){bounds[0]=Math.min(bounds[0],v.x);bounds[1]=Math.min(bounds[1],v.y);bounds[2]=Math.max(bounds[2],v.x);bounds[3]=Math.max(bounds[3],v.y);}
      computeReferenceFit(referenceFit,pose,columns,seconds,strength,width,height,tx,ty,fitted);
      for(const mesh of meshes)for(const v of mesh.vertices){v.x=v.x*fitted.scale+fitted.x;v.y=v.y*fitted.scale+fitted.y;}
      for(const v of barbels.vertices){v.x=v.x*fitted.scale+fitted.x;v.y=v.y*fitted.scale+fitted.y;}
      canvas.waterContour=convexContour(volumeMesh.vertices);{const head=volumeMesh.vertices.reduce((a,v)=>v.u>a.u?v:a);canvas.waterHead={x:head.x,y:head.y};}
      {const tail=meshes[0].vertices.reduce((best,v)=>Math.abs(v.u-.29)+Math.abs(v.v-.5)<Math.abs(best.u-.29)+Math.abs(best.v-.5)?v:best);canvas.waterTail={x:tail.x,y:tail.y};}
      canvas.dataset.barbels=barbelAlpha>0?'mouth-local-pair':'original-painted-pair';canvas.dataset.barbelOpacity=barbelAlpha.toFixed(4);
      canvas.dataset.fittedBounds=JSON.stringify(bounds.map((v,i)=>+(v*fitted.scale+(i%2?fitted.y:fitted.x)).toFixed(2)));
      canvas.dataset.fitScale=fitted.scale.toFixed(4);canvas.dataset.fitReference='preserved-handoff';canvas.dataset.fitOffset=JSON.stringify([fitted.x,fitted.y]);
      if(diagnostic)drawDiagnostic(pose,seconds,strength,tx,ty);
      else if(painter?.draw(paint,width,height,ramp(.75,1.25,depth.angles[0]))){ctx.drawImage(painter.canvas,0,0,width,height);canvas.dataset.spatialPainter='webgl-batch';}
      else {
      canvas.dataset.spatialPainter='canvas-fallback';canvas.dataset.spatialReason=painter?.reason||'forced-canvas';
      paint.sort((a,b)=>a.depth-b.depth);
      for(const t of paint){
        const p=t.p,q=t.q,r=t.r,mx=(p.x+q.x+r.x)/3,my=(p.y+q.y+r.y)/3,dx1=q.x-p.x,dx2=r.x-p.x,dy1=q.y-p.y,dy2=r.y-p.y;
        if(t.barbel){ctx.save();ctx.globalAlpha=barbelAlpha;ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.fill();ctx.restore();continue;}
        // Register frontal anatomy as soon as the head begins to expose its sides.
        // A long material dissolve showed two differently placed sets of eyes.
        const weight=t.volume?ramp(.75,1.25,depth.angles[0]):0;
        function drawTexture(data,alpha=1){if(!data||alpha<=0)return;const a=dx1*data.ix1+dx2*data.ix2,b=dy1*data.ix1+dy2*data.ix2,c=dx1*data.iy1+dx2*data.iy2,d=dy1*data.iy1+dy2*data.iy2;
          ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();
          if(t.volume){const poly=volumeClipPolygon([p,q,r]);ctx.moveTo(poly[0].x,poly[0].y);for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);}
          else {const grow=v=>{const k=1+.7/Math.max(1,Math.hypot(v.x-mx,v.y-my));return[mx+(v.x-mx)*k,my+(v.y-my)*k];};ctx.moveTo(...grow(p));ctx.lineTo(...grow(q));ctx.lineTo(...grow(r));}
          ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,p.x-a*data.px-c*data.py,p.y-b*data.px-d*data.py);
          if(t.volume)ctx.drawImage(data.image,0,0);else ctx.drawImage(data.image,data.x,data.y,data.w,data.h,data.x,data.y,data.w,data.h);ctx.restore();
        }
        if(t.volume){
          // Degenerate UV poles still have an opaque anatomical surface.
          if((t.chart==='dorsal'&&!t.original)||(t.chart!=='dorsal'&&!t.belly)){ctx.fillStyle='#eee4cf';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.fill();}
          // One opaque skin material on one surface, never alpha-overlay heads.

          const headWeight=ramp(.78,.86,t.materialU);
          if(t.chart==='dorsal'){drawTexture(t.dorsalAtlas||t.original);}else {if(headWeight<1)drawTexture(t.belly);drawTexture(t.front,headWeight);}
        // Intrinsic eyes are baked into dorsalAtlas; no second microtriangle pass.
        }else drawTexture({...t,image:anteriorFinImage,px:p.sx,py:p.sy});
      }
      }
      canvas.dataset.visibleTiles=String(paint.length);
    }
    lastDraw=now;wasVisible=visible;
    canvas.dataset.headPitch=(depth.angles[0]*180/Math.PI).toFixed(3);canvas.dataset.tailPitch=(depth.angles[5]*180/Math.PI).toFixed(3);canvas.dataset.pitchBones=Array.from(depth.angles,a=>(a*180/Math.PI).toFixed(3)).join(',');canvas.dataset.mouth=breathOpening(seconds).toFixed(4);canvas.dataset.waveSeconds=seconds.toFixed(4);canvas.dataset.poseProgress=progress.toFixed(6);canvas.dataset.heading=pose.angle.toFixed(3);canvas.dataset.opacity='1';
  }
  resize();return{render,resize,reset,step,hasDepth,settled,diagnostic,qaLoseContext:()=>painter?.loseContext()};
}
