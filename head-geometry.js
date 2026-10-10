/**
 * Bounded fitted-head proof. Pure geometry; no animation, canvas, or assets.
 * Coordinates are longitudinal u, lateral y=(.5-v)*aspect, dorsal z.
 * The rear is at .825 exactly. This is an anatomical loft, not an ellipsoid.
 * Dorsal source UVs are unchanged. The front chart is an orthographic chart
 * of this SAME surface, never another shell or screen-facing plane.
 */
export const FITTED_HEAD_JOIN = .825;
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
const smooth = x => {x=clamp(x);return x*x*(3-2*x);};
const mix = (a,b,t) => a+(b-a)*t;
const mapLandmarks=(x,points)=>{
  let i=0;while(i<points.length-2&&x>points[i+1][0])i++;
  const a=points[i],b=points[i+1];return mix(a[1],b[1],clamp((x-a[0])/(b[0]-a[0])));
};

/** Optional registration for koi-face-proof-v3.png. Its two eyes and mouth
 * are placed at the SAME geometry landmarks as the original painting.
 * Ancillary markings are still different; registration is not identity proof.
 */
export function faceProofUV(y,z) {
  return {u:mapLandmarks(y,[[-.10,.04],[-.053,.22],[-.019,.50],[.0235,.81],[.07,.97]]),
    v:mapLandmarks(z,[[-.034,.965],[.02791,.835],[.07343,.58],[.10492,.05]])};
}

// u, upper painted cheek, lower painted cheek, crown, lower jaw.
// Head narrows gradually; a short blunt muzzle replaces the ovoid's pole.
const PROFILE = [
  [.825,.070,-.100,.105,-.020],
  [.845,.0634,-.0899,.105,-.024],
  [.875,.0454,-.0798,.104,-.030],
  [.905,.0380,-.0713,.098,-.034],
  [.930,.0307,-.0623,.085,-.033],
  [.952,.0138,-.0488,.068,-.028],
  [.970,.0093,-.0493,.047,-.019],
  [.980,-.0048,-.0335,.026,-.006],
  [.986,-.016,-.021,.014,.004],
];

export function fittedHeadProfile(u) {
  u=clamp(u,PROFILE[0][0],PROFILE.at(-1)[0]);
  let i=0;while(i<PROFILE.length-2&&u>PROFILE[i+1][0])i++;
  const a=PROFILE[i],b=PROFILE[i+1],t=smooth((u-a[0])/(b[0]-a[0]));
  return {u,upper:mix(a[1],b[1],t),lower:mix(a[2],b[2],t),
    crown:mix(a[3],b[3],t),jaw:mix(a[4],b[4],t)};
}

/** Locate a dorsal neck vertex on the existing coarse, painted body edge.
 * Weld its FINAL 3D position to mix(body[a],body[b],t) every frame. This
 * preserves the body's actual faceted edge including its swimming curl.
 */
export function seamBinding(v, rows=[.36,5/12,.5,7/12,2/3,.70]) {
  let a=0;while(a<rows.length-2&&v>rows[a+1])a++;
  return {a,b:a+1,t:clamp((v-rows[a])/(rows[a+1]-rows[a]))};
}

export function fittedHeadPoint(u,theta,aspect=.5) {
  const p=fittedHeadProfile(u),s=Math.sin(theta),c=Math.cos(theta);
  const y=(p.upper+p.lower)/2+(p.upper-p.lower)/2*c;
  const across=(1-c)/2;
  // Exact analytic body cross-section at the dorsal rear boundary.
  const neck=.105*Math.sqrt(Math.max(0,1-(y/.10)**2));
  const edgeUpper=.105*Math.sqrt(Math.max(0,1-(p.upper/.10)**2));
  const edgeLower=.105*Math.sqrt(Math.max(0,1-(p.lower/.10)**2));
  const join=smooth((u-FITTED_HEAD_JOIN)/.035);
  const edgeZ=mix(edgeUpper,edgeLower,across)*(1-join)
    +mix(p.jaw,p.crown,.38)*join;
  const top=edgeZ+(p.crown-edgeZ)*Math.pow(Math.max(0,s),.78);
  const z=s>=0?mix(neck,top,join):edgeZ+(p.jaw-edgeZ)*Math.pow(-s,.82);
  return {u,y,v:.5-y/aspect,z};
}

/**
 * faceBounds=[left,top,right,bottom] is the actual face crop within its PNG.
 * faceExtent=[minLateral,maxLateral,minZ,maxZ] registers the cheek/crown/jaw.
 * Return triangles as {a,b,c,chart,normal}; chart is the recommended material.
 * Front UVs also exist on dorsal triangles for a REGISTERED atlas, but never
 * alpha-overpaint an unrelated face on them. Use one material per triangle.
 */
export function buildFittedHead({aspect=.5,rings=28,segments=48,
  faceBounds=[0,0,1,1],faceExtent=[-.100,.070,-.034,.105],frontUV=null}={}) {
  if(!(aspect>0)||rings<2||segments<8||segments%2)throw new Error('Invalid fitted head resolution');
  const vertices=[],triangles=[],seam=[];
  const lastU=PROFILE.at(-1)[0];
  const [left,top,right,bottom]=faceBounds;
  const [minY,maxY,minZ,maxZ]=faceExtent;
  const addVertex=(p,extra={})=>{
    const id=vertices.length;
    const uv=frontUV?frontUV(p.y,p.z):null;
    vertices.push({...p,originalU:p.u,originalV:p.v,
      frontU:uv?uv.u:mix(left,right,clamp((p.y-minY)/(maxY-minY))),
      frontV:uv?uv.v:mix(bottom,top,clamp((p.z-minZ)/(maxZ-minZ))),...extra});return id;
  };
  for(let i=0;i<=rings;i++){
    const u=mix(FITTED_HEAD_JOIN,lastU,i/rings);
    for(let j=0;j<segments;j++){
      const theta=j/segments*Math.PI*2,p=fittedHeadPoint(u,theta,aspect);
      const onSeam=i===0&&j<=segments/2;
      const id=addVertex(p,{theta,seam:onSeam,seamBinding:onSeam?seamBinding(p.v):null,
        chart:j<=segments/2?'dorsal':'ventral'});
      if(onSeam)seam.push(id);
    }
  }
  const cross=(a,b,c)=>{
    const p=vertices[a],q=vertices[b],r=vertices[c];
    const ax=q.u-p.u,ay=q.y-p.y,az=q.z-p.z,bx=r.u-p.u,by=r.y-p.y,bz=r.z-p.z;
    const x=ay*bz-az*by,y=az*bx-ax*bz,z=ax*by-ay*bx,l=Math.hypot(x,y,z)||1;
    return {x:x/l,y:y/l,z:z/l};
  };
  const add=(a,b,c,chart)=>triangles.push({a,b,c,chart,normal:cross(a,b,c)});
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
    const a=i*segments+j,b=i*segments+(j+1)%segments,c=a+segments,d=b+segments;
    // Outward orientation: dorsal normals +z; ventral normals -z.
    const chart=j<segments/2?'dorsal':'anterior';
    add(a,b,c,chart);add(b,d,c,chart);
  }
  const frontProfile=fittedHeadProfile(lastU);
  const front=addVertex({u:lastU+.001,y:(frontProfile.upper+frontProfile.lower)/2,
    v:.5-(frontProfile.upper+frontProfile.lower)/2/aspect,z:(frontProfile.crown+frontProfile.jaw)/2},
    {chart:'anterior',seam:false});
  const rear=addVertex({u:FITTED_HEAD_JOIN,y:-.015,v:.5+.015/aspect,z:.035},
    {chart:'rear',seam:false});
  for(let j=0;j<segments;j++){
    add(rings*segments+j,rings*segments+(j+1)%segments,front,'anterior');
    add((j+1)%segments,j,rear,'rear');
  }
  return {vertices,triangles,seam,joinU:FITTED_HEAD_JOIN,
    faceBounds,faceExtent,
    limitations:[
      'Only the dorsal neck can weld to the existing open body; rear and underside are closure surfaces.',
      'Static analytic neck requires per-frame seamBinding welding to match coarse body triangles exactly.',
      'Original barbels outside the fitted skin envelope require preserved source tiles.',
      'Front chart crop and landmarks require calibration against the actual generated PNG.',
      'No claim of visual acceptance follows from manifold or numeric checks.'
    ]};
}
