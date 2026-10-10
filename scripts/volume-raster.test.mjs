import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {volumeClipPolygon,padVolumeTexture} from '../volume-raster.js';
function inside(p,poly){let signs=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],s=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(Math.abs(s)>1e-8)signs.push(Math.sign(s));}return signs.every(s=>s===signs[0]);}
test('true volume outset covers original and edge-normal samples of skinny triangles',()=>{
  for(const points of[[{x:0,y:0},{x:100,y:0},{x:20,y:.15}],[{x:0,y:0},{x:30,y:.05},{x:3,y:15}],[{x:0,y:0},{x:20,y:0},{x:10,y:20}]])for(const ps of[points,points.slice().reverse()]){
    const poly=volumeClipPolygon(ps),[p,q,r]=ps,sign=Math.sign((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x));
    assert.ok(poly.length>=3&&poly.length<=6);for(const p of ps)assert.ok(inside(p,poly));
    for(let i=0;i<3;i++){const a=ps[i],b=ps[(i+1)%3],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),p={x:(a.x+b.x)/2+sign*dy/l*.65,y:(a.y+b.y)/2-sign*dx/l*.65};assert.ok(inside(p,poly));}
    for(const p of poly){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(Math.min(...ps.map(q=>Math.hypot(p.x-q.x,p.y-q.y)))<=2.8+1e-9);}
  }
});
test('acute corner bevel avoids unbounded spikes',()=>{
  const ps=[{x:0,y:0},{x:1000,y:0},{x:0,y:.001}],poly=volumeClipPolygon(ps);
  assert.ok(poly.length>3);assert.ok(poly.every(p=>p.x>=-2.8&&p.x<=1002.8&&p.y>=-2.8&&p.y<=2.801));
});
test('source texel padding replicates all four edges and corners',()=>{
  const previous=globalThis.document,calls=[],canvas={width:0,height:0,getContext:()=>({drawImage:(...args)=>calls.push(args)})};globalThis.document={createElement:()=>canvas};
  try{const source={width:100,height:50},p=padVolumeTexture(source);assert.equal(p.image.width,164);assert.equal(p.image.height,114);assert.equal(p.pad,32);assert.equal(calls.length,9);assert.ok(calls.every(c=>c[0]===source));}finally{globalThis.document=previous;}
});
test('renderer confines new clipping and full padded sampling to volume only',()=>{
  const s=readFileSync(new URL('../view-renderer.js',import.meta.url),'utf8');assert.match(s,/if\(t.volume\)\{const poly=volumeClipPolygon/);assert.match(s,/if\(t.volume\)ctx.drawImage\(data.image,0,0\);else ctx.drawImage\(data.image,data.x,data.y,data.w,data.h/);assert.match(s,/else \{const grow=v=>/);assert.match(s,/padded=padVolumeTexture\(image\)/);
});
