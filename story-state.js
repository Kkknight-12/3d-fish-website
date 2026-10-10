export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
export function envelope(p,start,end,fade=.04){return ease((p-start)/fade)*(1-ease((p-end+fade)/fade));}
export function storyState(p){p=clamp(p);return{
 habitat: envelope(p,.045,.27,.045),
 movement:envelope(p,.32,.615,.055),
 life:envelope(p,.625,.81,.045),
 birth:envelope(p,.79,.945,.045),
 credits:ease((p-.935)/.055),
 title0:1-ease((p-.20)/.10),
 title1:envelope(p,.245,.64,.075),
 title2:envelope(p,.605,.955,.06),
};}
