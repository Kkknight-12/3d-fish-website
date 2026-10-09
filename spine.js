// Head-led articulation. Angles follow through the body with increasing delay;
// the same state is sampled by both renderers from the single animation clock.
const TAU=Math.PI*2;
export const radians=degrees=>degrees*Math.PI/180;
export const degrees=radians=>radians*180/Math.PI;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const wrap=v=>((v+Math.PI)%TAU+TAU)%TAU-Math.PI;
export function createTurn(angle){return{angles:new Float64Array(6).fill(radians(angle)),velocity:0,version:0};}
export function stepTurn(state,targetDegrees,seconds,reduced=false){
  const a=state.angles,target=a[0]+wrap(radians(targetDegrees)-a[0]);
  if(reduced){if(a.some(v=>Math.abs(v-target)>1e-9)){a.fill(target);state.version++;}state.velocity=0;return;}
  let remaining=seconds,changed=false;
  while(remaining>1e-9){
    const dt=Math.min(remaining,1/120);remaining-=dt;
    const delta=target-a[0],desired=clamp(delta*6,-2.4,2.4);
    state.velocity+=(desired-state.velocity)*(1-Math.exp(-dt/.12));
    const advance=state.velocity*dt;
    if(advance*delta>0&&Math.abs(advance)>Math.abs(delta)){a[0]=target;state.velocity=0;}else a[0]+=advance;
    for(let i=1;i<a.length;i++){
      a[i]+=(a[i-1]-a[i])*(1-Math.exp(-dt/(.10+i*.018)));
      // Bound the bend through the long painted fins. No joint can flip.
      a[i]=clamp(a[i],a[0]-.95,a[0]+.95);
    }
    changed=true;
  }
  if(Math.abs(target-a[0])<1e-5&&Math.abs(state.velocity)<1e-4&&a.every(v=>Math.abs(v-target)<1e-5)){
    if(a.some(v=>v!==target)||state.velocity!==0){a.fill(target);state.velocity=0;changed=true;}
    else changed=false;
  }
  if(changed)state.version++;
}
export function turnSettled(state,target){return Math.abs(wrap(radians(target)-state.angles[0]))<1e-5&&Math.abs(state.velocity)<1e-4&&state.angles.every(v=>Math.abs(v-state.angles[0])<1e-5);}
function angleAt(state,u){
  if(u>=.82)return 0;
  const t=clamp((.82-u)/.82*5,0,5),i=Math.min(4,Math.floor(t)),f=t-i,e=f*f*(3-2*f);
  return state.angles[i]+(state.angles[i+1]-state.angles[i])*e-state.angles[0];
}
export function spineColumns(state,cols,out=new Float32Array((cols+1)*4)){
  let x=.5,y=0;
  for(let i=cols;i>=0;i--){
    const u=i/cols;
    if(i<cols){const mid=angleAt(state,(i+.5)/cols);x-=Math.cos(mid)/cols;y-=Math.sin(mid)/cols;}
    const angle=angleAt(state,u),at=i*4;
    out[at]=x;out[at+1]=y;out[at+2]=Math.cos(angle);out[at+3]=Math.sin(angle);
  }
  return out;
}

// Cache the spatial masks of the approved swimming field once per vertex.
const smooth=(lo,hi,v)=>{const t=clamp((v-lo)/(hi-lo),0,1);return t*t*(3-2*t);};
export function preparePoint(u,v){
  const tail=1-smooth(.13,.60,u),head=1-smooth(.73,.91,u),across=v-.5,edge=smooth(.09,.40,Math.abs(across));
  const pectoral=Math.exp(-Math.pow((u-.76)/.15,2))*edge;
  return{u,v,y:across,spine:head*(.012+.112*tail),tail:tail*edge*.045,fin:pectoral*.048,dxTail:tail*edge*.020,dxFin:pectoral*.018};
}
export function writePoint(p,phase,current,column,aspect,out){
  const dx=current*(p.dxTail*Math.sin(phase*2+p.v*9)+p.dxFin*Math.sin(phase*2+p.v*7));
  const dy=current*(p.spine*Math.sin(phase*2-p.u*7.4)+p.tail*Math.sin(phase*3-p.u*10+p.y*8)+p.fin*Math.sin(phase*2+p.y*5+p.u*4));
  const lateral=(p.y+dy)*aspect,c=column[2],s=column[3];
  out.x=column[0]+dx*c-lateral*s;out.y=(column[1]+dx*s+lateral*c)/aspect;
  return out;
}
