// Immutable baseline fitting rig. Keep independent of repaired head/fin geometry.
// Only the fit transform is used; these surfaces are never painted.
import {ramp,breathOpening} from './view-beat.js';
import {preparePoint,writePoint} from './spine.js';
import {TAU,LOOP_SECONDS} from './motion.js';
const HEAD_JOIN_U=.825,HEAD_PAINT_TOP=.36,HEAD_PAINT_BOTTOM=.70;
const isDorsalHead=(u,v)=>u>=HEAD_JOIN_U&&v>=HEAD_PAINT_TOP&&v<=HEAD_PAINT_BOTTOM;
const straight=[0,0,1,0];
function surfacePoint(motion,seconds,strength,column,aspect,out={},wave={}){
  const phase=seconds/LOOP_SECONDS*TAU;
  writePoint(motion,phase,strength,straight,aspect,wave);
  const lateral=wave.y*aspect,tail=motion.tail/.045,fin=motion.fin/.048;
  const body=ramp(.38,.55,motion.u)*(1-ramp(.91,1,motion.u));
  const dome=.105*Math.sqrt(Math.max(0,1-(lateral/.10)**2))*body;
  const curl=fin*(-.17*Math.sin((.86-motion.u)*6)+strength*.055*Math.sin(phase*2+motion.y*6))
    +tail*(motion.y*.16+strength*.085*Math.sin(phase*2-motion.u*7.4+motion.y*4));
  return framePoint(column,wave.x,lateral,dome+curl,out);
}

function pectoralSurfacePoint(motion,seconds,strength,column,aspect,out={},wave={}){
  surfacePoint(motion,seconds,strength,column,aspect,out,wave);
  const v=1-motion.v,wing=(1-ramp(.34,.43,v))+ramp(.62,.73,v);
  const span=ramp(.60,.625,motion.u)*(1-ramp(.88,.91,motion.u));
  const pitch=Math.max(0,Math.atan2(column[6],column[5]));
  const rootPin=ramp(0,.025,Math.abs(motion.u-.842));
  const hinge=-1.22*ramp(.25,1.3,pitch)*Math.min(1,wing)*span*rootPin;
  // Rotate the entire existing fan, including its curl, about its root.
  // Rotating only longitudinal reach left the curl flattened into ribbons.
  const normal=-(out.x-column[0])*column[3]*column[6]-(out.y-column[1])*column[4]*column[6]+(out.z-column[2])*column[5];
  const reach=motion.u-.842,lift=normal-.015;
  const dx=reach*(Math.cos(hinge)-1)-lift*Math.sin(hinge),dz=reach*Math.sin(hinge)+lift*(Math.cos(hinge)-1)-.17*ramp(.45,1.4,pitch)*Math.min(1,wing)*span*rootPin;
  out.x+=dx*column[3]*column[5]-dz*column[3]*column[6];
  out.y+=dx*column[4]*column[5]-dz*column[4]*column[6];
  out.z+=dx*column[6]+dz*column[5];
  return out;
}

function volumeSurfacePoint(motion,volumeZ,frontU,frontV,seconds,strength,column,aspect,out={},wave={}){
  writePoint(motion,seconds/LOOP_SECONDS*TAU,strength,straight,aspect,wave);
  const lip=Math.max(0,1-((frontU-.518)/.06)**2-((frontV-.731)/.035)**2);
  const z=volumeZ+.004*lip*(breathOpening(seconds)-.3);
  return framePoint(column,wave.x,wave.y*aspect,z,out);
}

function framePoint(column,x,y,z,out={}){
  const [cx,cy,cz,c,s,cp,sp]=column;
  out.x=cx+x*c*cp-y*s-z*c*sp;
  out.y=cy+x*s*cp+y*c-z*s*sp;
  out.z=cz+x*sp+z*cp;return out;
}

function project3D(p,pose,width,height,tx=0,ty=0,out={}){
  const angle=pose.angle*Math.PI/180+tx*.035,c=Math.cos(angle),s=Math.sin(angle);
  out.x=pose.centerX+tx*9+(p.x*c-p.y*s)*pose.fishWidth;
  out.y=height-pose.centerY+ty*7-(p.x*s+p.y*c)*pose.fishWidth;
  out.z=p.z*pose.fishWidth;return out;
}

function fitProjection(bounds,width,height,padding=16,out={}){
  const [left,top,right,bottom]=bounds,cx=(left+right)/2,cy=(top+bottom)/2;
  const scale=Math.min(1,(width-2*padding)/Math.max(1,right-left),(height-2*padding)/Math.max(1,bottom-top));
  const l=cx+(left-cx)*scale,r=cx+(right-cx)*scale,t=cy+(top-cy)*scale,b=cy+(bottom-cy)*scale;
  out.scale=scale;out.x=(1-scale)*cx+(l<padding?padding-l:r>width-padding?width-padding-r:0);
  out.y=(1-scale)*cy+(t<padding?padding-t:b>height-padding?height-padding-b:0);return out;
}

/** Cache the exact original topology and source-alpha occupancy once.
 * alphaData, if supplied, is originalImage's width*height*4 RGBA byte array.
 * No alpha scan applies to the volume, matching the baseline renderer.
 */
export function createReferenceFit(originalImage,frontImage,alphaData=null){
  const columns=new Float64Array(73*7);
  const columnViews=Array.from({length:73},(_,i)=>columns.subarray(i*7,(i+1)*7));
  const aspect=originalImage.height/originalImage.width;
  const meshes=[];
  function makeMesh(image,face=false,region=null){
    const vertices=[],triangles=[];let grid=null;
    const vertex=(u,v)=>{vertices.push({u,v,sx:u*image.width,sy:v*image.height,x:0,y:0,z:0,local:{},wave:{},motion:preparePoint(u,1-v),column:columnViews[Math.round(u*72)]});return vertices.length-1;};
    let alpha=null;
    if((!face||region)&&alphaData){alpha=alphaData;}else if(!face||region){const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const scan=probe.getContext('2d',{willReadFrequently:true});scan.drawImage(image,0,0);alpha=scan.getImageData(0,0,image.width,image.height).data;}
    function add(a,b,c){
      const p=vertices[a],q=vertices[b],r=vertices[c],sx1=q.sx-p.sx,sy1=q.sy-p.sy,sx2=r.sx-p.sx,sy2=r.sy-p.sy,det=sx1*sy2-sx2*sy1;
      if(!face&&!region&&isDorsalHead((p.u+q.u+r.u)/3,(p.v+q.v+r.v)/3))return;
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
        const n=3,patch=[];
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
  makeMesh(originalImage);
  function textureData(image,p,q,r,front=false){
    const uv=v=>front?[v.frontU*image.width,v.frontV*image.height]:[v.sx,v.sy];
    const [px,py]=uv(p),[qx,qy]=uv(q),[rx,ry]=uv(r),dx1=qx-px,dy1=qy-py,dx2=rx-px,dy2=ry-py,det=dx1*dy2-dx2*dy1;
    if(Math.abs(det)<.001)return null;
    const x=Math.max(0,Math.min(px,qx,rx)-2),y=Math.max(0,Math.min(py,qy,ry)-2),w=Math.min(image.width,Math.max(px,qx,rx)+2)-x,h=Math.min(image.height,Math.max(py,qy,ry)+2)-y;
    return {image,px,py,ix1:dy2/det,ix2:-dy1/det,iy1:-dx2/det,iy2:dx1/det,x,y,w,h};
  }
  function makeVolume(){
    const vertices=[],triangles=[],rings=28,segments=40;
    for(let ring=0;ring<=rings;ring++){
      const nx=-Math.cos(ring/rings*Math.PI),radius=Math.sin(ring/rings*Math.PI),u=.85+.15*nx;
      for(let j=0;j<segments;j++){
        const angle=j/segments*Math.PI*2,ny=radius*Math.cos(angle),nz=radius*Math.sin(angle);
        const lateral=-.0175+.112*ny,v=.5-lateral/aspect;
        vertices.push({u,v,sx:u*originalImage.width,sy:v*originalImage.height,frontU:.518+.151*ny,frontV:.637-.148*nz,volumeZ:.012+.130*nz,x:0,y:0,z:0,local:{},wave:{},motion:preparePoint(u,1-v),column:columnViews[Math.round(u*72)]});
      }
    }
    function add(a,b,c){const p=vertices[a],q=vertices[b],r=vertices[c];const original=textureData(originalImage,p,q,r),front=textureData(frontImage,p,q,r,true);if(!original&&!front)return;triangles.push({p,q,r,volume:true,original,front,depth:0});}
    for(let ring=0;ring<rings;ring++)for(let j=0;j<segments;j++){
      const a=ring*segments+j,b=ring*segments+(j+1)%segments,c=a+segments,d=b+segments;
      add(a,b,c);add(b,d,c);
    }
    meshes.push({volume:true,vertices,triangles});
  }
  makeVolume();

  return {columns,aspect,meshes,triangles:meshes.flatMap(m=>m.triangles)};
}

/** Supply the current baseline depthColumns output and unchanged pose/clock.
 * Returns scale/x/y plus untransformed baseline visible bounds and tile count.
 * All working vertices are private to this reference and reused every frame.
 */
export function computeReferenceFit(reference,pose,columns,seconds,strength,width,height,tx=0,ty=0,out={}){
  reference.columns.set(columns);
  const {aspect,meshes,triangles}=reference;
  for(const mesh of meshes)for(const v of mesh.vertices){
    if(v.boundary){const {a,b,mix}=v.boundary;v.x=a.x+(b.x-a.x)*mix;v.y=a.y+(b.y-a.y)*mix;v.z=a.z+(b.z-a.z)*mix;continue;}
    const local=mesh.volume?volumeSurfacePoint(v.motion,v.volumeZ,v.frontU,v.frontV,seconds,strength,v.column,aspect,v.local,v.wave):pectoralSurfacePoint(v.motion,seconds,strength,v.column,aspect,v.local,v.wave);
    project3D(local,pose,width,height,tx,ty,v);
  }
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];let visibleTiles=0;
  for(const t of triangles){
    const p=t.p,q=t.q,r=t.r,area=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    if(t.volume?area>=-.015:t.face?area<=.015:Math.abs(area)<=.015)continue;
    visibleTiles++;
    for(const v of [p,q,r]){bounds[0]=Math.min(bounds[0],v.x);bounds[1]=Math.min(bounds[1],v.y);bounds[2]=Math.max(bounds[2],v.x);bounds[3]=Math.max(bounds[3],v.y);}
  }
  fitProjection(bounds,width,height,Math.min(20,width*.045,height*.04),out);
  out.bounds=bounds;out.visibleTiles=visibleTiles;
  return out;
}
