import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {eyeCharts,intrinsicEyeUV,refineEyeSurface,anatomicalFaceUV,makeIntrinsicSkinAtlas,intrinsicSkinUV} from '../eye-atlas.js';
import {buildContinuousBody,bodySkinPoint,continuousBodyPoint} from '../body-geometry.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const eyes=eyeCharts();
function footprint(e,degrees){
  const a=degrees*Math.PI/180,pts=[];
  for(let i=0;i<256;i++){
    const x=Math.cos(i*Math.PI/128),y=Math.sin(i*Math.PI/128);
    const p=continuousBodyPoint(e.u+e.inverse[0]*x+e.inverse[1]*y,e.theta+e.inverse[2]*x+e.inverse[3]*y);
    pts.push([p.u*Math.cos(a)-p.z*Math.sin(a),p.y]);
  }
  const mean=pts.reduce((p,q)=>[p[0]+q[0]/pts.length,p[1]+q[1]/pts.length],[0,0]);
  let xx=0,xy=0,yy=0;
  for(const p of pts){let x=p[0]-mean[0],y=p[1]-mean[1];xx+=x*x/pts.length;xy+=x*y/pts.length;yy+=y*y/pts.length;}
  const d=Math.hypot(xx-yy,2*xy);
  return {aspect:Math.sqrt((xx+yy+d)/(xx+yy-d)),major:Math.sqrt((xx+yy+d)/2),minor:Math.sqrt((xx+yy-d)/2)};
}
test('actual original pixel pupil centers own exactly one fixed intrinsic chart each',()=>{
  for(const e of eyes){const uv=intrinsicEyeUV(e,e);near(uv.u,.5);near(uv.v,.5);near(uv.r,0);
    const det=e.A[0]*e.A[3]-e.A[1]*e.A[2];assert.ok(det>0);
    for(const x of[-1,0,1])for(const y of[-1,0,1]){const uv=intrinsicEyeUV({u:e.u+e.inverse[0]*x+e.inverse[1]*y,theta:e.theta+e.inverse[2]*x+e.inverse[3]*y},e);near(uv.x,x);near(uv.y,y);}
  }
  assert.ok(intrinsicEyeUV(eyes[0],eyes[1]).r>2.8);
  assert.ok(intrinsicEyeUV(eyes[1],eyes[0]).r>2.8);
});
test('intrinsic circular eyelid footprints remain bounded at user pose and front',()=>{
  for(const e of eyes)for(const deg of[45,59.138,70,80,90]){const f=footprint(e,deg);assert.ok(f.aspect<2.3,`${e.id} ${deg}: ${f.aspect}`);assert.ok(f.major<.018);assert.ok(f.minor>.005);}
});
test('eye-free face chart fixes measured eye row and accepted mouth plane without pitch morph',()=>{
  for(const e of eyes){const p=bodySkinPoint(e.u,e.v);const q=anatomicalFaceUV(p.y,p.z);near(q.u,e.textureU,1e-6);near(q.v,.577,1e-6);}
  // Accepted frontal mouth texture plane intentionally differs from dorsal mouth height.
  const uv=anatomicalFaceUV(-.019,-.0156703297);near(uv.u,.5,1e-8);near(uv.v,.835,1e-8);
});
test('local refinement preserves all original vertices and exact faceted volume',()=>{
  const m=buildContinuousBody({rings:24,segments:20}),r=refineEyeSurface(m,eyes);
  assert.ok(r.triangles.length>m.triangles.length);
  m.vertices.forEach((v,i)=>assert.deepEqual(r.vertices[i],v));
  function volume(g){return g.triangles.reduce((sum,t)=>{const [p,q,r]=[t.a,t.b,t.c].map(i=>g.vertices[i]);return sum+(p.u*(q.y*r.z-q.z*r.y)-p.y*(q.u*r.z-q.z*r.u)+p.z*(q.u*r.y-q.y*r.u))/6;},0);}
  near(volume(m),volume(r),1e-12);
  for(const t of m.triangles)if(t.chart!=='dorsal')assert.ok(r.triangles.includes(t));
});
for(const e of eyes)for(const deg of[0,59.138,90])console.log('footprint',e.id,deg,footprint(e,deg));

test('renderer owns intrinsic eye materials and fixes base UV without pitch morph',()=>{
  const source=readFileSync(new URL('../view-renderer.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/chartMorph/);
  const construction=source.slice(source.indexOf('function makeFittedVolume'),source.indexOf('makeFittedVolume();'));
  assert.match(construction,/anatomicalFaceUV\(v\.ySource,v\.volumeZ\)/);
  assert.ok(construction.indexOf('anatomicalFaceUV')<construction.indexOf('const triangles='));
  assert.match(source,/v\.frontU=v\.defaultFrontU;v\.frontV=registered\.v;/);
  assert.doesNotMatch(source,/v\.front[UV]\s*=[^;]*chartMorph/);
  assert.doesNotMatch(source,/get\(['"]eye-map['"]\)/);
  assert.match(source,/refineEyeSurface\(buildContinuousBody/);
  assert.match(source,/intrinsicEyeUV\(v,eye\)/);
  assert.doesNotMatch(source,/drawTexture\(t\.eye\)/);
  assert.match(source,/if\(t\.chart==='dorsal'\)\{drawTexture\(t\.dorsalAtlas\|\|t\.original\);\}/);
  assert.match(source,/makeIntrinsicSkinAtlas\(opaqueOriginal,opaqueFront,eyes,aspect\)/);
});

test('precomposed atlas contains opaque pupil color before any triangle draw',()=>{
  function canvas(w=1,h=1,color=[220,210,190,255]){
    let pixels=new Uint8ClampedArray(w*h*4);for(let i=0;i<pixels.length;i+=4)pixels.set(color,i);
    const c={width:w,height:h};c.getContext=()=>({getImageData:()=>({data:pixels}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:im=>{pixels=im.data;}});return c;
  }
  const previous=globalThis.document;globalThis.document={createElement:()=>canvas()};
  try{
    const base=canvas(),paint=canvas(8,8,[10,15,20,255]),local=eyes.map(e=>({...e,image:paint}));
    const atlas=makeIntrinsicSkinAtlas(base,base,local),data=atlas.getContext('2d').getImageData().data;
    for(const e of local){const uv=intrinsicSkinUV(e),x=Math.round(uv.u*(atlas.width-1)),y=Math.round(uv.v*(atlas.height-1)),i=(y*atlas.width+x)*4;assert.deepEqual(Array.from(data.slice(i,i+4)),[10,15,20,255]);}
    assert.deepEqual(Array.from(data.slice(0,4)),[220,210,190,255]);
    for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);
  }finally{globalThis.document=previous;}
});
