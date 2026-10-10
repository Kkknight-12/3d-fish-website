import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildContinuousBody,continuousBodyPoint} from '../body-geometry.js';
import {anatomicalFaceUV,eyeCharts,refineEyeSurface} from '../eye-atlas.js';
import {createTurn,preparePoint} from '../spine.js';
import {createDepthTurn,depthColumns,volumeSurfacePoint} from '../pose-3d.js';
import {BARBEL_LIP_UV,barbelVisibility,mouthBarbelCurve,bindMouthCorner,createMouthBarbels,projectMouthBarbels} from '../mouth-barbels.js';
const aspect=.5;
function model(){const m=refineEyeSurface(buildContinuousBody({aspect,rings:24,segments:20,faceBounds:[.04,.05,.97,.96],faceExtent:[-.090,.052,-.036,.112]}),eyeCharts(aspect));for(const v of m.vertices){v.sourceY=v.y;v.sourceZ=v.z;v.frontV=anatomicalFaceUV(v.y,v.z).v;}return m;}
function position(p,columns,seconds,strength){
  const at=Math.min(71,Math.floor(p.u*72)),f=Math.min(1,p.u*72-at),column=Array.from({length:7},(_,j)=>columns[at*7+j]*(1-f)+columns[(at+1)*7+j]*f);
  for(const [x,y]of[[3,4],[5,6]]){const n=Math.hypot(column[x],column[y]);column[x]/=n;column[y]/=n;}
  return volumeSurfacePoint(preparePoint(p.u,1-p.v),p.sourceZ??p.z,p.frontU,p.frontV,seconds,strength,column,aspect,{},{});
}
test('two roots bind to anterior painted mouth corners on the existing mesh',()=>{
  const m=model(),b=createMouthBarbels(m.vertices,m.triangles);
  assert.equal(b.roots.length,2);assert.equal(b.vertices.length,2*25*8);assert.equal(b.triangles.length,2*47*8);
  b.roots.forEach((root,i)=>{
    assert.ok(root.u>.93&&root.u<.97);assert.ok(root.weights.every(w=>w>=0&&w<=1));
    for(const [key,value]of[['frontU',BARBEL_LIP_UV[i][0]],['frontV',BARBEL_LIP_UV[i][1]]])assert.ok(Math.abs(root.points.reduce((n,p,j)=>n+p[key]*root.weights[j],0)-value)<1e-12);
    assert.ok(root.points.reduce((n,p,j)=>n+p.sourceZ*root.weights[j],0)<-.016);
  });
  assert.throws(()=>bindMouthCorner(m.vertices,m.triangles,[4,4]),/outside/);
});
test('bounded 3D curves stay outboard and below the lip, with a smoothly tapered tip',()=>{
  for(const side of[-1,1]){
    let oldY=0,oldRadius=Infinity;
    for(let i=0;i<=1000;i++){
      const t=i/1000,p=mouthBarbelCurve(side,t);assert.ok(p.x>=-.014001&&p.x<=.018001);assert.ok(p.z>=-.032001&&p.z<=1e-12);
      assert.ok(p.y*side>=oldY-1e-12);assert.ok(Math.abs(p.y)<=.079001);assert.ok(p.radius<=oldRadius);assert.ok(Math.abs(Math.hypot(...Object.values(p.tangent))-1)<1e-12);
      oldY=p.y*side;oldRadius=p.radius;
    }
    assert.equal(mouthBarbelCurve(side,0).radius,.0025);assert.equal(mouthBarbelCurve(side,1).radius,0);
  }
});
test('new pair never overlaps the old planar-barbel fade and has no hysteresis',()=>{
  for(let i=0;i<=1000;i++){const p=Math.PI/2*i/1000,a=barbelVisibility(p);assert.ok(a>=0&&a<=1);if(p<=.30)assert.equal(a,0);if(p>=.36)assert.equal(a,1);assert.equal(a,barbelVisibility(p));}
});
test('roots follow exact posed lip triangles and stay clear of both eyes through forward and reverse turns',()=>{
  const m=model(),b=createMouthBarbels(m.vertices,m.triangles),eyes=eyeCharts(aspect).map(e=>{const p=continuousBodyPoint(e.u,e.theta,aspect);return {...p,frontU:.04+.93*(p.y+.09)/.142,frontV:anatomicalFaceUV(p.y,p.z).v};});
  let minEyeDistance=Infinity,maxRootError=0,poses=0;
  const pitches=[...Array.from({length:46},(_,i)=>i*Math.PI/90),...Array.from({length:46},(_,i)=>(45-i)*Math.PI/90)];
  for(const pitch of pitches)for(const seconds of[0,2.5,5,7.5])for(const strength of[0,1]){
    const columns=depthColumns(createTurn(0),createDepthTurn(pitch),72),head=columns.subarray(72*7,73*7);
    for(const v of m.vertices)Object.assign(v,position(v,columns,seconds,strength));
    projectMouthBarbels(b,head,p=>({...p}));
    for(const root of b.roots){
      const base=b.vertices.filter(v=>v.root===root&&v.t===0);
      for(const key of['x','y','z']){const actual=base.reduce((n,p)=>n+p[key],0)/base.length,expected=root.points.reduce((n,p,j)=>n+p[key]*root.weights[j],0);maxRootError=Math.max(maxRootError,Math.abs(actual-expected));}
    }
    assert.ok(b.vertices.every(v=>['x','y','z'].every(k=>Number.isFinite(v[k]))));
    if(pitch>.30){const ep=eyes.map(e=>position(e,columns,seconds,strength));for(const v of b.vertices)for(const e of ep)minEyeDistance=Math.min(minEyeDistance,Math.hypot(v.x-e.x,v.y-e.y));}
    poses++;
  }
  console.log('barbel attachment',JSON.stringify({poses,maxRootError,minEyeDistance}));assert.ok(maxRootError<1e-12);assert.ok(minEyeDistance>.019);
});
test('renderer depth sorts attached barbels and preserves established fit and source trim',()=>{
  const s=readFileSync(new URL('../view-renderer.js',import.meta.url),'utf8');
  assert.match(s,/projectMouthBarbels\(barbels,head,p=>point\(p,pose,tx,ty\)\)/);
  assert.match(s,/\.\.\.barbels.triangles/);assert.match(s,/paint.sort\(\(a,b\)=>a.depth-b.depth\)/);
  assert.match(s,/updateFinTrim\(ramp\(\.08,\.30,depth.angles\[0\]\),ramp\(\.22,\.30,depth.angles\[0\]\)\)/);assert.match(s,/computeReferenceFit\(referenceFit,pose,columns,seconds,strength,width,height,tx,ty,fitted\)/);
  assert.match(s,/minorCtx.globalAlpha=index===0\?barbelTrim:trim/);
  const build=readFileSync(new URL('./build.mjs',import.meta.url),'utf8');assert.equal((build.match(/'mouth-barbels.js'/g)||[]).length,2);
});
