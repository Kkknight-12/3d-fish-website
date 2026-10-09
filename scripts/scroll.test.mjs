import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleJourney, scrollProgress, followProgress } from '../scroll.js';
import { fishBounds } from '../fish-bounds.js';

test('journey is a continuous reversible function of scroll, including turns',()=>{
  let previous=sampleJourney(0);
  for(let i=1;i<=10000;i++){
    const p=i/10000,next=sampleJourney(p);
    assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y)<.002);
    assert.ok(Math.abs(next.angle-previous.angle)<1,'heading cannot jump at a curve or angle wrap');
    assert.ok(Math.abs(next.scale-previous.scale)<.001);
    assert.deepEqual(next,sampleJourney(p),'same scroll position restores exactly the same path pose');
    assert.ok(Math.abs(next.weights.reduce((a,b)=>a+b,0)-1)<1e-12);
    previous=next;
  }
  for(const p of [0,.2,.43,.61,.82,1])assert.deepEqual(sampleJourney(p),sampleJourney(p));
});
test('holds keep each chapter fully readable',()=>{
  assert.deepEqual(sampleJourney(.12).weights,[1,0,0]);
  assert.deepEqual(sampleJourney(.52).weights,[0,1,0]);
  assert.deepEqual(sampleJourney(.92).weights,[0,0,1]);
});
test('rapid reversal follows the latest native scroll target without overshoot',()=>{
  let value=0;
  for(const target of [1,0,.9,.1,1,0])for(let i=0;i<180;i++){
    const before=value;value=followProgress(value,target,1/60);
    assert.ok(value>=Math.min(before,target)-1e-12&&value<=Math.max(before,target)+1e-12);
  }
  assert.ok(value<.0001);
  assert.equal(scrollProgress(650,50,1200),.5);
  assert.equal(scrollProgress(-100,0,1200),0);
  assert.equal(scrollProgress(5000,0,1200),1);
});
test('reduced motion removes path travel, scale and animated reveals',()=>{
  for(const mobile of [false,true]){
    const first=sampleJourney(0,mobile,true);
    for(const p of [.1,.3,.5,.7,.9,1]){
      const pose=sampleJourney(p,mobile,true);
      for(const key of ['x','y','angle','scale','orbit','revealY','currentLine'])assert.equal(pose[key],first[key]);
      assert.equal(pose.weights.filter(v=>v===1).length,1);
      assert.equal(followProgress(.1,p,1/60,true),p);
    }
  }
});
test('silhouette fitting is continuous and finite through an entire turn',()=>{
  for(let angle=-20;angle<=450;angle+=.25){
    const b=fishBounds(angle);
    assert.ok(Object.values(b).every(Number.isFinite));
    assert.ok(b.left<b.right&&b.bottom<b.top);
    const next=fishBounds(angle+.001);
    assert.ok(Math.max(...Object.keys(b).map(k=>Math.abs(b[k]-next[k])))<.001);
  }
});
