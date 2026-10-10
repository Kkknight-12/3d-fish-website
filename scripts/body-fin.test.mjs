import test from 'node:test';import assert from 'node:assert/strict';
import{buildContinuousBody,bodyContour,bodySkinPoint}from'../body-geometry.js';
import{surfacePoint,attachedFinSurface,pectoralSurfacePoint,volumeSurfacePoint,depthColumns,createDepthTurn}from'../pose-3d.js';import{preparePoint,createTurn}from'../spine.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('active trunk and head form one finite watertight manifold without a neck cap',()=>{const m=buildContinuousBody({rings:48,segments:40}),edges=new Map;for(const v of m.vertices){assert.ok(v.u>=.625);for(const key of['u','v','y','z','frontU','frontV'])assert.ok(Number.isFinite(v[key]));}for(const t of m.triangles)for(const[a,b]of[[t.a,t.b],[t.b,t.c],[t.c,t.a]]){const k=[a,b].sort((a,b)=>a-b).join(':');edges.set(k,(edges.get(k)||0)+1);}assert.ok([...edges.values()].every(x=>x===2));assert.equal(m.vertices.length-edges.size+m.triangles.length,2);assert.ok(!m.triangles.some(t=>t.chart==='rear'&&m.vertices[t.a].u>.626));});
test('both actual curved pectoral roots remain on their undeformed attachment collar',()=>{for(const pitch of[0,.4,.8,1.2,Math.PI/2]){const cols=depthColumns(createTurn(0),createDepthTurn(pitch),72);for(const u of[.65,.70,.76,.82,.855])for(const time of[0,2.5,5,7.5])for(const edge of['top','bottom']){const v=bodyContour(u)[edge],col=cols.subarray(Math.round(u*72)*7,Math.round(u*72)*7+7),m=preparePoint(u,1-v),base=attachedFinSurface(m,time,1,col,.5,{}),fin=pectoralSurfacePoint(m,time,1,col,.5,{});for(const k of['x','y','z'])near(base[k],fin[k]);}}});
test('root classification is stable at floating-point contour boundaries',()=>{const cols=depthColumns(createTurn(0),createDepthTurn(1.2),72);for(const u of[.66,.72,.80,.85])for(const edge of['top','bottom']){const v=bodyContour(u)[edge],col=cols.subarray(Math.round(u*72)*7,Math.round(u*72)*7+7),a=attachedFinSurface(preparePoint(u,1-v),2.5,1,col,.5,{});for(const d of[-1e-12,1e-12]){const b=attachedFinSurface(preparePoint(u,1-v+d),2.5,1,col,.5,{});for(const k of['x','y','z'])near(a[k],b[k],1e-8);}}});
test('masked interior collar is continuous with matching slopes across both visible skin borders',()=>{
  const eps=1e-6;
  for(const u of[.625,.65,.665,.72,.80,.85,.89])
  for(const time of[0,2.5,5,7.5])for(const strength of[0,1,1.4])
  for(const pitch of[0,.7,Math.PI/2])for(const edge of['top','bottom']){
    const col=[0,0,0,1,0,Math.cos(pitch),Math.sin(pitch)],v=bodyContour(u)[edge];
    for(const evaluate of[attachedFinSurface,pectoralSurfacePoint]){
      const at=dv=>evaluate(preparePoint(u,1-(v+dv)),time,strength,col,.5,{});
      const a=at(-eps),b=at(0),c=at(eps);
      assert.ok(Math.hypot(a.x-c.x,a.y-c.y,a.z-c.z)<1e-4,
        `position jump: ${evaluate.name}, u=${u}, edge=${edge}, pitch=${pitch}`);
      const slopeJump=Math.hypot(c.x-2*b.x+a.x,c.y-2*b.y+a.y,c.z-2*b.z+a.z)/eps;
      assert.ok(slopeJump<.01,
        `slope jump: ${evaluate.name}, u=${u}, edge=${edge}, pitch=${pitch}`);
      if(pitch===0)for(const dv of[-.1,-.01,0,.01,.1]){
        const motion=preparePoint(u,1-(v+dv)),base=surfacePoint(motion,time,strength,col,.5,{});
        const next=evaluate(motion,time,strength,col,.5,{});
        assert.equal(next.x,base.x);assert.equal(next.y,base.y);
      }
    }
  }
});
test('head breathing deforms the mouth locally without moving either eye or the tail',()=>{const col=depthColumns(createTurn(0),createDepthTurn(Math.PI/2),72).subarray(72*7);for(const[uv,expect]of[[[.50,.835],true],[[.22,.58],false],[[.81,.58],false]]){const a=volumeSurfacePoint(preparePoint(.95,.5),.02,...uv,0,0,col,.5,{}),b=volumeSurfacePoint(preparePoint(.95,.5),.02,...uv,1.8,0,col,.5,{}),d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);if(expect)assert.ok(d>.003);else near(d,0);}const a=volumeSurfacePoint(preparePoint(.6,.5),.02,.50,.835,0,0,col,.5,{}),b=volumeSurfacePoint(preparePoint(.6,.5),.02,.50,.835,1.8,0,col,.5,{});near(a.x,b.x);near(a.z,b.z);});

import{pectoralSupport,PECTORAL_SUPPORT,deformPectoralPoint}from'../fin-geometry.js';
test('major fan support excludes smaller appendages while retaining both painted fans',()=>{
  for(const[u,v]of[[.60,.30],[.65,.34],[.68,.38],[.60,.68],[.57,.70]])assert.equal(pectoralSupport(u,v),0,`minor fin ${u},${v}`);
  for(const[u,v]of[[.72,.20],[.80,.30],[.68,.13],[.72,.80],[.80,.75],[.68,.90]])assert.equal(pectoralSupport(u,v),1,`major fan ${u},${v}`);
  for(const pitch of[.4,.8,1.2,Math.PI/2]){
    const cols=depthColumns(createTurn(0),createDepthTurn(pitch),72);
    for(const[u,v]of[[.65,.34],[.68,.38],[.60,.68],[.57,.70]])for(const time of[0,2.5,5,7.5]){
      const col=cols.subarray(Math.round(u*72)*7,Math.round(u*72)*7+7),m=preparePoint(u,1-v);
      assert.deepEqual(pectoralSurfacePoint(m,time,1,col,.5,{}),attachedFinSurface(m,time,1,col,.5,{}));
    }
  }
});
test('support-polygon deformation is C1 at its bounded perimeter',()=>{
  const eps=1e-7;
  for(const polygon of Object.values(PECTORAL_SUPPORT))for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],u=(a[0]+b[0])/2,v=(a[1]+b[1])/2;
    near(pectoralSupport(u,v),0,1e-12);
    for(const[du,dv]of[[eps,0],[-eps,0],[0,eps],[0,-eps]])assert.ok(pectoralSupport(u+du,v+dv)/eps<.01);
  }
});
test('isolated fans preserve exact overhead XY and leave all original tail vertices untouched',()=>{
  for(const pitch of[0,.8,Math.PI/2])for(const time of[0,2.5,5,7.5]){
    const cols=depthColumns(createTurn(0),createDepthTurn(pitch),72);
    for(let i=0;i<=100;i++)for(let j=0;j<=50;j++){
      const u=i/100,v=j/50,col=cols.subarray(Math.round(u*72)*7,Math.round(u*72)*7+7),m=preparePoint(u,1-v),wave={};
      const base=surfacePoint(m,time,1,col,.5,{},wave),fin=pectoralSurfacePoint(m,time,1,col,.5,{});
      for(const k of['x','y','z'])assert.ok(Number.isFinite(fin[k]));
      if(u<=.55)assert.deepEqual(fin,base);
      if(pitch===0){assert.equal(fin.x,base.x);assert.equal(fin.y,base.y);}
      const direct={...base};deformPectoralPoint(m,time,1,col,.5,direct,wave);
      if(u<=.55)assert.deepEqual(direct,base);
      if(pitch===0){assert.equal(direct.x,base.x);assert.equal(direct.y,base.y);}
    }
  }
});


test('ruled major fan does not rotate old normal curl into axial swimming position',()=>{
  for(const pitch of[0,.4,.8,1.2,Math.PI/2])for(const time of[0,2.5,5,7.5]){
    const col=[0,0,0,1,0,Math.cos(pitch),Math.sin(pitch)];
    for(const[u,v]of[[.74,.20],[.80,.25],[.75,.80],[.80,.85]]){
      const m=preparePoint(u,1-v),wave={},base=attachedFinSurface(m,time,1,col,.5,{},wave),fin=pectoralSurfacePoint(m,time,1,col,.5,{});
      near(base.x*col[5]+base.z*col[6],fin.x*col[5]+fin.z*col[6]);
      assert.equal(base.y,fin.y);
      // With full support, arbitrary incoming normal curl has no effect.
      const huge={x:base.x-10*col[6],y:base.y,z:base.z+10*col[5]};
      deformPectoralPoint(m,time,1,col,.5,huge,wave,attachedFinSurface,(u,side,a)=>bodyContour(u,a)[side>0?'top':'bottom']);
      near(fin.x,huge.x);near(fin.y,huge.y);near(fin.z,huge.z);
    }
  }
});
test('ruled fan opens monotonically from a smooth broad attached root',()=>{
  const col=[0,0,0,1,0,0,1];
  for(const side of[1,-1])for(const u of[.75,.78,.81,.835])for(const time of[0,1,2.5,5,7.5]){
    const root=bodyContour(u)[side>0?'top':'bottom'];
    const at=d=>pectoralSurfacePoint(preparePoint(u,1-(root-side*d)),time,1,col,.5,{});
    const origin=at(0),eps=1e-7,nearRoot=at(eps);
    assert.ok(Math.abs(nearRoot.x-origin.x)/eps<.001);
    let previous=origin.x;
    for(let j=1;j<=40;j++){
      const p=at(j*.004);
      assert.ok(p.x<=previous+1e-8,`fan ray reversed: ${side},${u},${time},${j}`);
      previous=p.x;
    }
  }
});


test('main-fan trailing paint receives full ruled support rather than axial or polygon fade',()=>{
  // Opaque source pixels sampled against koi-original.png's independent fans.
  const paint=[[.642,.03],[.671,.07],[.681,.12],[.675,.18],[.689,.27],
    [.697,.32],[.718,.37],[.703,.68],[.688,.70],[.673,.74],
    [.647,.78],[.651,.86],[.618,.94],[.644,.94]];
  for(const[u,v]of paint){
    assert.equal(pectoralSupport(u,v),1,`paint enters support fade at ${u},${v}`);
    for(const pitch of[.8,Math.PI/2]){
      const col=[0,0,0,1,0,Math.cos(pitch),Math.sin(pitch)],m=preparePoint(u,1-v),wave={};
      const a=attachedFinSurface(m,5.5,1,col,.5,{},wave),b={x:a.x-col[6]*10,y:a.y,z:a.z+col[5]*10};
      const contour=(u,side,a)=>bodyContour(u,a)[side>0?'top':'bottom'];
      deformPectoralPoint(m,5.5,1,col,.5,a,wave,attachedFinSurface,contour);
      deformPectoralPoint(m,5.5,1,col,.5,b,wave,attachedFinSurface,contour);
      near(a.x,b.x);near(a.y,b.y);near(a.z,b.z);
    }
  }
});
