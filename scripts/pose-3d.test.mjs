import test from 'node:test';
import assert from 'node:assert/strict';
import {createTurn,stepTurn,spineColumns,preparePoint,writePoint} from '../spine.js';
import {DEPTH_STRIDE,isDorsalHead,restPitch,turnPitch,createDepthTurn,stepDepthTurn,depthColumns,surfacePoint,facePoint3D,project3D,fitProjection} from '../pose-3d.js';
import {LOOP_SECONDS,TAU} from '../motion.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);
test('zero pitch retains the approved articulated swimming projection',()=>{
  const yaw=createTurn(25),depth=createDepthTurn();stepTurn(yaw,125,.5);
  const flat=spineColumns(yaw,72),spatial=depthColumns(yaw,depth,72);
  for(const seconds of [0,1,3,7,10])for(let col=0;col<=72;col+=3)for(const v of [.1,.3,.5,.8,.95]){
    const motion=preparePoint(col/72,v),old=writePoint(motion,seconds/LOOP_SECONDS*TAU,1.4,flat.subarray(col*4,col*4+4),.5,{}),next=surfacePoint(motion,seconds,1.4,spatial.subarray(col*7,col*7+7),.5,{});
    near(next.x,old.x);near(next.y,old.y*.5);
  }
});
test('head leads depth rotation through intermediate angles; tail follows on reversal',()=>{
  const d=createDepthTurn();let previous=0;const seen=new Set();
  for(let i=0;i<90;i++){stepDepthTurn(d,Math.PI/2,1/60);assert.ok(Math.abs(d.angles[0]-previous)<=2/60+1e-7);seen.add(Math.floor(d.angles[0]*180/Math.PI/10));previous=d.angles[0];if(i===20)assert.ok(d.angles[0]>d.angles[2]&&d.angles[2]>d.angles[5]);}
  assert.ok(seen.size>=8,'rotation must traverse intermediate angles');
  for(let i=0;i<90;i++){stepDepthTurn(d,0,1/60);assert.ok(Math.abs(d.angles[0]-previous)<=2/60+1e-7);previous=d.angles[0];if(i===25){const remaining=d.angles.map((a,j)=>a/restPitch(Math.PI/2,j));assert.ok(remaining[0]<remaining[2]&&remaining[2]<remaining[5],'head completes more of its return before the curved tail');}}
});
test('spatial spine keeps arc length while rotating and bending',()=>{
  const yaw=createTurn(25),d=createDepthTurn();
  for(const target of [Math.PI/2,0,Math.PI/2,0])for(let frame=0;frame<100;frame++){
    stepTurn(yaw,frame<50?170:20,1/60);stepDepthTurn(d,target,1/60);const cols=depthColumns(yaw,d,72);
    for(let i=0;i<72;i++){const a=i*DEPTH_STRIDE,b=(i+1)*DEPTH_STRIDE;near(Math.hypot(cols[b]-cols[a],cols[b+1]-cols[a+1],cols[b+2]-cols[a+2]),1/72,1e-10);}
  }
});
test('frontal surface rotates continuously without reversed eyes or mirrored geometry',()=>{
  const yaw=createTurn(270),d=createDepthTurn();
  for(const [width,height] of [[1718,844],[390,684],[320,662]])for(let i=1;i<=1000;i++){
    const pitch=Math.PI/2*i/1000;d.angles.fill(pitch);const cols=depthColumns(yaw,d,72),head=cols.subarray(72*7);
    const pose={fishWidth:Math.min(width,height)*.65,centerX:width/2,centerY:height/2,angle:270};
    const eyeLeft=project3D(facePoint3D(.420,.637,head),pose,width,height),eyeRight=project3D(facePoint3D(.631,.637,head),pose,width,height),mouth=project3D(facePoint3D(.518,.731,head),pose,width,height);
    const area=(eyeRight.x-eyeLeft.x)*(mouth.y-eyeLeft.y)-(eyeRight.y-eyeLeft.y)*(mouth.x-eyeLeft.x);
    assert.ok(area>0);assert.ok(eyeLeft.x<eyeRight.x);assert.ok(Number.isFinite(mouth.z));
  }
});
test('the painted head has spatial volume and a fixed body joint',()=>{
  const yaw=createTurn(0),d=createDepthTurn(),head=depthColumns(yaw,d,72).subarray(72*7);
  const pole=facePoint3D(.518,.637,head),rim=facePoint3D(.669,.637,head),crown=facePoint3D(.518,.489,head);
  assert.ok(pole.x-rim.x>.204,'a curved head must cover its source head region and overlap the neck');
  near(rim.x,.300);near(pole.x,.505);assert.ok(crown.z>pole.z+.104);
});
test('original eye, nose and rear gill paint are excluded while surrounding fins remain',()=>{
  for(const uv of [[.933,.453],[.934,.606],[.982,.538],[.86,.43],[.863,.633]])assert.equal(isDorsalHead(...uv),true);
  for(const uv of [[.853,.2],[.865,.8],[.75,.53]])assert.equal(isDorsalHead(...uv),false);
});
test('turn pitch is continuous at holds and reduced motion removes depth',()=>{
  near(turnPitch(.54),0);near(turnPitch(.78),Math.PI/2);near(turnPitch(.86),Math.PI/2);near(turnPitch(.99),0);
  for(let i=0;i<10000;i++)assert.ok(Math.abs(turnPitch((i+1)/10000)-turnPitch(i/10000))<.002);
  const d=createDepthTurn(1);stepDepthTurn(d,1,.1,true);assert.ok(d.angles.every(a=>a===0));near(turnPitch(.85,true),0);
});
test('projected paint fits mobile and desktop without changing aspect or upscaling',()=>{
  for(const [w,h] of [[320,560],[390,660],[1718,800]])for(const bounds of [[-300,-200,800,900],[100,100,200,250],[w-50,h-50,w+50,h+200]]){
    const fit=fitProjection(bounds,w,h,16),box=bounds.map((v,i)=>v*fit.scale+(i%2?fit.y:fit.x));
    assert.ok(fit.scale>0&&fit.scale<=1);assert.ok(box[0]>=16-1e-7&&box[1]>=16-1e-7);assert.ok(box[2]<=w-16+1e-7&&box[3]<=h-16+1e-7);
    near((box[2]-box[0])/(box[3]-box[1]),(bounds[2]-bounds[0])/(bounds[3]-bounds[1]));
  }
});
