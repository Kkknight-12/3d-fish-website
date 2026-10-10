// Batched paint for the already-projected/cull-tested mesh. This detached canvas
// is copied into the existing 2D presentation canvas; Canvas remains a fallback.
export function createSpatialPainter(originalImage,frontImage,finImage,{onLost}={}){
  const canvas=document.createElement('canvas');
  let gl=null,ready=false,notified=false,program,buffer,capacity=0,storage=new Float32Array(0);
  const stride=9,bytes=stride*4,textures=[],fins=[];
  let reason='';
  const fail=(error='context-lost-or-gpu-error')=>{reason=String(error);ready=false;if(!notified){notified=true;try{onLost?.();}catch{}}return false;};
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
  // Deliberately remain on Canvas after loss rather than re-entering a flaky GPU.
  const api={canvas,get reason(){return reason;},get available(){return ready&&!(gl?.isContextLost());},resize,draw,loseContext(){gl?.getExtension('WEBGL_lose_context')?.loseContext();}};
  let screenLocation,depthLocation,passLocation;
  function shader(type,source){const s=gl.createShader(type);if(!s)throw new Error('Shader unavailable');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(log||'Shader compile failed');}return s;}
  try{
    gl=canvas.getContext('webgl',{alpha:true,depth:true,stencil:false,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false});
    if(!gl){reason='webgl-context-unavailable';return api;}
    const vertex=shader(gl.VERTEX_SHADER,`
      attribute vec3 aPosition;
      attribute vec2 aOriginal;
      attribute vec2 aFront;
      attribute vec2 aMaterial;
      uniform vec2 uScreen;
      uniform float uDepth;
      varying vec2 vOriginal;
      varying vec2 vFront;
      varying vec2 vMaterial;
      void main(){
        gl_Position=vec4(aPosition.x/uScreen.x*2.0-1.0,1.0-aPosition.y/uScreen.y*2.0,-aPosition.z/uDepth,1.0);
        vOriginal=aOriginal;vFront=aFront;vMaterial=aMaterial;
      }`);
    const fragment=shader(gl.FRAGMENT_SHADER,`
      precision mediump float;
      uniform sampler2D uOriginal;
      uniform sampler2D uFront;
      uniform sampler2D uFin;
      uniform float uPass;
      varying vec2 vOriginal;
      varying vec2 vFront;
      varying vec2 vMaterial;
      void main(){
        if(uPass>0.5){
          vec4 fin=texture2D(uFin,vOriginal);
          if(fin.a<0.0039)discard;
          gl_FragColor=fin;
        }else{
          vec3 skin=vec3(238.0,228.0,207.0)/255.0;
          vec4 dorsal=texture2D(uOriginal,vOriginal);
          skin=mix(skin,dorsal.rgb,dorsal.a*vMaterial.x);
          vec4 front=texture2D(uFront,vFront);
          skin=mix(skin,front.rgb,front.a*vMaterial.y);
          gl_FragColor=vec4(skin,1.0);
        }
      }`);
    program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link failed');
    gl.useProgram(program);buffer=gl.createBuffer();if(!buffer)throw new Error('Vertex buffer unavailable');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const [name,size,offset] of [['aPosition',3,0],['aOriginal',2,3],['aFront',2,5],['aMaterial',2,7]]){
      const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,bytes,offset*4);
    }
    screenLocation=gl.getUniformLocation(program,'uScreen');depthLocation=gl.getUniformLocation(program,'uDepth');passLocation=gl.getUniformLocation(program,'uPass');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    for(const [i,source] of [originalImage,frontImage,finImage].entries()){
      const texture=gl.createTexture();if(!texture)throw new Error('Texture unavailable');textures.push(texture);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform1i(gl.getUniformLocation(program,['uOriginal','uFront','uFin'][i]),i);
    }
    gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);gl.clearDepth(1);
    // RGB is premultiplied in the framebuffer, while shader texture colors are
    // straight alpha. Alpha needs ONE, not SRC_ALPHA, to avoid squaring it.
    gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    if(gl.getError()!==gl.NO_ERROR)throw new Error('WebGL setup failed');ready=true;
  }catch(error){fail(error?.message||error);}
  return api;

  function resize(pixelWidth,pixelHeight){
    if(!api.available)return false;
    if(!Number.isFinite(pixelWidth)||!Number.isFinite(pixelHeight)||pixelWidth<1||pixelHeight<1)return false;
    try{const w=Math.max(1,Math.round(pixelWidth)),h=Math.max(1,Math.round(pixelHeight));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;gl.viewport(0,0,canvas.width,canvas.height);return true;}catch(error){return fail(error?.message||error);}
  }
  function draw(paint,widthCSS,heightCSS,headWeightByPitch){
    if(!api.available)return false;
    if(!Number.isFinite(widthCSS)||!Number.isFinite(heightCSS)||widthCSS<=0||heightCSS<=0||!Number.isFinite(headWeightByPitch))return false;
    try{
      const needed=paint.length*3*stride;
      if(needed>capacity){capacity=Math.max(needed,capacity*2,4096);storage=new Float32Array(capacity);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,capacity*4,gl.DYNAMIC_DRAW);}
      let cursor=0,maxDepth=1;fins.length=0;
      const pitch=Math.max(0,Math.min(1,headWeightByPitch));
      function pack(t){
        const dorsal=t.volume&&t.chart==='dorsal'?1:0;
        const u=t.materialU??(t.p.u+t.q.u+t.r.u)/3;
        const k=Math.max(0,Math.min(1,(u-.78)/.08));
        // Match view-beat.ramp's smoothstep, constant across each material tile.
        const head=k*k*(3-2*k),front=t.volume?head*(dorsal?pitch:1):0;
        for(const v of [t.p,t.q,t.r]){
          const texture=t.volume?originalImage:finImage;
          const values=[v.x,v.y,v.z,v.sx/texture.width,v.sy/texture.height,t.volume?v.frontU:0,t.volume?v.frontV:0,dorsal,front];
          for(const value of values){if(!Number.isFinite(value)||Math.abs(value)>1e30)throw new Error('Invalid mesh coordinate');storage[cursor++]=value;}
          maxDepth=Math.max(maxDepth,Math.abs(v.z));
        }
      }
      for(const t of paint)if(t.volume)pack(t);else fins.push(t);
      const opaqueCount=cursor/stride;
      // Positive scene Z is nearer (the Canvas painter draws it last).
      fins.sort((a,b)=>(a.depth??((a.p.z+a.q.z+a.r.z)/3))-(b.depth??((b.p.z+b.q.z+b.r.z)/3)));
      for(const t of fins)pack(t);
      gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      if(cursor)gl.bufferSubData(gl.ARRAY_BUFFER,0,storage.subarray(0,cursor));
      gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(screenLocation,widthCSS,heightCSS);gl.uniform1f(depthLocation,maxDepth*1.01);
      gl.depthMask(true);gl.disable(gl.BLEND);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(passLocation,0);
      if(opaqueCount)gl.drawArrays(gl.TRIANGLES,0,opaqueCount);
      gl.enable(gl.BLEND);gl.depthMask(false);gl.uniform1f(passLocation,1);
      if(cursor/stride>opaqueCount)gl.drawArrays(gl.TRIANGLES,opaqueCount,cursor/stride-opaqueCount);
      gl.depthMask(true);
      if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)return fail();
      return true;
    }catch(error){return fail(error?.message||error);}
  }
}
