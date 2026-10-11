/* CPU height/velocity solver and slope-driven pixel refraction.
 * Adapted conceptually from the MIT-licensed update/normal passes in
 * jquery.ripples (Pim Schreurs, 2017) and WebGL Water (Evan Wallace, 2011).
 * See THIRD-PARTY-WATER-LICENSES.txt. No WebGL/jQuery dependency is required.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Translation-only coupling: excludes deforming contour/tail/fin oscillation.
export class WaterTravel {
 constructor(){this.previous=null;this.amount=0;this.speed=0;}
 seed(point){this.previous=point?{...point}:null;}
 update(point,seconds,span){
  if(!(seconds>0))return this.amount;
  const dt=Math.min(seconds,.1),valid=point&&Number.isFinite(point.x)&&Number.isFinite(point.y);
  const distance=valid&&this.previous?Math.hypot(point.x-this.previous.x,point.y-this.previous.y):0;
  this.speed=distance>span*.3?0:distance/Math.max(seconds,.001)/Math.max(span,1);
  const target=clamp((this.speed-.008)/.112,0,1);
  this.amount+=(target-this.amount)*(1-Math.exp(-dt/(target>this.amount?.35:1.2)));
  this.seed(valid?point:null);return this.amount;
 }
 get coefficient(){return .07+.11*this.amount;}
}
export class HeightField {
 constructor(width,height){this.resize(width,height);}
 resize(width,height){this.width=width;this.height=height;this.waveCoefficient=.18;this.h=new Float32Array(width*height);this.v=new Float32Array(width*height);this.next=new Float32Array(width*height);this.previousMask=new Float32Array(width*height);this.mask=new Float32Array(width*height);this.normalX=new Float32Array(width*height);this.normalY=new Float32Array(width*height);this.lighting=new Float32Array(width*height);this.initialized=false;this.accumulator=0;this.steps=0;this.lastTail=null;}
 reset(){for(const a of [this.h,this.v,this.next,this.previousMask,this.mask])a.fill(0);this.initialized=false;this.accumulator=0;this.lastTail=null;}
 drive(mask,tail,strength=1,flow={x:0,y:0},seconds=1/20){
  const h=this.h,v=this.v;
  if(!this.initialized){this.previousMask.set(mask);this.initialized=true;this.lastTail=tail?{...tail}:null;return;}
  // Distributed displaced volume: restore old footprint, remove new footprint.
  // Each mask is sampled from the actual deformed fish, not an orbiting emitter.
  for(let y=1;y<this.height-1;y++)for(let x=1;x<this.width-1;x++){
   const i=y*this.width+x,px=clamp(x+flow.x,0,this.width-1.001),py=clamp(y+flow.y,0,this.height-1.001),ix=Math.floor(px),iy=Math.floor(py),u=px-ix,w=py-iy,j=iy*this.width+ix,old=this.previousMask;
   const displaced=(old[j]*(1-u)+old[j+1]*u)*(1-w)+(old[j+this.width]*(1-u)+old[j+this.width+1]*u)*w;
   const delta=clamp(displaced-mask[i],-seconds,seconds)*strength;h[i]+=delta*2.4;v[i]+=delta*.32;
  }
  this.previousMask.set(mask);this.mask.set(mask);
  if(tail&&this.lastTail){const dx=tail.x-this.lastTail.x,dy=tail.y-this.lastTail.y,speed=Math.min(10*seconds,Math.hypot(dx,dy));if(speed>.002){const length=Math.hypot(dx,dy)||1,nx=dx/length,ny=dy/length;
   // Opposed tail-stroke pressure, bounded; no permanent point-source rain.
   this.impulse(tail.x+nx*2,tail.y+ny*2,3.4,speed*.26*strength);
   this.impulse(tail.x-nx*2,tail.y-ny*2,3.4,-speed*.26*strength);
  }}this.lastTail=tail?{...tail}:null;
 }
 impulse(cx,cy,radius,amount){const w=this.width,hh=this.height;for(let y=Math.max(1,Math.floor(cy-radius));y<Math.min(hh-1,cy+radius);y++)for(let x=Math.max(1,Math.floor(cx-radius));x<Math.min(w-1,cx+radius);x++){const r=Math.hypot(x-cx,y-cy)/radius;if(r<1)this.v[y*w+x]+=amount*(.5+.5*Math.cos(r*Math.PI));}}
 advance(seconds){this.accumulator+=clamp(seconds,0,.1);let count=0;while(this.accumulator>=1/60&&count<6){this.step();this.accumulator-=1/60;count++;}return count;}
 step(){const w=this.width,hh=this.height,h=this.h,v=this.v,n=this.next;for(let y=1;y<hh-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,lap=h[i-1]+h[i+1]+h[i-w]+h[i+w]-4*h[i];const edge=Math.min(x,y,w-1-x,hh-1-y),damp=edge<10?.86+edge*.012:.987;v[i]=(v[i]+lap*this.waveCoefficient)*damp;n[i]=(h[i]+v[i])*.999;}this.h=n;this.next=h;this.steps++;}
 energy(){let e=0;for(let i=0;i<this.h.length;i++)e+=this.h[i]**2+this.v[i]**2;return e;}
}
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return(hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
export function makeReflectionPixels(w,h){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,n=noise(x/39,y/39)*.6+noise(x/13,y/13)*.3+noise(x/5,y/5)*.1,patch=Math.max(0,n-.48)*14,shade=(n-.5)*6;data[i]=clamp(204+shade+patch,0,255);data[i+1]=clamp(46+shade*.7+patch*.65,0,255);data[i+2]=clamp(43+shade*.7+patch*.45,0,255);data[i+3]=255;}return data;}
// Every output samples immutable source pixels at slope-displaced coordinates.
// Normals/curvature are derived from persistent simulated heights, not sine art.
export function refractPixels(field,source,out,w,h,{gain=160,light=620}={}){
 const gw=field.width,gh=field.height,a=field.h,sx=(gw-3)/w,sy=(gh-3)/h,normX=field.normalX,normY=field.normalY,lighting=field.lighting;let maxDisplacement=0,affected=0;
 for(let y=1;y<gh-1;y++)for(let x=1;x<gw-1;x++){const k=y*gw+x,nx=(a[k+1]-a[k-1])*.5,ny=(a[k+gw]-a[k-gw])*.5;normX[k]=clamp(nx*gain,-14,14);normY[k]=clamp(ny*gain,-14,14);lighting[k]=Math.tanh((ny*.8-nx*.6)*light/29)*29+Math.tanh((a[k-1]+a[k+1]+a[k-gw]+a[k+gw]-4*a[k])*-9)*7;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const gx=1+x*sx,gy=1+y*sy,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,k=iy*gw+ix,w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
  const dx=normX[k]*w00+normX[k+1]*w10+normX[k+gw]*w01+normX[k+gw+1]*w11,dy=normY[k]*w00+normY[k+1]*w10+normY[k+gw]*w01+normY[k+gw+1]*w11,shine=lighting[k]*w00+lighting[k+1]*w10+lighting[k+gw]*w01+lighting[k+gw+1]*w11;
  const xx=clamp(x+dx,0,w-1.001),yy=clamp(y+dy,0,h-1.001),px=Math.floor(xx),py=Math.floor(yy),u=xx-px,v=yy-py,j=(py*w+px)*4,i=(y*w+x)*4;
  const displacement=Math.hypot(dx,dy);maxDisplacement=Math.max(maxDisplacement,displacement);if(displacement>.25)affected++;
  for(let channel=0;channel<3;channel++){const value=(source[j+channel]*(1-u)+source[j+4+channel]*u)*(1-v)+(source[j+w*4+channel]*(1-u)+source[j+(w+1)*4+channel]*u)*v;out[i+channel]=value+shine*(channel===0?1:channel===1?.9:.72);}out[i+3]=255;
 }
 return{maxDisplacement,affected};
}
