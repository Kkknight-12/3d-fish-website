// One native-scroll timeline drives path, heading, scale and chapter reveals.
// The preserved swimming phase intentionally continues independently.
export const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const mix = (a, b, t) => a + (b-a)*t;
const ease = v => { const t=clamp(v); return t*t*(3-2*t); };
export function scrollProgress(y,start,travel){return travel>0?clamp((y-start)/travel):0;}
export function followProgress(v,target,seconds,reduced=false){
  if(reduced||Math.abs(target-v)<.00002)return target;
  return mix(v,target,1-Math.exp(-Math.max(0,seconds)/.14));
}
const timing=[[0,0],[.20,.075],[.43,.49],[.61,.56],[.82,.94],[1,1]];
function pathTime(p){for(let i=1;i<timing.length;i++){const[end,to]=timing[i],[start,from]=timing[i-1];if(p<=end)return mix(from,to,ease((p-start)/(end-start)));}return 1;}
function bezier(points,t){
  const a=1-t;
  const x=a*a*a*points[0][0]+3*a*a*t*points[1][0]+3*a*t*t*points[2][0]+t*t*t*points[3][0];
  const y=a*a*a*points[0][1]+3*a*a*t*points[1][1]+3*a*t*t*points[2][1]+t*t*t*points[3][1];
  const dx=3*a*a*(points[1][0]-points[0][0])+6*a*t*(points[2][0]-points[1][0])+3*t*t*(points[3][0]-points[2][0]);
  const dy=3*a*a*(points[1][1]-points[0][1])+6*a*t*(points[2][1]-points[1][1])+3*t*t*(points[3][1]-points[2][1]);
  return{x,y,dx,dy};
}
const outward=[[.53,.50],[.80,.626],[.76,.90],[.38,.58]];
const homeward=[[.38,.58],[.07,.318947368421],[.24,.365],[.53,.50]];
export function sampleJourney(raw,mobile=false,reduced=false){
  const progress=clamp(raw),time=pathTime(progress);
  const path=time<=.52?bezier(outward,time/.52):bezier(homeward,(time-.52)/.48);
  let angle=Math.atan2(path.dy,path.dx)*180/Math.PI;
  if(time>.52&&angle<180)angle+=360;else if(angle<0)angle+=360;
  const first=ease((progress-.20)/.23),second=ease((progress-.61)/.21);
  const chapter=progress<.315?0:progress<.715?1:2;
  return{progress,time,chapter,
    weights:reduced?[0,1,2].map(i=>Number(i===chapter)):[1-first,first*(1-second),second],
    x:reduced?(mobile?.5:.53):mobile?.5+(path.x-.53)*.65:path.x,
    y:reduced?(mobile?.52:.5):mobile?.52+(path.y-.5)*.76:path.y,
    angle:reduced?(mobile?43:25):angle+(mobile?18:0),
    scale:reduced?1:1-.12*Math.sin(time*Math.PI),orbit:reduced?0:time*95,
    revealY:reduced?0:30,currentLine:reduced?0:ease((progress-.17)/.55)};
}
