import {deformPectoralPoint} from './fin-geometry.js';
import {bodyContour,bodySkinPoint} from './body-geometry.js';
import {ramp,breathOpening} from './view-beat.js';
import {preparePoint,writePoint} from './spine.js';
import {TAU,LOOP_SECONDS} from './motion.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DEPTH_STRIDE=7;
export const HEAD_JOIN_U=.825;
export const HEAD_NECK_OVERLAP=.025;
export const HEAD_PAINT_TOP=.36,HEAD_PAINT_BOTTOM=.70;
export const isDorsalHead=(u,v)=>u>=HEAD_JOIN_U&&v>=HEAD_PAINT_TOP&&v<=HEAD_PAINT_BOTTOM;
export function turnPitch(progress,reduced=false){return reduced?0:Math.PI/2*ramp(.54,.78,progress)*(1-ramp(.86,.99,progress));}
export const restPitch=(pitch,index)=>pitch*(1-index*.12/(Math.PI/2));
export function createDepthTurn(pitch=0){return{angles:Float64Array.from({length:6},(_,i)=>restPitch(pitch,i)),velocity:0};}
export function depthSettled(state,target){return Math.abs(state.velocity)<.0001&&state.angles.every((a,i)=>Math.abs(a-restPitch(target,i))<.00001);}
export function stepDepthTurn(state,target,seconds,reduced=false){
  if(reduced){state.angles.fill(0);state.velocity=0;return;}
  let remaining=seconds;const a=state.angles;
  while(remaining>1e-9){
    const dt=Math.min(remaining,1/120);remaining-=dt;
    const delta=target-a[0],desired=clamp(delta*7,-2,2);
    state.velocity+=(desired-state.velocity)*(1-Math.exp(-dt/.10));
    const advance=state.velocity*dt;
    if(advance*delta>0&&Math.abs(advance)>Math.abs(delta)){a[0]=target;state.velocity=0;}else a[0]+=advance;
    a[0]=clamp(a[0],0,Math.PI/2);
    for(let i=1;i<a.length;i++){const follow=a[i-1]-.12*a[0]/(Math.PI/2);a[i]+=(follow-a[i])*(1-Math.exp(-dt/(.10+i*.035)));a[i]=clamp(a[i],a[0]-.65,a[0]+.65);}
  }
  if(depthSettled(state,target)){a.forEach((_,i)=>a[i]=restPitch(target,i));state.velocity=0;}
}
function boneAt(angles,u,relative=false){
  const t=clamp((.82-u)/.82*5,0,5),i=Math.min(4,Math.floor(t)),f=t-i,e=f*f*(3-2*f);
  return u>=.82?(relative?0:angles[0]):angles[i]+(angles[i+1]-angles[i])*e-(relative?angles[0]:0);
}
// A constant-length spatial spine. Pitch brings its forward axis toward the
// camera; the existing in-plane yaw bones remain the accepted swimming driver.
export function depthColumns(yaw,depth,cols,out=new Float64Array((cols+1)*DEPTH_STRIDE)){
  let x=.5,y=0,z=0;
  for(let i=cols;i>=0;i--){
    if(i<cols){const u=(i+.5)/cols,angle=boneAt(yaw.angles,u,true),pitch=boneAt(depth.angles,u),cp=Math.cos(pitch);x-=Math.cos(angle)*cp/cols;y-=Math.sin(angle)*cp/cols;z-=Math.sin(pitch)/cols;}
    const u=i/cols,angle=boneAt(yaw.angles,u,true),pitch=boneAt(depth.angles,u),at=i*DEPTH_STRIDE;
    out[at]=x;out[at+1]=y;out[at+2]=z;out[at+3]=Math.cos(angle);out[at+4]=Math.sin(angle);out[at+5]=Math.cos(pitch);out[at+6]=Math.sin(pitch);
  }
  return out;
}
const straight=[0,0,1,0];
export function surfacePoint(motion,seconds,strength,column,aspect,out={},wave={}){
  const phase=seconds/LOOP_SECONDS*TAU;
  writePoint(motion,phase,strength,straight,aspect,wave);
  const lateral=wave.y*aspect,tail=motion.tail/.045,fin=motion.fin/.048;
  const body=ramp(.38,.55,motion.u)*(1-ramp(.91,1,motion.u));
  const dome=.105*Math.sqrt(Math.max(0,1-(lateral/.10)**2))*body;
  const curl=fin*(-.17*Math.sin((.86-motion.u)*6)+strength*.055*Math.sin(phase*2+motion.y*6))
    +tail*(motion.y*.16+strength*.085*Math.sin(phase*2-motion.u*7.4+motion.y*4));
  return framePoint(column,wave.x,lateral,dome+curl,out);
}
// Unfold the existing pectoral planes around their painted roots as the body
// faces the camera. Preserve the source fan outline and the swimming field;
// there is no extra fin, width stretch or independently moving attachment.
// The painted fin border is attached to the same analytic skin edge as the
// closed trunk. Preserve source waves; change only the out-of-plane collar.
export function attachedFinSurface(motion,seconds,strength,column,aspect,out={},wave={}){
  surfacePoint(motion,seconds,strength,column,aspect,out,wave);
  if(motion.u<.625||motion.u>.89)return out;
  const uv=1-motion.v,profile=bodyContour(motion.u,aspect);
  // The source-alpha cutout runs through affine sheet triangles, not only
  // their vertices. Carry the skin correction through one full coarse row
  // INSIDE the erased body so those triangles cannot interpolate between a
  // corrected fin and an uncorrected interior vertex at the visible border.
  // Only the masked inner collar fades; the actual edge has zero fade slope.
  const upperDistance=uv-profile.top,lowerDistance=profile.bottom-uv;
  const edgeV=upperDistance<=lowerDistance?profile.top:profile.bottom;
  const inside=Math.max(0,Math.min(upperDistance,lowerDistance));
  const collar=1-ramp(.085,.135,inside);
  if(collar===0)return out;
  const edgeMotion=preparePoint(motion.u,1-edgeV),edge=surfacePoint(edgeMotion,seconds,strength,column,aspect,{},{});
  const oldZ=-(edge.x-column[0])*column[3]*column[6]-(edge.y-column[1])*column[4]*column[6]+(edge.z-column[2])*column[5];
  const newZ=bodySkinPoint(motion.u,edgeV,aspect).z;
  const dz=(newZ-oldZ)*ramp(.625,.665,motion.u)*collar;
  out.x-=dz*column[3]*column[6];out.y-=dz*column[4]*column[6];out.z+=dz*column[5];
  return out;
}
export function pectoralSurfacePoint(motion,seconds,strength,column,aspect,out={},wave={}){
  attachedFinSurface(motion,seconds,strength,column,aspect,out,wave);
  return deformPectoralPoint(motion,seconds,strength,column,aspect,out,wave,attachedFinSurface,(u,side,a)=>{const b=bodyContour(u,a);return side>0?b.top:b.bottom;});
}
// Keep the original face paint on the same surface as its neck and pectorals.
// Only head height changes: every boundary is welded to the original surface,
// and zero pitch projects to the original artwork without a material switch.
export function headSurfacePoint(motion,seconds,strength,column,aspect,out={},wave={}){
  pectoralSurfacePoint(motion,seconds,strength,column,aspect,out,wave);
  const imageV=1-motion.v,lateral=wave.y*aspect;
  const blend=ramp(HEAD_JOIN_U,.88,motion.u)*ramp(HEAD_PAINT_TOP,.43,imageV)*(1-ramp(.64,HEAD_PAINT_BOTTOM,imageV));
  const along=(motion.u-.855)/.145,across=(lateral+.0175)/.095;
  const cap=.230*Math.sqrt(Math.max(0,1-along*along-across*across))-.095*(1-ramp(.99,1,motion.u));
  const body=ramp(.38,.55,motion.u)*(1-ramp(.91,1,motion.u));
  const dome=.105*Math.sqrt(Math.max(0,1-(lateral/.10)**2))*body;
  const lip=Math.max(0,1-((motion.u-.982)/.022)**2-((imageV-.538)/.037)**2);
  const lift=(cap-dome+.003*lip*(breathOpening(seconds)-.3))*blend;
  out.x-=lift*column[3]*column[6];out.y-=lift*column[4]*column[6];out.z+=lift*column[5];
  return out;
}
// A closed ovoid replaces the open head height field during the depth turn.
// Source UVs and the frontal chart live on this single surface, rather than
// rendering another face in front of the original. The rear overlaps the
// existing neck; all points still follow the accepted columns and wave clock.
export function volumeSurfacePoint(motion,volumeZ,frontU,frontV,seconds,strength,column,aspect,out={},wave={},axialOffset=0){
  writePoint(motion,seconds/LOOP_SECONDS*TAU,strength,straight,aspect,wave);
  const lip=Math.max(0,1-((frontU-.50)/.09)**2-((frontV-.835)/.045)**2)*ramp(.80,.88,motion.u);
  const z=volumeZ-.008*lip*(breathOpening(seconds)-.3);
  return framePoint(column,wave.x+axialOffset,wave.y*aspect,z,out);
}
export function framePoint(column,x,y,z,out={}){
  const [cx,cy,cz,c,s,cp,sp]=column;
  out.x=cx+x*c*cp-y*s-z*c*sp;
  out.y=cy+x*s*cp+y*c-z*s*sp;
  out.z=cz+x*sp+z*cp;return out;
}
// A curved, single painted head joins the body behind the gill paint at u=.825. Its upper skin is
// visible from above; the mouth rotates into view as its surface normal turns.
// The dorsal head paint is excluded at this joint, while surrounding fin paint stays on the body rig.
export function facePoint3D(u,v,column,out={}){
  const across=(u-.518)/.151,vertical=(v-.637)/.148;
  const round=Math.sqrt(Math.max(0,1-across*across-vertical*vertical));
  // Interpenetrate the neck slightly: source alpha and the dorsal surface's
  // different cross-section otherwise expose the red background at oblique poses.
  return framePoint(column,HEAD_JOIN_U-1-HEAD_NECK_OVERLAP+(1.005-HEAD_JOIN_U+HEAD_NECK_OVERLAP)*round,-.0175+across*.080,.025-vertical*.105,out);
}
// The visible front sides of the pectoral fins use matching generated paint.
// Both sides belong to the same rig; edge-on frontal surfaces have zero area.
export function frontFinPoint(u,v,column,seconds,strength,out={}){
  const side=u<.5?-1:1,reach=Math.min(1,Math.abs(u-(side<0?.40:.66))/.34);
  const phase=seconds/LOOP_SECONDS*TAU;
  const x=-.01+strength*.026*reach*Math.sin(phase*2+reach*5+side);
  const y=-.0175+(u-.518)/.151*.095;
  const z=.015-(v-.637)/.148*.105+strength*.025*reach*Math.sin(phase*2-reach*4+side);
  return framePoint(column,x,y,z,out);
}
export function project3D(p,pose,width,height,tx=0,ty=0,out={}){
  const angle=pose.angle*Math.PI/180+tx*.035,c=Math.cos(angle),s=Math.sin(angle);
  out.x=pose.centerX+tx*9+(p.x*c-p.y*s)*pose.fishWidth;
  out.y=height-pose.centerY+ty*7-(p.x*s+p.y*c)*pose.fishWidth;
  out.z=p.z*pose.fishWidth;return out;
}
// Fit the visible painted surfaces, including curled fins, rather than the
// unrotated source rectangle. This preserves aspect and bone angles on mobile.
export function fitProjection(bounds,width,height,padding=16,out={}){
  const [left,top,right,bottom]=bounds,cx=(left+right)/2,cy=(top+bottom)/2;
  const scale=Math.min(1,(width-2*padding)/Math.max(1,right-left),(height-2*padding)/Math.max(1,bottom-top));
  const l=cx+(left-cx)*scale,r=cx+(right-cx)*scale,t=cy+(top-cy)*scale,b=cy+(bottom-cy)*scale;
  out.scale=scale;out.x=(1-scale)*cx+(l<padding?padding-l:r>width-padding?width-padding-r:0);
  out.y=(1-scale)*cy+(t<padding?padding-t:b>height-padding?height-padding-b:0);return out;
}
export function spineLinePoint(u,seconds,strength,column,aspect,out={}){
  const wave=writePoint(preparePoint(u,.5),seconds/LOOP_SECONDS*TAU,strength,straight,aspect,{});
  return framePoint(column,wave.x,wave.y*aspect,0,out);
}
