/** Bounded intrinsic eye charts, fixed to the one existing skin surface. */
import {bodyContour,continuousBodyPoint} from './body-geometry.js';
const clamp=n=>Math.max(-1,Math.min(1,n));
export function eyeCharts(aspect=.5){
  return [{id:'upper',u:.93493595766,v:.45129493925,textureU:.7901,textureV:.5766},
    {id:'lower',u:.93386221456,v:.60886553043,textureU:.2103,textureV:.5772}].map(e=>{
      const p=bodyContour(e.u,aspect);
      const theta=Math.acos(clamp(1-2*(e.v-p.top)/(p.bottom-p.top))),h=1e-5;
      const point=(u,t)=>{const p=continuousBodyPoint(u,t,aspect);return[p.u,p.y,p.z];};
      const sub=(a,b)=>a.map((x,i)=>(x-b[i])/(2*h)),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
      const du=sub(point(e.u+h,theta),point(e.u-h,theta)),dt=sub(point(e.u,theta+h),point(e.u,theta-h));
      const tx=norm(dt).map(x=>-x),ty=norm(du.map((x,i)=>x-dot(du,tx)*tx[i]));
      const radius=.0145,A=[dot(du,tx)/radius,dot(dt,tx)/radius,dot(du,ty)/radius,dot(dt,ty)/radius];
      const det=A[0]*A[3]-A[1]*A[2],inverse=[A[3]/det,-A[1]/det,-A[2]/det,A[0]/det];
      return {...e,theta,radius,A,inverse,uRadius:Math.hypot(inverse[0],inverse[1]),thetaRadius:Math.hypot(inverse[2],inverse[3])};
    });
}
export function intrinsicEyeUV(p,e){
  const du=p.u-e.u,dt=p.theta-e.theta;const x=e.A[0]*du+e.A[1]*dt,y=e.A[2]*du+e.A[3]*dt;
  return {u:.5+x/2.8,v:.5+y/2.8,r:Math.hypot(x,y),x,y};
}
/** Refine eye-adjacent original triangles by linear barycentric subdivision.
 * Midpoints stay on the SAME original facets; there is no second eyeball or
 * any altered body/fin silhouette. All other triangles retain original indices.
 */
export function refineEyeSurface(model,eyes,n=4){
  const vertices=model.vertices.slice(),triangles=[];
  const blend=(p,q,r,a,b)=>{
    const c=1-a-b,out={};
    for(const key of ['u','v','y','z','originalU','originalV','frontU','frontV','linearFrontU','linearFrontV','registeredFrontU','registeredFrontV','theta'])out[key]=p[key]*c+q[key]*a+r[key]*b;
    return {...out,seam:false,chart:'dorsal'};
  };
  for(const t of model.triangles){
    const ps=[vertices[t.a],vertices[t.b],vertices[t.c]];
    const loU=Math.min(...ps.map(p=>p.u)),hiU=Math.max(...ps.map(p=>p.u));
    const loT=Math.min(...ps.map(p=>p.theta)),hiT=Math.max(...ps.map(p=>p.theta));
    const near=t.chart==='dorsal'&&eyes.some(e=>hiU>e.u-e.uRadius*1.6&&loU<e.u+e.uRadius*1.6&&hiT>e.theta-e.thetaRadius*1.6&&loT<e.theta+e.thetaRadius*1.6);
    if(!near){triangles.push(t);continue;}
    const ids=new Map();
    const at=(i,j)=>{const key=`${i},${j}`;if(!ids.has(key)){ids.set(key,vertices.length);vertices.push(blend(...ps,i/n,j/n));}return ids.get(key);};
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
      triangles.push({...t,a:at(i,j),b:at(i+1,j),c:at(i,j+1)});
      if(i+j<n-1)triangles.push({...t,a:at(i+1,j),b:at(i+1,j+1),c:at(i,j+1)});
    }
  }
  return {...model,vertices,triangles};
}
/** Code-proof fill only: no generative inpainting or source asset changes. */
export function eraseTextureEyes(canvas,front=false){
  const g=canvas.getContext('2d');
  const specs=front?[[.2103,.5772,.062,.108],[.7901,.5766,.062,.108]]:[[.93493595766,.45129493925,.022,.029],[.93386221456,.60886553043,.022,.029]];
  for(const [u,v,rx,ry] of specs){g.save();g.translate(u*canvas.width,v*canvas.height);g.scale(rx*canvas.width,ry*canvas.height);
    const grad=g.createRadialGradient(0,0,.77,0,0,1);grad.addColorStop(0,'rgba(239,231,212,1)');grad.addColorStop(1,'rgba(239,231,212,0)');g.fillStyle=grad;g.beginPath();g.arc(0,0,1,0,Math.PI*2);g.fill();g.restore();}
  return canvas;
}
export function makeEyeTexture(image,e){
  const c=document.createElement('canvas');c.width=256;c.height=384;const g=c.getContext('2d');
  const rx=.036*1.4,ry=.073*1.4;
  g.drawImage(image,(e.textureU-rx)*image.width,(e.textureV-ry)*image.height,2*rx*image.width,2*ry*image.height,0,0,c.width,c.height);
  g.globalCompositeOperation='destination-in';g.save();g.translate(c.width/2,c.height/2);g.scale(c.width/2,c.height/2);
  const fade=g.createRadialGradient(0,0,.79,0,0,1);fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=fade;g.fillRect(-1,-1,2,2);g.restore();return c;
}

/** Eye-free forehead/snout chart, registered to the SAME measured anatomy.
 * Fixed for all viewing directions: the face layout cannot migrate on retreat.
 */
export function anatomicalFaceUV(y,z){
  const map=(x,pts)=>{let i=0;while(i<pts.length-2&&x>pts[i+1][0])i++;const a=pts[i],b=pts[i+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*t;};
  const eyeZ=map(y,[[-.0544327652,.0516520132],[.0243525304,.0443547139]]);
  return {u:map(y,[[-.090,.04],[-.0544327652,.2103],[-.019,.5],[.0243525304,.7901],[.052,.97]]),
    v:map(z,[[-.036,.965],[-.0156703297,.835],[eyeZ,.577],[.112,.05]])};
}

/** One opaque intrinsic skin atlas: base skin and iris are composited BEFORE
 * triangle rasterization. Expanded neighboring triangles therefore never paint
 * bare ivory over an already drawn subpixel pupil. No second geometry/pass.
 * Uses the caller's already-prepared original skin, including its mouth fade.
 */
export function makeIntrinsicSkinAtlas(original,front,eyes,aspect=.5){
  const atlas=document.createElement('canvas');atlas.width=1536;atlas.height=512;
  const ctx=atlas.getContext('2d'),out=ctx.createImageData(atlas.width,atlas.height);
  const read=c=>({data:c.getContext('2d').getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height});
  const source=read(original),eyeSources=eyes.map(e=>read(e.image));
  const sample=(im,u,v,dst)=>{
    const x=Math.max(0,Math.min(im.w-1,u*(im.w-1))),y=Math.max(0,Math.min(im.h-1,v*(im.h-1)));
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,im.w-1),y1=Math.min(y0+1,im.h-1),fx=x-x0,fy=y-y0;
    for(let k=0;k<4;k++)dst[k]=(im.data[(y0*im.w+x0)*4+k]*(1-fx)+im.data[(y0*im.w+x1)*4+k]*fx)*(1-fy)+(im.data[(y1*im.w+x0)*4+k]*(1-fx)+im.data[(y1*im.w+x1)*4+k]*fx)*fy;
  };
  const base=new Float64Array(4),paint=new Float64Array(4),cos=Array.from({length:atlas.height},(_,j)=>Math.cos(j/(atlas.height-1)*Math.PI));
  for(let i=0;i<atlas.width;i++){
    const u=.625+(.987-.625)*i/(atlas.width-1),contour=bodyContour(u,aspect);
    for(let j=0;j<atlas.height;j++){
      const theta=j/(atlas.height-1)*Math.PI,v=contour.top+(contour.bottom-contour.top)*(1-cos[j])/2;
      sample(source,u,v,base);
      for(let n=0;n<eyes.length;n++){
        const uv=intrinsicEyeUV({u,theta},eyes[n]);if(uv.r>=1.4)continue;
        sample(eyeSources[n],uv.u,uv.v,paint);const a=paint[3]/255;
        for(let k=0;k<3;k++)base[k]=base[k]*(1-a)+paint[k]*a;
      }
      const at=(j*atlas.width+i)*4;out.data[at]=base[0];out.data[at+1]=base[1];out.data[at+2]=base[2];out.data[at+3]=255;
    }
  }
  ctx.putImageData(out,0,0);return atlas;
}
export function intrinsicSkinUV(p){return {u:(p.u-.625)/(.987-.625),v:p.theta/Math.PI};}
