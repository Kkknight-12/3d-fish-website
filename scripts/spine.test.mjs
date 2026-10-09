import test from 'node:test';
import assert from 'node:assert/strict';
import { createTurn, stepTurn, spineColumns, preparePoint, writePoint, degrees } from '../spine.js';
import { deformPoint } from '../motion.js';
import { followProgress } from '../scroll.js';
import { silhouette } from '../silhouette.js';

test('head leads a turn, body curves and tail follows without angular snaps',()=>{
  const state=createTurn(0);
  for(let i=0;i<30;i++)stepTurn(state,90,1/60);
  const a=state.angles;
  assert.ok(a[0]>a[2]&&a[2]>a[5],'tail must follow the turning head');
  assert.ok(degrees(a[0]-a[5])>20,'bend must be visibly meaningful');
  const cols=spineColumns(state,72);
  assert.ok(Math.abs(cols[1])>.10,'tail must leave the straight image centerline');
  let previous=a[0];
  for(const target of [-45,130,-80,20])for(let i=0;i<120;i++){
    stepTurn(state,target,1/60);
    assert.ok(Math.abs(a[0]-previous)<=2.4/60+1e-8,'turn rate must remain bounded on reversal');
    assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v-a[0])<=.9500001));previous=a[0];
  }
});
test('turn integration is consistent across regular and irregular frame pacing',()=>{
  const regular=createTurn(25),irregular=createTurn(25);
  for(let i=0;i<120;i++)stepTurn(regular,160,1/60);
  for(let i=0;i<20;i++){stepTurn(irregular,160,.017);stepTurn(irregular,160,.083);}
  regular.angles.forEach((a,i)=>assert.ok(Math.abs(a-irregular.angles[i])<.015));
  assert.ok(Math.abs(followProgress(0,1,.5)-(1-Math.exp(-.5/.14)))<1e-12,'a long frame must not slow the scroll clock');
});
test('straight articulation preserves the approved swimming field',()=>{
  const state=createTurn(25),columns=spineColumns(state,72),aspect=.5;
  for(const phase of [0,.5,2,4,6])for(let col=0;col<=72;col+=3)for(const v of [.1,.3,.5,.8,.95]){
    const u=col/72,p=preparePoint(u,v),out={};
    writePoint(p,phase,1.4,columns.subarray(col*4,col*4+4),aspect,out);
    const original=deformPoint(u,v,phase,1.4);
    assert.ok(Math.abs(out.x-original.x)<1e-6&&Math.abs(out.y-original.y)<1e-6);
  }
});
test('reduced motion removes articulation and does not rotate through a full turn',()=>{
  const state=createTurn(25);stepTurn(state,180,.3);stepTurn(state,25,0,true);
  assert.ok(state.angles.every(v=>Math.abs(degrees(v)-25)<1e-8));
  const wrap=createTurn(359);stepTurn(wrap,1,.1);
  assert.ok(degrees(wrap.angles[0])>359&&degrees(wrap.angles[0])<361,'angle wrap follows a short continuous arc');
});

test('articulated visible artwork does not fold through strong turns and reversals',()=>{
  const ranges=Array.from({length:73},()=>({lo:1,hi:0}));
  for(let i=0;i<silhouette.length;i+=2){const r=ranges[Math.round(silhouette[i]*72)];r.lo=Math.min(r.lo,silhouette[i+1]);r.hi=Math.max(r.hi,silhouette[i+1]);}
  for(const [cols,rows] of [[12,6],[16,8],[20,10],[24,12],[72,36]]){
    const points=[];for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++)points.push(preparePoint(col/cols,row/rows));
    const triangles=[];
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;
      for(const tri of [[a,c,b],[b,c,d]]){
        const u=tri.reduce((n,i)=>n+points[i].u,0)/3,v=tri.reduce((n,i)=>n+points[i].v,0)/3,r=ranges[Math.round(u*72)];
        if(v>=r.lo&&v<=r.hi)triangles.push(tri);
      }
    }
    const state=createTurn(25);
    for(const target of [160,-60,120,25])for(let frame=0;frame<60;frame++){
      stepTurn(state,target,1/60);if(frame%10)continue;
      const columns=spineColumns(state,cols),xy=points.map(p=>writePoint(p,frame*.2,1.4,columns.subarray(Math.round(p.u*cols)*4,Math.round(p.u*cols)*4+4),.5,{}));
      for(const [a,b,c] of triangles){const p=xy[a],q=xy[b],r=xy[c];assert.ok((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)<0,`visible fold at ${cols}x${rows}`);}
    }
  }
});
