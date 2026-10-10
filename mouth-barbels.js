/** Two tapered, mouth-local barbels. No replacement image or head geometry.
 * Roots bind to the exact painted lip triangles, including their deformation.
 * The curve and round cross-section stay fixed in the same head frame.
 */
import {framePoint} from './pose-3d.js';
import {ramp} from './view-beat.js';
const mix=(a,b,t)=>a+(b-a)*t;
const unit=p=>{const n=Math.hypot(p.x,p.y,p.z);return{x:p.x/n,y:p.y/n,z:p.z/n};};
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export const BARBEL_LIP_UV=Object.freeze([[.34,.85],[.66,.85]].map(Object.freeze));
// The old planar source is fully trimmed at .30 radians. Never show two pairs.
export const barbelVisibility=pitch=>ramp(.30,.36,pitch);
export function mouthBarbelCurve(side,t){
  if(side!==-1&&side!==1)throw new Error('Barbel side must be -1 or 1');
  t=Math.max(0,Math.min(1,t));const s=1-t;
  const controls=[{x:0,y:0,z:0},{x:.018,y:side*.025,z:-.012},
    {x:.014,y:side*.070,z:-.032},{x:-.014,y:side*.079,z:-.017}];
  const point={},tangent={};
  for(const key of ['x','y','z']){
    const [a,b,c,d]=controls.map(p=>p[key]);
    point[key]=a*s*s*s+3*b*s*s*t+3*c*s*t*t+d*t*t*t;
    tangent[key]=3*(b-a)*s*s+6*(c-b)*s*t+3*(d-c)*t*t;
  }
  return {...point,tangent:unit(tangent),radius:.0025*Math.pow(1-t,1.15)};
}
/** Resolve the anterior-most matching UV triangle, rather than a guessed
 * head landmark or the hidden belly triangle sharing the same face chart.
 */
export function bindMouthCorner(vertices,triangles,uv){
  let best=null;
  for(const triangle of triangles){
    if(triangle.chart!=='anterior')continue;
    const points=triangle.p?[triangle.p,triangle.q,triangle.r]:[triangle.a,triangle.b,triangle.c].map(i=>vertices[i]);
    const [p,q,r]=points,ax=q.frontU-p.frontU,ay=q.frontV-p.frontV,bx=r.frontU-p.frontU,by=r.frontV-p.frontV,det=ax*by-ay*bx;
    if(Math.abs(det)<1e-12)continue;
    const x=uv[0]-p.frontU,y=uv[1]-p.frontV,b=(x*by-y*bx)/det,c=(ax*y-ay*x)/det,weights=[1-b-c,b,c];
    if(weights.some(w=>w< -1e-8))continue;
    const u=points.reduce((n,p,i)=>n+p.u*weights[i],0);
    if(!best||u>best.u)best={u,points,weights,uv:uv.slice()};
  }
  if(!best||best.u<.90)throw new Error('Mouth corner is outside the anterior lip surface');
  return best;
}
export function createMouthBarbels(vertices,triangles,{steps=24,sides=8}={}){
  if(!Number.isInteger(steps)||steps<8||!Number.isInteger(sides)||sides<6)throw new Error('Invalid barbel resolution');
  const out={vertices:[],triangles:[],roots:[]};
  for(const [index,side] of [-1,1].entries()){
    const root=bindMouthCorner(vertices,triangles,BARBEL_LIP_UV[index]);out.roots.push(root);
    const first=out.vertices.length;
    for(let i=0;i<=steps;i++){
      const t=i/steps,p=mouthBarbelCurve(side,t),a=unit(cross(p.tangent,{x:0,y:0,z:1})),b=cross(p.tangent,a);
      for(let j=0;j<sides;j++){
        const angle=j*Math.PI*2/sides,c=Math.cos(angle),s=Math.sin(angle),normal={x:a.x*c+b.x*s,y:a.y*c+b.y*s,z:a.z*c+b.z*s};
        out.vertices.push({root,t,local:{x:p.x+normal.x*p.radius,y:p.y+normal.y*p.radius,z:p.z+normal.z*p.radius},normal,x:0,y:0,z:0});
      }
    }
    const add=(a,b,c)=>{
      const p=out.vertices[a],q=out.vertices[b],r=out.vertices[c];
      const light=Math.max(0,Math.min(1,.58+(p.normal.z+q.normal.z+r.normal.z)/3*.30-(p.normal.y+q.normal.y+r.normal.y)/3*.10));
      const color=`rgb(${Math.round(mix(157,255,light))},${Math.round(mix(155,248,light))},${Math.round(mix(137,220,light))})`;
      out.triangles.push({p,q,r,barbel:true,color,depth:0});
    };
    for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){
      const a=first+i*sides+j,b=first+i*sides+(j+1)%sides,c=a+sides,d=b+sides;
      add(a,b,c);if(i<steps-1)add(b,d,c);
    }
  }
  return out;
}
/** The root is a barycentric blend of already posed lip vertices. Offsets
 * rotate in the head column, then use the renderer's identical projection.
 */
export function projectMouthBarbels(barbels,head,project){
  const origin=project({x:head[0],y:head[1],z:head[2]});
  for(const root of barbels.roots){root.projected={};for(const key of ['x','y','z'])root.projected[key]=root.points.reduce((n,p,i)=>n+p[key]*root.weights[i],0);}
  for(const vertex of barbels.vertices){
    const p=vertex.local,q=project(framePoint(head,p.x,p.y,p.z,{}));
    for(const key of ['x','y','z'])vertex[key]=vertex.root.projected[key]+q[key]-origin[key];
  }
  return barbels;
}
