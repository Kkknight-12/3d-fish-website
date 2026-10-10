/** True edge-normal triangle outset. Acute corners are beveled rather than
 * creating unbounded miter spikes. Input/output are screen CSS pixels. */
export function volumeClipPolygon(points,outset=.7,miterLimit=2.8){
  const [p,q,r]=points,area=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x),sign=area>=0?1:-1;
  const normals=points.map((p,i)=>{const q=points[(i+1)%3],dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);return len>1e-12?{x:sign*dy/len,y:-sign*dx/len}:{x:0,y:0};});
  const poly=[];
  for(let i=0;i<3;i++){
    const p=points[i],a=normals[(i+2)%3],b=normals[i],den=1+a.x*b.x+a.y*b.y;
    const dx=den>1e-10?(a.x+b.x)*outset/den:Infinity,dy=den>1e-10?(a.y+b.y)*outset/den:Infinity;
    if(Math.hypot(dx,dy)<=miterLimit)poly.push({x:p.x+dx,y:p.y+dy});
    else {poly.push({x:p.x+a.x*outset,y:p.y+a.y*outset});poly.push({x:p.x+b.x*outset,y:p.y+b.y*outset});}
  }
  return poly;
}
/** Replicate texture boundary pixels so a volume's expanded screen clip has
 * actual source texels beyond its UV boundary, rather than transparent edges. */
export function padVolumeTexture(source,pad=32){
  const c=document.createElement('canvas');c.width=source.width+2*pad;c.height=source.height+2*pad;const g=c.getContext('2d'),w=source.width,h=source.height;
  g.drawImage(source,pad,pad);
  g.drawImage(source,0,0,w,1,pad,0,w,pad);g.drawImage(source,0,h-1,w,1,pad,pad+h,w,pad);
  g.drawImage(source,0,0,1,h,0,pad,pad,h);g.drawImage(source,w-1,0,1,h,pad+w,pad,pad,h);
  for(const [sx,sy,dx,dy]of[[0,0,0,0],[w-1,0,pad+w,0],[0,h-1,0,pad+h],[w-1,h-1,pad+w,pad+h]])g.drawImage(source,sx,sy,1,1,dx,dy,pad,pad);
  return {image:c,pad};
}
