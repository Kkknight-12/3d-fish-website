import { LOOP_SECONDS, TAU } from './motion.js';
import { preparePoint, writePoint, spineColumns } from './spine.js';

// WebGL is optional: a missing GPU must not silently disable the scroll journey.
export function selectRenderer(webgl, canvas,preferCanvas=false) {
  if(preferCanvas){
    try{return{renderer:canvas(),type:'canvas-deforming-mesh'};}
    catch(error){return{renderer:webgl(),type:'webgl-deforming-mesh',reason:error.message};}
  }
  try { return { renderer: webgl(), type: 'webgl-deforming-mesh' }; }
  catch (error) { return { renderer: canvas(), type: 'canvas-deforming-mesh', reason: error.message }; }
}

// Affine texture mapping from a source-image triangle to a deformed triangle.
export function triangleTransform(source, target) {
  const [s0,s1,s2]=source,[d0,d1,d2]=target;
  const sx1=s1.x-s0.x,sy1=s1.y-s0.y,sx2=s2.x-s0.x,sy2=s2.y-s0.y;
  const dx1=d1.x-d0.x,dy1=d1.y-d0.y,dx2=d2.x-d0.x,dy2=d2.y-d0.y;
  const det=sx1*sy2-sx2*sy1;
  if(Math.abs(det)<1e-10)return null;
  const a=(dx1*sy2-dx2*sy1)/det,c=(sx1*dx2-sx2*dx1)/det;
  const b=(dy1*sy2-dy2*sy1)/det,d=(sx1*dy2-sx2*dy1)/det;
  return [a,b,c,d,d0.x-a*s0.x-c*s0.y,d0.y-b*s0.x-d*s0.y];
}

export function createCanvasRenderer(canvas,image,getLayout,onFrame,pixelBudget=1100000) {
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw new Error('Canvas rendering unavailable');
  const levels=[[12,6],[16,8],[20,10],[24,12]];
  let level=2,vertices=[],triangles=[],columns,cols,width=0,height=0,dpr=1;
  let turnVersion=-1,average=0,samples=0;
  const aspect=image.height/image.width;
  function mesh(){
    [cols]=levels[level];const rows=levels[level][1];
    columns=new Float32Array((cols+1)*4);vertices=[];triangles=[];
    const views=Array.from({length:cols+1},(_,i)=>columns.subarray(i*4,i*4+4));
    for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
      const u=col/cols,v=row/rows;
      vertices.push({motion:preparePoint(u,v),column:views[col],sx:u*image.width,sy:(1-v)*image.height,local:{x:0,y:0},x:0,y:0});
    }
    function triangle(a,b,c){
      const p=vertices[a],q=vertices[b],r=vertices[c];
      const sx1=q.sx-p.sx,sy1=q.sy-p.sy,sx2=r.sx-p.sx,sy2=r.sy-p.sy,det=sx1*sy2-sx2*sy1;
      const x=Math.max(0,Math.min(p.sx,q.sx,r.sx)-2),y=Math.max(0,Math.min(p.sy,q.sy,r.sy)-2);
      triangles.push({p,q,r,ix1:sy2/det,ix2:-sy1/det,iy1:-sx2/det,iy2:sx1/det,x,y,w:Math.min(image.width,Math.max(p.sx,q.sx,r.sx)+2)-x,h:Math.min(image.height,Math.max(p.sy,q.sy,r.sy)+2)-y});
    }
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;triangle(a,c,b);triangle(b,c,d);
    }
    turnVersion=-1;canvas.dataset.mesh=`${cols}x${rows}`;
  }
  function resize(){
    const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;
    dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(pixelBudget/Math.max(1,width*height)));
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    canvas.dataset.pixelRatio=dpr.toFixed(3);
  }
  function render(seconds,strength,tx=0,ty=0){
    const started=performance.now(),phase=(seconds%LOOP_SECONDS)/LOOP_SECONDS*TAU;
    const pose=getLayout(width,height,image),angle=pose.angle*Math.PI/180+tx*.035;
    if(turnVersion!==pose.turn.version){spineColumns(pose.turn,cols,columns);turnVersion=pose.turn.version;}
    const cos=Math.cos(angle),sin=Math.sin(angle),cx=pose.centerX+tx*9,cy=pose.centerY-ty*7;
    for(const vertex of vertices){
      const p=writePoint(vertex.motion,phase,strength,vertex.column,aspect,vertex.local),x=p.x*pose.fishWidth,y=p.y*pose.fishHeight;
      vertex.x=cx+x*cos-y*sin;vertex.y=height-cy-x*sin-y*cos;
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    for(const t of triangles){
      const p=t.p,q=t.q,r=t.r,mx=(p.x+q.x+r.x)/3,my=(p.y+q.y+r.y)/3;
      const dx1=q.x-p.x,dx2=r.x-p.x,dy1=q.y-p.y,dy2=r.y-p.y;
      const a=dx1*t.ix1+dx2*t.ix2,b=dy1*t.ix1+dy2*t.ix2,c=dx1*t.iy1+dx2*t.iy2,d=dy1*t.iy1+dy2*t.iy2;
      ctx.save();ctx.beginPath();
      ctx.moveTo(mx+(p.x-mx)*1.012,my+(p.y-my)*1.012);
      ctx.lineTo(mx+(q.x-mx)*1.012,my+(q.y-my)*1.012);
      ctx.lineTo(mx+(r.x-mx)*1.012,my+(r.y-my)*1.012);
      ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,p.x-a*p.sx-c*p.sy,p.y-b*p.sx-d*p.sy);
      ctx.drawImage(image,t.x,t.y,t.w,t.h,t.x,t.y,t.w,t.h);ctx.restore();
    }
    onFrame(phase,strength,pose);
    const cost=performance.now()-started;average=samples?average*.94+cost*.06:cost;samples++;
    // Adapt only at stable boundaries, avoiding frequent mesh switches.
    if(samples>=90&&average>8&&level>0){level--;mesh();samples=0;}
    else if(samples>=240&&average<2&&level<levels.length-1){level++;mesh();samples=0;}
  }
  mesh();resize();return{render,resize};
}
