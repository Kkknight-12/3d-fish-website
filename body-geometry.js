/**
 * One closed painted trunk/chest/head surface. Longitudinal u is the original
 * image coordinate, y=(.5-v)*aspect, z points out of the original painting.
 * No neck cap, overlapping head mesh, or geometry switch exists at u=.825.
 * The accepted rear fish (u<.625) is deliberately outside this module.
 */
import {faceProofUV} from './head-geometry.js';
export const CONTINUOUS_BODY_JOIN=.625;
export const CONTINUOUS_BODY_NOSE=.986;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=n=>{n=clamp(n);return n*n*n*(n*(n*6-15)+10);};

// Shape-preserving cubic interpolation. Unlike per-span smoothstep this has
// continuous nonzero longitudinal slopes through the measured contour knots.
function curve(points) {
  const n=points.length,h=[],d=[],m=[];
  for(let i=0;i<n-1;i++){h[i]=points[i+1][0]-points[i][0];d[i]=(points[i+1][1]-points[i][1])/h[i];}
  m[0]=d[0];m[n-1]=d[n-2];
  for(let i=1;i<n-1;i++){
    const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];
    m[i]=d[i-1]*d[i]<=0?0:(w1+w2)/(w1/d[i-1]+w2/d[i]);
  }
  return x=>{
    x=clamp(x,points[0][0],points[n-1][0]);
    let i=0;while(i<n-2&&x>points[i+1][0])i++;
    const t=(x-points[i][0])/h[i],t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*points[i][1]+(t3-2*t2+t)*h[i]*m[i]
      +(-2*t3+3*t2)*points[i+1][1]+(t3-t2)*h[i]*m[i+1];
  };
}
// Trace only the scaly core, not the surrounding transparent fin fans.
// Head samples from .875 onward reproduce the measured source-image cheeks.
// The original .825 head-ring extent included fin pixels: it is not a neck.
const upperV=curve([
  [.625,.421],[.66,.407],[.72,.399],[.80,.397],[.855,.404],
  [.875,.4092],[.905,.4240],[.930,.4386],[.952,.4724],
  [.970,.4814],[.980,.5096],[.986,.5320],
]);
const lowerV=curve([
  [.625,.641],[.65,.654],[.72,.676],[.80,.680],[.850,.666],
  [.875,.6596],[.905,.6426],[.930,.6246],[.952,.5976],
  [.970,.5986],[.980,.5670],[.986,.5420],
]);
const crownAt=curve([
  [.625,.105],[.665,.108],[.72,.112],[.80,.112],[.855,.106],
  [.875,.104],[.905,.098],[.930,.085],[.952,.068],
  [.970,.047],[.980,.026],[.986,.014],
]);
const jawAt=curve([
  [.625,-.018],[.665,-.025],[.72,-.034],[.80,-.036],[.855,-.031],
  [.875,-.030],[.905,-.034],[.930,-.033],[.952,-.028],
  [.970,-.019],[.980,-.006],[.986,.004],
]);

/** Source-image top/bottom v, geometry upper/lower y, and closed-volume heights.
 * Source contours remain in source UV at every aspect; only geometry y scales.
 */
export function bodyContour(u,aspect=.5) {
  if(!(aspect>0))throw new Error('Body aspect must be positive');
  u=clamp(u,CONTINUOUS_BODY_JOIN,CONTINUOUS_BODY_NOSE);
  const top=upperV(u),bottom=lowerV(u);
  return {u,top,bottom,topV:top,bottomV:bottom,upper:(.5-top)*aspect,
    lower:(.5-bottom)*aspect,crown:crownAt(u),jaw:jawAt(u)};
}
const baselineDome=y=>.105*Math.sqrt(Math.max(0,1-(y/.10)**2));
function surfaceHeight(p,cosTheta,sinTheta) {
  const y=(p.upper+p.lower)/2+(p.upper-p.lower)/2*cosTheta;
  const blend=smooth((p.u-CONTINUOUS_BODY_JOIN)/.04);
  const across=(1-cosTheta)/2;
  const baseline=baselineDome(y);
  const rearEdge=mix(baselineDome(p.upper),baselineDome(p.lower),across);
  // Rounded shoulders, generous chest and a continuous lower jaw. A full
  // cross-section, rather than a narrowing head cone, supplies the front face.
  const sideHeight=mix(p.jaw,p.crown,.43);
  const edge=mix(rearEdge,sideHeight,blend);
  if(sinTheta>=0){
    const top=sideHeight+(p.crown-sideHeight)*Math.pow(Math.max(0,sinTheta),.88);
    return mix(baseline,top,blend);
  }
  return edge+(p.jaw-edge)*Math.pow(-sinTheta,.90);
}

/** Dorsal skin/root location for any original image coordinate. An outboard
 * fin query is clamped to its actual skin edge; requestedV records that query.
 * Attach fin borders to returned y/z, never a separate guessed height field.
 */
export function bodySkinPoint(u,v,aspect=.5) {
  const p=bodyContour(u,aspect),skinV=clamp(v,p.top,p.bottom);
  const c=1-2*(skinV-p.top)/(p.bottom-p.top),s=Math.sqrt(Math.max(0,1-c*c));
  const z=surfaceHeight(p,c,s);
  return {u:p.u,v:skinV,requestedV:v,y:(.5-skinV)*aspect,z,dorsalZ:z,rootZ:z,
    top:p.top,bottom:p.bottom};
}
export function continuousBodyPoint(u,theta,aspect=.5) {
  const p=bodyContour(u,aspect),c=Math.cos(theta),s=Math.sin(theta);
  const y=(p.upper+p.lower)/2+(p.upper-p.lower)/2*c;
  return {u:p.u,v:.5-y/aspect,y,z:surfaceHeight(p,c,s)};
}

/** A single watertight loft, with source UV and TWO same-surface front charts.
 * Default frontU/V is full orthographic registration. Pass frontUV:faceProofUV
 * for calibrated landmarks; registeredFrontU/V always expose that alternative.
 * 'dorsal' uses the original image; 'anterior' is the closed ventral skin.
 * The rear cap is a hidden closure at the tail junction, never a neck plane.
 */
export function buildContinuousBody({aspect=.5,rings=72,segments=64,
  faceBounds=[0,0,1,1],faceExtent=[-.100,.070,-.036,.112],frontUV=null}={}) {
  if(!(aspect>0)||!Number.isInteger(rings)||rings<2||!Number.isInteger(segments)||segments<8||segments%2)
    throw new Error('Invalid continuous body resolution');
  const vertices=[],triangles=[],seam=[];
  const [left,top,right,bottom]=faceBounds,[minY,maxY,minZ,maxZ]=faceExtent;
  const addVertex=(p,extra={})=>{
    const linear={u:mix(left,right,clamp((p.y-minY)/(maxY-minY))),
      v:mix(bottom,top,clamp((p.z-minZ)/(maxZ-minZ)))};
    const registered=faceProofUV(p.y,p.z),uv=frontUV?frontUV(p.y,p.z):linear;
    vertices.push({...p,originalU:p.u,originalV:p.v,frontU:uv.u,frontV:uv.v,
      linearFrontU:linear.u,linearFrontV:linear.v,
      registeredFrontU:registered.u,registeredFrontV:registered.v,...extra});
    return vertices.length-1;
  };
  for(let i=0;i<=rings;i++){
    const u=mix(CONTINUOUS_BODY_JOIN,CONTINUOUS_BODY_NOSE,i/rings);
    for(let j=0;j<segments;j++){
      const theta=j*Math.PI*2/segments,onSeam=i===0&&j<=segments/2;
      const id=addVertex(continuousBodyPoint(u,theta,aspect),
        {theta,seam:onSeam,chart:j<=segments/2?'dorsal':'ventral'});
      if(onSeam)seam.push(id);
    }
  }
  const add=(a,b,c,chart)=>{
    const p=vertices[a],q=vertices[b],r=vertices[c];
    const ax=q.u-p.u,ay=q.y-p.y,az=q.z-p.z,bx=r.u-p.u,by=r.y-p.y,bz=r.z-p.z;
    const x=ay*bz-az*by,y=az*bx-ax*bz,z=ax*by-ay*bx,l=Math.hypot(x,y,z);
    triangles.push({a,b,c,chart,normal:{x:x/l,y:y/l,z:z/l}});
  };
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
    const a=i*segments+j,b=i*segments+(j+1)%segments,c=a+segments,d=b+segments;
    const chart=j<segments/2?'dorsal':'anterior';
    add(a,b,c,chart);add(b,d,c,chart);
  }
  const end=bodyContour(CONTINUOUS_BODY_NOSE,aspect),start=bodyContour(CONTINUOUS_BODY_JOIN,aspect);
  const front=addVertex({u:CONTINUOUS_BODY_NOSE+.001,y:(end.upper+end.lower)/2,
    v:(end.top+end.bottom)/2,z:(end.crown+end.jaw)/2},{chart:'anterior',seam:false});
  const rear=addVertex({u:CONTINUOUS_BODY_JOIN,y:(start.upper+start.lower)/2,
    v:(start.top+start.bottom)/2,z:(start.crown+start.jaw)/2},{chart:'rear',seam:false});
  for(let j=0;j<segments;j++){
    add(rings*segments+j,rings*segments+(j+1)%segments,front,'anterior');
    add((j+1)%segments,j,rear,'rear');
  }
  return {vertices,triangles,seam,joinU:CONTINUOUS_BODY_JOIN,noseU:CONTINUOUS_BODY_NOSE,
    faceBounds,faceExtent,limitations:[
      'Dorsal rear seam is the analytic static baseline dome; weld to deformed rear tiles per frame.',
      'The rear volume cap closes topology but must not replace source tail paint.',
      'Front chart is approximate generated identity; original dorsal source UVs remain exact.',
      'Numeric manifold checks do not establish visual acceptance.'
    ]};
}
