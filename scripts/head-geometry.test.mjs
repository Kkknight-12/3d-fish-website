import test from 'node:test';import assert from 'node:assert/strict';
import{buildFittedHead,FITTED_HEAD_JOIN}from'../head-geometry.js';
import{volumeSurfacePoint,createDepthTurn,depthColumns}from'../pose-3d.js';
import{createTurn,preparePoint}from'../spine.js';
test('active fitted mesh is closed and cannot overlap behind the original gill join',()=>{const {vertices,triangles}=buildFittedHead();const edges=new Map;for(const v of vertices){assert.ok(v.u>=FITTED_HEAD_JOIN);for(const k of ['u','v','y','z','frontU','frontV'])assert.ok(Number.isFinite(v[k]));}for(const t of triangles)for(const [a,b]of[[t.a,t.b],[t.b,t.c],[t.c,t.a]]){const key=[a,b].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)||0)+1);}assert.ok([...edges.values()].every(n=>n===2));});
test('dense head sampling keeps axial position between spine columns',()=>{const columns=depthColumns(createTurn(0),createDepthTurn(),72);for(const u of [.825,.832,.84,.879,.923,.97]){const i=Math.round(u*72),col=columns.subarray(i*7,i*7+7),p=volumeSurfacePoint(preparePoint(u,.5),0,.5,.5,0,0,col,.5,{}, {},u-i/72);assert.ok(Math.abs(p.x-(u-.5))<1e-12);}});
test('head seam lies on the existing u=.825 body boundary',()=>{const m=buildFittedHead();assert.ok(m.seam.length>20);for(const i of m.seam){assert.equal(m.vertices[i].u,.825);assert.ok(m.vertices[i].seamBinding);}});
