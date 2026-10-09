import test from 'node:test';
import assert from 'node:assert/strict';
import {viewBeat,viewPoint,breathOpening,createChoreography,stepChoreography} from '../view-beat.js';
test('encounter placement is continuous and reversible across native scroll',()=>{
  let prior=0;
  for(let i=0;i<=10000;i++){const beat=viewBeat(i/10000);assert.ok(beat.approach>=0&&beat.approach<=1);assert.ok(Math.abs(beat.approach-prior)<.002);prior=beat.approach;}
  for(const p of [.76,.80,.83,.89])assert.equal(viewBeat(p).approach,1);
  assert.equal(viewBeat(.5).approach,0);assert.equal(viewBeat(1).approach,0);
  assert.deepEqual(viewBeat(.83,true),{approach:0,active:false});
});
test('breathing closes and opens painted lips without moving the eyes',()=>{
  assert.equal(breathOpening(0),.06);assert.ok(Math.abs(breathOpening(1.8)-.56)<1e-12);
  assert.deepEqual(viewPoint(.4,.63,0,true),viewPoint(.4,.63,1.8,true));
  const closed=viewPoint(.518,.75,0,true),open=viewPoint(.518,.75,1.8,true);
  assert.ok(open.y-closed.y>.008);assert.equal(open.x,closed.x);
});
test('mouth deformation stays finite and vertically monotone through each breath',()=>{
  for(let t=0;t<=3.6;t+=.05)for(let u=.40;u<=.64;u+=.01){let prev=-Infinity;for(let v=.66;v<=.8;v+=.002){const p=viewPoint(u,v,t,true);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.y>prev);prev=p.y;}}
});

test('fast jumps and reversals keep a finite shared pose velocity and gradual retreat',()=>{
  const state=createChoreography(.5);let prior=state.progress,velocity=0;
  for(let i=0;i<480;i++){
    const target=i<120?1:i<180?.60:1;
    stepChoreography(state,target,1/60);
    assert.ok(Math.abs(state.progress-prior)<=.20/60+1e-10);
    assert.ok(Math.abs(state.velocity-velocity)<=1.6/60+1e-9);
    assert.ok(state.progress>=0&&state.progress<=1);
    prior=state.progress;velocity=state.velocity;
  }
  assert.equal(state.progress,1);assert.equal(state.velocity,0);
  stepChoreography(state,.65,.01,true);assert.equal(state.progress,.65);assert.equal(state.velocity,0);
});
test('camera progress follows elapsed time with irregular RAF pacing and keeps the approved first half',()=>{
  const a=createChoreography(.5),b=createChoreography(.5);
  for(let i=0;i<120;i++)stepChoreography(a,.85,1/60);
  for(let i=0;i<20;i++){stepChoreography(b,.85,.017);stepChoreography(b,.85,.083);}
  assert.ok(Math.abs(a.progress-b.progress)<.0005);
  const first=createChoreography(.2);stepChoreography(first,.43,1/60);assert.equal(first.progress,.43);
});
