import {viewPoint,breathOpening} from './view-beat.js';
import {preparePoint} from './spine.js';
import {DEPTH_STRIDE,HEAD_JOIN_U,HEAD_PAINT_TOP,HEAD_PAINT_BOTTOM,isDorsalHead,turnPitch,restPitch,createDepthTurn,stepDepthTurn,depthSettled,depthColumns,surfacePoint,facePoint3D,frontFinPoint,project3D,fitProjection,spineLinePoint} from './pose-3d.js';

// One opaque drawing rig. The dorsal painting bends on a spatial spine; a
// curved painted head turns into view. There are no whole-image fades.
export function createViewRenderer(canvas,originalImage,frontImage,getLayout,pixelBudget,{diagnostic=false}={}){
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('View Canvas unavailable');
  const depth=createDepthTurn(),columns=new Float64Array(73*DEPTH_STRIDE);
  const columnViews=Array.from({length:73},(_,i)=>columns.subarray(i*DEPTH_STRIDE,(i+1)*DEPTH_STRIDE));
  const aspect=originalImage.height/originalImage.width,head=columnViews[72];
  const meshes=[];
  function makeMesh(image,face=false,region=null){
    const vertices=[],triangles=[];
    const vertex=(u,v)=>{vertices.push({u,v,sx:u*image.width,sy:v*image.height,x:0,y:0,z:0,local:{},wave:{},motion:preparePoint(u,1-v),column:columnViews[Math.round(u*72)]});return vertices.length-1;};
    let alpha=null;
    if(!face||region){const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const scan=probe.getContext('2d',{willReadFrequently:true});scan.drawImage(image,0,0);alpha=scan.getImageData(0,0,image.width,image.height).data;}
    function add(a,b,c){
      const p=vertices[a],q=vertices[b],r=vertices[c],sx1=q.sx-p.sx,sy1=q.sy-p.sy,sx2=r.sx-p.sx,sy2=r.sy-p.sy,det=sx1*sy2-sx2*sy1;
      if(!face&&isDorsalHead((p.u+q.u+r.u)/3,(p.v+q.v+r.v)/3))return;
      if(Math.abs(det)<.001)return;
      const x=Math.max(0,Math.min(p.sx,q.sx,r.sx)-2),y=Math.max(0,Math.min(p.sy,q.sy,r.sy)-2),w=Math.min(image.width,Math.max(p.sx,q.sx,r.sx)+2)-x,h=Math.min(image.height,Math.max(p.sy,q.sy,r.sy)+2)-y;
      if(alpha){let solid=false;for(let yy=Math.floor(y);yy<Math.ceil(y+h)&&!solid;yy+=6)for(let xx=Math.floor(x);xx<Math.ceil(x+w);xx+=6)if(alpha[(Math.min(image.height-1,yy)*image.width+Math.min(image.width-1,xx))*4+3]>4){solid=true;break;}if(!solid)return;}
      triangles.push({p,q,r,image,face,ix1:sy2/det,ix2:-sy1/det,iy1:-sx2/det,iy2:sx1/det,x,y,w,h,depth:0});
    }
    if(region){
      const [left,top,right,bottom]=region,cols=8,rows=8;
      for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertex(left+(right-left)*x/cols,top+(bottom-top)*y/rows);
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;add(a,b,c);add(b,d,c);}
    }else if(face){
      const rings=6,segments=32;vertex(.518,.637);
      for(let ring=1;ring<=rings;ring++)for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2,k=ring/rings;vertex(.518+Math.cos(a)*.151*k,.637+Math.sin(a)*.148*k);}
      for(let j=0;j<segments;j++)add(0,1+j,1+(j+1)%segments);
      for(let ring=1;ring<rings;ring++)for(let j=0;j<segments;j++){const a=1+(ring-1)*segments+j,b=1+(ring-1)*segments+(j+1)%segments,c=1+ring*segments+j,d=1+ring*segments+(j+1)%segments;add(a,c,b);add(b,c,d);}
    }else{
      const xs=[...Array.from({length:25},(_,i)=>i/24),HEAD_JOIN_U].sort((a,b)=>a-b),ys=[...Array.from({length:13},(_,i)=>i/12),HEAD_PAINT_TOP,HEAD_PAINT_BOTTOM].sort((a,b)=>a-b),cols=xs.length-1,rows=ys.length-1;for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertex(xs[x],ys[y]);
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;add(a,b,c);add(b,d,c);}
    }
    const mesh={face,region,vertices,triangles};meshes.push(mesh);return mesh;
  }
  makeMesh(originalImage);makeMesh(frontImage,true);
  makeMesh(frontImage,true,[.02,.555,.395,.91]);makeMesh(frontImage,true,[.665,.665,.985,.995]);
  const triangles=meshes.flatMap(m=>m.triangles),paint=[];
  canvas.dataset.tiles=meshes.map(m=>m.triangles.length).join('/');canvas.dataset.targetRate='30';canvas.dataset.method=diagnostic?'shared-spatial-spine-diagnostic':'articulated-textured-3d';
  let width=0,height=0,dpr=1,wasVisible=false,lastDraw=-Infinity,target=0;
  const fitted={scale:1,x:0,y:0};
  function resize(){const b=canvas.getBoundingClientRect();width=b.width;height=b.height;dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(pixelBudget/Math.max(1,width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);wasVisible=false;lastDraw=-Infinity;}
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
    ctx.strokeStyle='#fdf0d5';ctx.lineWidth=2;ctx.beginPath();
    for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,p=fittedPoint(facePoint3D(.518+Math.cos(a)*.151,.637+Math.sin(a)*.148,head,{}),pose,tx,ty);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.stroke();
    for(const uv of [[.420,.637],[.631,.637],[.518,.731]]){const p=fittedPoint(facePoint3D(...uv,head,{}),pose,tx,ty);ctx.fillStyle=uv[1]>.7?'#ff7467':'#fff';ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();}
    const nose=line[72];ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(nose.x,nose.y,7,0,Math.PI*2);ctx.fill();
    ctx.font='12px ui-monospace, monospace';ctx.textAlign='left';ctx.fillStyle='#fff';ctx.fillText(`HEAD ${Math.round(depth.angles[0]*180/Math.PI)}° → TAIL ${Math.round(depth.angles[5]*180/Math.PI)}°`,20,height-50);ctx.fillText('Same bones, phase and projection as the fish · native scroll',20,height-30);
    canvas.dataset.projectedSpine=JSON.stringify(line.filter((_,i)=>i%12===0).map(p=>[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)]));
  }
  function render(beat,seconds,strength,progress,tx=0,ty=0){
    const visible=diagnostic||beat.active||hasDepth();if(!visible&&!wasVisible)return;
    const now=performance.now();if(visible&&wasVisible&&now-lastDraw<30)return;
    const pose=getLayout(width,height,originalImage);depthColumns(pose.turn,depth,72,columns);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,width,height);
    if(visible){
      for(const mesh of meshes)for(const v of mesh.vertices){
        let local;if(mesh.region){local=frontFinPoint(v.u,v.v,columnViews[61],seconds,strength,v.local);}else if(mesh.face){const uv=viewPoint(v.u,v.v,seconds,true,v.wave);local=facePoint3D(uv.x,uv.y,head,v.local);}else local=surfacePoint(v.motion,seconds,strength,v.column,aspect,v.local,v.wave);
        point(local,pose,tx,ty,v);
      }
      paint.length=0;
      for(const t of triangles){const p=t.p,q=t.q,r=t.r,area=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);if(t.face?area<=.015:Math.abs(area)<=.015)continue;t.depth=(p.z+q.z+r.z)/3;paint.push(t);}
      const bounds=[Infinity,Infinity,-Infinity,-Infinity];
      for(const t of paint)for(const v of [t.p,t.q,t.r]){bounds[0]=Math.min(bounds[0],v.x);bounds[1]=Math.min(bounds[1],v.y);bounds[2]=Math.max(bounds[2],v.x);bounds[3]=Math.max(bounds[3],v.y);}
      fitProjection(bounds,width,height,Math.min(20,width*.045,height*.04),fitted);
      for(const mesh of meshes)for(const v of mesh.vertices){v.x=v.x*fitted.scale+fitted.x;v.y=v.y*fitted.scale+fitted.y;}
      canvas.dataset.fittedBounds=JSON.stringify(bounds.map((v,i)=>+(v*fitted.scale+(i%2?fitted.y:fitted.x)).toFixed(2)));
      canvas.dataset.fitScale=fitted.scale.toFixed(4);
      if(diagnostic)drawDiagnostic(pose,seconds,strength,tx,ty);
      else {
      paint.sort((a,b)=>a.depth-b.depth);
      for(const t of paint){
        const p=t.p,q=t.q,r=t.r,mx=(p.x+q.x+r.x)/3,my=(p.y+q.y+r.y)/3,dx1=q.x-p.x,dx2=r.x-p.x,dy1=q.y-p.y,dy2=r.y-p.y;
        const a=dx1*t.ix1+dx2*t.ix2,b=dy1*t.ix1+dy2*t.ix2,c=dx1*t.iy1+dx2*t.iy2,d=dy1*t.iy1+dy2*t.iy2;
        ctx.save();ctx.beginPath();ctx.moveTo(mx+(p.x-mx)*1.009,my+(p.y-my)*1.009);ctx.lineTo(mx+(q.x-mx)*1.009,my+(q.y-my)*1.009);ctx.lineTo(mx+(r.x-mx)*1.009,my+(r.y-my)*1.009);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,p.x-a*p.sx-c*p.sy,p.y-b*p.sx-d*p.sy);ctx.drawImage(t.image,t.x,t.y,t.w,t.h,t.x,t.y,t.w,t.h);ctx.restore();
      }
      }
      canvas.dataset.visibleTiles=String(paint.length);
    }
    lastDraw=now;wasVisible=visible;
    canvas.dataset.headPitch=(depth.angles[0]*180/Math.PI).toFixed(3);canvas.dataset.tailPitch=(depth.angles[5]*180/Math.PI).toFixed(3);canvas.dataset.pitchBones=Array.from(depth.angles,a=>(a*180/Math.PI).toFixed(3)).join(',');canvas.dataset.mouth=breathOpening(seconds).toFixed(4);canvas.dataset.waveSeconds=seconds.toFixed(4);canvas.dataset.poseProgress=progress.toFixed(6);canvas.dataset.heading=pose.angle.toFixed(3);canvas.dataset.opacity='1';
  }
  resize();return{render,resize,reset,step,hasDepth,settled,diagnostic};
}
