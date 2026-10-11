// Surface illustration, not fluid simulation. Immutable contours are shed into
// world space; each packet keeps the shape and heading of its birth moment.
export function convexContour(vertices){
 const p=vertices.filter(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)).map(v=>({x:v.x,y:v.y})).sort((a,b)=>a.x-b.x||a.y-b.y);
 if(p.length<3)return p;
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lo=[],hi=[];
 for(const q of p){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}
 for(const q of [...p].reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),q)<=0)hi.pop();hi.push(q);}return lo.slice(0,-1).concat(hi.slice(0,-1));
}
export function createWaterMotion(){
 let packets=[],lastSpawn=-10,previous=null,serial=0;
 return {reset(){packets=[];previous=null;lastSpawn=-10;},update(contour,time,{depth=0,current=1,phase=0,reduced=false}={}){
  if(reduced){packets=[];previous=null;return packets;}
  packets=packets.filter(p=>time-p.born<p.life);
  if(contour.length<4)return packets;
  const center=contour.reduce((a,p)=>({x:a.x+p.x/contour.length,y:a.y+p.y/contour.length}),{x:0,y:0});
  const dt=previous?time-previous.time:0,speed=dt>0?Math.min(180,Math.hypot(center.x-previous.x,center.y-previous.y)/dt):0;
  previous={...center,time};
  const surface=Math.max(0,1-Math.abs(depth)/65);
  const energy=surface*(.30+Math.min(.55,speed/170)+current*.13)*(.82+.18*Math.sin(phase*2));
  if(energy<.055||time-lastSpawn<.7+(1-energy)*.55)return packets;
  lastSpawn=time;serial++;
  // Traverse an open fraction of the real body outline, alternating sides.
  // Never close a ring, and never reattach a historical packet to the fish.
  const n=contour.length,start=(serial%2?0:Math.floor(n*.5))+Math.floor(Math.sin(serial*2.7)*n*.08),count=Math.max(3,Math.floor(n*(.29+.05*Math.sin(serial))));
  const points=[];
  for(let j=0;j<count;j++){
   const p=contour[(start+j+n)%n],dx=p.x-center.x,dy=p.y-center.y,l=Math.hypot(dx,dy)||1;
   points.push({x:p.x,y:p.y,nx:dx/l,ny:dy/l});
  }
  packets.push({points,born:time,life:2.8,energy,seed:serial});
  if(packets.length>5)packets.shift();return packets;
 },get packets(){return packets;}};
}
export function wakePoints(packet,time){
 const age=Math.max(0,time-packet.born);
 return packet.points.map((p,i)=>{const edge=Math.sin(Math.PI*i/(packet.points.length-1)),d=2+age*(10+3*Math.sin(i*.9+packet.seed));return{x:p.x+p.nx*d+age*2.2,y:p.y+p.ny*d+age*1.1,nx:p.nx,ny:p.ny,edge};});
}

export function distortReflection(x,y,wakes){
 let delta=0;
 for(const w of wakes)for(let i=1;i<w.points.length;i+=3){const p=w.points[i],d=((x-p.x)**2+(y-p.y)**2)/6400;delta+=Math.exp(-d)*w.fade*w.packet.energy*p.ny*22;}
 return y+delta;
}
