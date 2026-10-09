import test from 'node:test';
import assert from 'node:assert/strict';
import { deformPoint, makeGrid, startsPlaying, TAU, COLS, ROWS } from '../motion.js';

test('all deformation waves join at the loop boundary', () => {
  for (const strength of [.65,1,1.4]) for (let u=0;u<=1.00001;u+=.025) for (let v=0;v<=1.00001;v+=.025) {
    const a=deformPoint(u,v,0,strength), b=deformPoint(u,v,TAU,strength);
    assert.ok(Math.abs(a.x-b.x)<1e-12 && Math.abs(a.y-b.y)<1e-12);
  }
});

test('tail and fins deform while the head stays steady', () => {
  const positions=(u,v)=>Array.from({length:120},(_,i)=>deformPoint(u,v,i/120*TAU));
  const range=(points,key)=>Math.max(...points.map(p=>p[key]))-Math.min(...points.map(p=>p[key]));
  assert.ok(range(positions(.95,.50),'y')<.003, 'face should stay anchored');
  assert.ok(range(positions(.15,.75),'y')>.16, 'tail should bend visibly');
  assert.ok(range(positions(.76,.90),'y')>.055, 'pectoral fin should flutter independently');
  const low=range(Array.from({length:120},(_,i)=>deformPoint(.15,.75,i/120*TAU,.65)),'y');
  const high=range(Array.from({length:120},(_,i)=>deformPoint(.15,.75,i/120*TAU,1.4)),'y');
  assert.ok(high>low*2, 'current should change deformation amplitude');
});

test('mesh indices stay in range and triangles do not fold at any current', () => {
  const {uv,indices}=makeGrid();
  assert.equal(uv.length,(COLS+1)*(ROWS+1)*2);
  assert.equal(indices.length,COLS*ROWS*6);
  assert.ok(Math.max(...indices)<uv.length/2);
  for (const strength of [.65,1,1.4]) for (let phase=0;phase<TAU;phase+=TAU/24) {
    const points=[];
    for(let i=0;i<uv.length;i+=2) points.push(deformPoint(uv[i],uv[i+1],phase,strength));
    for(let i=0;i<indices.length;i+=3){
      const [a,b,c]=[points[indices[i]],points[indices[i+1]],points[indices[i+2]]];
      const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      assert.ok(Number.isFinite(area) && area < -1e-7, 'triangles should retain winding without collapsing');
    }
  }
});

test('reduced-motion preference starts with a still image', () => {
  assert.equal(startsPlaying(true),false);
  assert.equal(startsPlaying(false),true);
});
