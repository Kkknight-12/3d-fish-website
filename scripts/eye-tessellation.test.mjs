import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContinuousBody} from '../body-geometry.js';
import {eyeCharts,refineEyeSurface,intrinsicSkinUV,anatomicalFaceUV} from '../eye-atlas.js';
import {preparePoint,createTurn} from '../spine.js';
import {createDepthTurn,depthColumns,volumeSurfacePoint} from '../pose-3d.js';
const base=buildContinuousBody({aspect:.5,rings:24,segments:20,faceBounds:[.04,.05,.97,.96],faceExtent:[-.090,.052,-.036,.112]});
const eyes=eyeCharts(),blend=(ps,ws)=>{const p={};for(const k of ['u','v','y','z','theta'])p[k]=ps.reduce((s,p,i)=>s+p[k]*ws[i],0);return p;};
function metrics(n){
  const model=refineEyeSurface(base,eyes,n),newTriangles=model.triangles.filter(t=>[t.a,t.b,t.c].some(i=>i>=base.vertices.length));
  const probes=[[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]];
  let maxUVError=0,maxPixelError=0,samples=0;
  for(const t of newTriangles){const ps=[t.a,t.b,t.c].map(i=>model.vertices[i]);for(const ws of probes){const p=blend(ps,ws),uv=intrinsicSkinUV(p),qs=ps.map(intrinsicSkinUV);maxUVError=Math.max(maxUVError,Math.abs(uv.u-qs.reduce((s,q,i)=>s+q.u*ws[i],0)),Math.abs(uv.v-qs.reduce((s,q,i)=>s+q.v*ws[i],0)));}}
  for(let degree=0;degree<=90;degree+=5)for(const seconds of[0,2.5,5,7.5])for(const strength of[0,1]){
    const columns=depthColumns(createTurn(0),createDepthTurn(degree*Math.PI/180),72);
    const position=p=>{
      const at=Math.min(71,Math.floor(p.u*72)),f=Math.min(1,p.u*72-at),col=Array.from({length:7},(_,j)=>columns[at*7+j]*(1-f)+columns[(at+1)*7+j]*f);
      for(const [x,y]of[[3,4],[5,6]]){const l=Math.hypot(col[x],col[y]);col[x]/=l;col[y]/=l;}
      const uv=anatomicalFaceUV(p.y,p.z),frontU=.04+.93*Math.max(0,Math.min(1,(p.y+.09)/.142));
      return volumeSurfacePoint(preparePoint(p.u,1-p.v),p.z,frontU,uv.v,seconds,strength,col,.5,{},{});
    };
    const projected=model.vertices.map(position);
    for(const t of newTriangles){const ids=[t.a,t.b,t.c],ps=ids.map(i=>model.vertices[i]);for(const ws of probes){const exact=position(blend(ps,ws)),x=ids.reduce((s,id,i)=>s+projected[id].x*ws[i],0),y=ids.reduce((s,id,i)=>s+projected[id].y*ws[i],0);maxPixelError=Math.max(maxPixelError,Math.hypot(exact.x-x,exact.y-y)*1000);samples++;}}
  }
  return {n,triangles:model.triangles.length,vertices:model.vertices.length,newTriangles:newTriangles.length,maxUVError,maxPixelError,samples};
}
test('n4 eye tessellation preserves affine UVs and stays below one projected pixel during swimming',()=>{
  const n4=metrics(4),n8=metrics(8);console.log('tessellation',JSON.stringify({n4,n8}));
  assert.ok(n4.maxUVError<1e-12);assert.ok(n8.maxUVError<1e-12);
  assert.ok(n4.maxPixelError<1);assert.ok(n8.maxPixelError<1);
  assert.ok(n4.triangles<n8.triangles*.6);
});
