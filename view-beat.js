const clamp=v=>Math.max(0,Math.min(1,v));
export function ramp(a,b,v){const t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
export function viewBeat(progress,reduced=false){
  if(reduced)return{approach:0,active:false};
  return{approach:ramp(.50,.76,progress)*(1-ramp(.89,1,progress)),active:progress>.5&&progress<1};
}
// Native scrolling is unrestricted; the fish's shared pose has finite speed and
// acceleration, so a quick wheel jump still traverses the complete camera turn.
export function createChoreography(progress=0){return{progress,velocity:0,active:false};}
export function stepChoreography(state,target,seconds,reduced=false){
  if(reduced){state.progress=target;state.velocity=0;state.active=false;return;}
  if(!state.active&&target<.5&&state.progress<.5){state.progress=target;return;}
  state.active=true;let remaining=seconds;
  while(remaining>1e-9){
    const dt=Math.min(remaining,1/120);remaining-=dt;
    const delta=target-state.progress,rate=state.progress>=.88?.14:state.progress>=.49?.20:1.2;
    const desired=Math.max(-rate,Math.min(rate,delta*5));
    state.velocity+=Math.max(-1.6*dt,Math.min(1.6*dt,desired-state.velocity));
    const advance=state.velocity*dt;
    if(advance*delta>0&&Math.abs(advance)>=Math.abs(delta)){state.progress=target;state.velocity=0;}
    else state.progress=clamp(state.progress+advance);
  }
  if(Math.abs(state.progress-target)<.00001&&Math.abs(state.velocity)<.0001){state.progress=target;state.velocity=0;if(target<.5)state.active=false;}
}
export function breathOpening(seconds){const pulse=(1-Math.cos(seconds*Math.PI*2/3.6))/2;return .06+.50*pulse*pulse;}
export function viewPoint(u,v,seconds,front,out={}){
  const phase=seconds*Math.PI*2/10,edge=ramp(.12,.32,Math.abs(u-.5)),tail=1-ramp(.28,.55,v);
  out.x=u+.007*edge*Math.sin(phase*2+v*8)+.010*tail*Math.sin(phase*2-v*7);
  out.y=v+.008*edge*Math.sin(phase*2+u*8)+.004*tail*Math.sin(phase*3+v*6);
  if(front){const mouth=ramp(.395,.46,u)*(1-ramp(.575,.635,u))*ramp(.675,.711,v)*(1-ramp(.75,.785,v));out.y-=(v-.731)*(1-breathOpening(seconds))*mouth;}
  return out;
}
