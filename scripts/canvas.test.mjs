import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRenderer, triangleTransform } from '../canvas-renderer.js';

test('a missing WebGL context selects animated Canvas instead of still artwork',()=>{
  const software={render(){},resize(){}};
  const result=selectRenderer(()=>{throw new Error('WebGL unavailable');},()=>software);
  assert.equal(result.renderer,software);
  assert.equal(result.type,'canvas-deforming-mesh');
  assert.equal(result.reason,'WebGL unavailable');
});
test('available WebGL preserves the original renderer without creating Canvas',()=>{
  const original={};let softwareCalled=false;
  const result=selectRenderer(()=>original,()=>{softwareCalled=true;});
  assert.equal(result.renderer,original);assert.equal(result.type,'webgl-deforming-mesh');assert.equal(softwareCalled,false);
});
test('the default Canvas route is selected before requesting WebGL',()=>{
  const software={};let gpuCalled=false;
  const result=selectRenderer(()=>{gpuCalled=true;},()=>software,true);
  assert.equal(result.renderer,software);assert.equal(result.type,'canvas-deforming-mesh');assert.equal(gpuCalled,false);
});
test('an unavailable default Canvas still tries WebGL before still artwork',()=>{
  const gpu={};const result=selectRenderer(()=>gpu,()=>{throw new Error('Canvas unavailable');},true);
  assert.equal(result.renderer,gpu);assert.equal(result.type,'webgl-deforming-mesh');assert.equal(result.reason,'Canvas unavailable');
});
test('software texture mapping lands every vertex after rotation, deformation and Y flip',()=>{
  const source=[{x:0,y:80},{x:40,y:80},{x:0,y:40}];
  for(const target of [[{x:10,y:20},{x:45,y:15},{x:4,y:55}],[{x:50,y:20},{x:15,y:25},{x:56,y:55}]]){
    const [a,b,c,d,e,f]=triangleTransform(source,target);
    source.forEach((p,i)=>{
      assert.ok(Math.abs(a*p.x+c*p.y+e-target[i].x)<1e-10);
      assert.ok(Math.abs(b*p.x+d*p.y+f-target[i].y)<1e-10);
    });
  }
  assert.equal(triangleTransform([source[0],source[0],source[1]],source),null);
});
