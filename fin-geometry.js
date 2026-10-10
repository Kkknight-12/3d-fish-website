import {preparePoint,writePoint} from './spine.js';
import {TAU,LOOP_SECONDS} from './motion.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const straight=[0,0,1,0];

// Root contours traced against koi-original.png, in ORIGINAL image coordinates.
// The two fans are intentionally not mirrored: their painted gill insertions,
// body edges, and lengths differ. Curves cover the attachment, not the outline.
export const PECTORAL_ROOTS=Object.freeze({
  upper:Object.freeze({side:1,hingeU:.849,curve:Object.freeze([[.60,.435],[.66,.407],[.72,.399],[.80,.397],[.855,.404],[.89,.415]])}),
  lower:Object.freeze({side:-1,hingeU:.844,curve:Object.freeze([[.60,.627],[.65,.654],[.72,.676],[.80,.680],[.85,.666],[.89,.650]])})
});

function contourV(curve,u){
  if(u<=curve[0][0])return curve[0][1];
  for(let i=1;i<curve.length;i++)if(u<=curve[i][0]){
    const a=curve[i-1],b=curve[i],t=smooth((u-a[0])/(b[0]-a[0]));
    return a[1]+(b[1]-a[1])*t;
  }
  return curve[curve.length-1][1];
}

export function rootContour(u,side){
  const fan=side===1||side==='upper'?PECTORAL_ROOTS.upper:PECTORAL_ROOTS.lower;
  return contourV(fan.curve,u);
}

export function pectoralRoot(u,imageV){
  const fan=imageV<.535?PECTORAL_ROOTS.upper:PECTORAL_ROOTS.lower;
  const v=contourV(fan.curve,u);
  return {u:fan.hingeU,v,side:fan.side,
    // Positive outside the painted body. Interior skin receives no bend.
    distance:fan.side*(v-imageV)};
}

// Bounded footprints follow the transparent gap between each major fan and
// the smaller dorsal/ventral appendages. The feather is entirely outboard
// of the main painted fans, including their rear tips at u=.61. An axial
// fade would cut through those tips and leak the old curl into the sheet.
// These polygons are deformation support only:
// alpha, topology and source UVs are never clipped or replaced.
export const PECTORAL_SUPPORT=Object.freeze({
  upper:Object.freeze([[.565,-.04],[.91,-.04],[.91,.450],[.710,.450],
    [.706,.400],[.689,.370],[.665,.320],[.640,.270],[.630,.180],
    [.590,.110],[.565,.020]]),
  lower:Object.freeze([[.550,1.04],[.91,1.04],[.91,.620],[.700,.620],
    [.670,.680],[.630,.730],[.595,.800],[.595,.890],[.550,.990]])
});

export function pectoralSupport(u,imageV,aspect=.5){
  const polygon=imageV<.535?PECTORAL_SUPPORT.upper:PECTORAL_SUPPORT.lower;
  let inside=false,distance=Infinity;
  // Distance is measured in fish-length units, so the collar stays the same
  // physical width on either axis of the original non-square source artwork.
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i];
    if((a[1]>imageV)!==(b[1]>imageV)&&u<(b[0]-a[0])*(imageV-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    const dx=b[0]-a[0],dy=(b[1]-a[1])*aspect;
    const px=u-a[0],py=(imageV-a[1])*aspect;
    const t=clamp((px*dx+py*dy)/(dx*dx+dy*dy));
    distance=Math.min(distance,Math.hypot(px-t*dx,py-t*dy));
  }
  return inside?smooth(distance/.009):0;
}

function originalRootNormal(u,imageV,seconds,strength,aspect){
  const p=preparePoint(u,1-imageV),phase=seconds/LOOP_SECONDS*TAU;
  const q=writePoint(p,phase,strength,straight,aspect,{}),y=q.y*aspect;
  const ramp=(a,b,x)=>smooth((x-a)/(b-a));
  const body=ramp(.38,.55,u)*(1-ramp(.91,1,u));
  return .105*Math.sqrt(Math.max(0,1-(y/.10)**2))*body
    +p.fin/.048*(-.17*Math.sin((.86-u)*6)+strength*.055*Math.sin(phase*2+p.y*6))
    +p.tail/.045*(p.y*.16+strength*.085*Math.sin(phase*2-u*7.4+p.y*4));
}

/**
 * Deform the ORIGINAL painted pectorals after evaluating the base surface.
 * out is mutated in world coordinates. wave is the base writePoint sample.
 * Optional rootSurface(motion,seconds,strength,column,aspect,out,wave) must be
 * the UNDEFORMED base evaluator, never pectoralSurfacePoint (avoid recursion).
 * Supplying it uses the exact fitted body's root normal rather than the
 * original dome. Optional getContour(u,side,aspect) returns the exact fitted
 * body boundary in image-v coordinates. No UVs, artwork, clock, or tail
 * vertices are changed.
 */
export function deformPectoralPoint(motion,seconds,strength,column,aspect,out,wave={},rootSurface=null,getContour=null){
  if(motion.u<=.55||motion.u>=.91)return out;
  const root=pectoralRoot(motion.u,1-motion.v);
  if(getContour){
    root.v=getContour(motion.u,root.side,aspect);
    root.distance=root.side*(root.v-(1-motion.v));
  }
  // Extend the same sheet through the masked inner collar so triangles
  // crossing the visible border do not interpolate back to the old curl.
  if(root.distance*aspect<=-.055)return out;
  const support=pectoralSupport(motion.u,1-motion.v,aspect)
    *(1-smooth((-root.distance*aspect-.015)/.040));
  if(support===0)return out;

  // A ruled fan sheet, rather than a rotation of the old dome/curl. Each
  // transverse ray begins at the actual curved gill boundary and eases into
  // its trailing axial reach. Axial/lateral swimming positions are untouched:
  // no normal curl can be rotated into a reverse-running axial fold.
  const collar=.055; // geometric attachment width in fish-length units
  const span=root.distance*aspect;
  const bend=smooth(span/collar);
  const c=column[3],s=column[4],cp=column[5],sp=column[6];
  const normal=-(out.x-column[0])*c*sp-(out.y-column[1])*s*sp+(out.z-column[2])*cp;
  let rootNormal;
  if(rootSurface){
    const p=rootSurface(preparePoint(motion.u,1-root.v),seconds,strength,column,aspect,{},{});
    rootNormal=-(p.x-column[0])*c*sp-(p.y-column[1])*s*sp+(p.z-column[2])*cp;
  }else rootNormal=originalRootNormal(motion.u,root.v,seconds,strength,aspect);
  const phase=seconds/LOOP_SECONDS*TAU;
  const reach=Math.max(0,root.u-motion.u);
  // Bounded travelling ripple shares the accepted harmonic and phase. It is
  // proportional to the trailing reach, so it cannot reverse the fan rays.
  // Its value and first span derivative vanish at the root with bend.
  const ripple=1+strength*.075*Math.sin(phase*2-motion.u*7.4+(root.side>0?1:-1));
  const targetNormal=rootNormal+reach*bend*ripple;
  const dz=(targetNormal-normal)*support;
  out.x-=dz*c*sp;
  out.y-=dz*s*sp;
  out.z+=dz*cp;
  return out;
}
