import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist');
for (const file of ['app.js','canvas-renderer.js','view-beat.js','view-renderer.js','eye-atlas.js','volume-raster.js','pose-3d.js','head-geometry.js','reference-fit.js','body-geometry.js','fin-geometry.js','spatial-painter.js','spine.js','silhouette.js','motion.js','scroll.js','fish-bounds.js','scripts/serve.mjs']) execFileSync(process.execPath,['--check',resolve(root,file)],{stdio:'inherit'});
const html = await readFile(resolve(root,'index.html'),'utf8');
for (const path of ['style.css','app.js','canvas-renderer.js','spine.js','silhouette.js','motion.js','scroll.js','fish-bounds.js','assets/koi.webp','ARTWORK-PROMPT.md']) {
  await readFile(resolve(root,path));
}
if (!html.includes('id="pause"') || !html.includes('id="fish"')) throw new Error('Required experience controls are missing');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for (const file of ['index.html','style.css','app.js','canvas-renderer.js','view-beat.js','view-renderer.js','eye-atlas.js','volume-raster.js','pose-3d.js','head-geometry.js','reference-fit.js','body-geometry.js','fin-geometry.js','spatial-painter.js','spine.js','silhouette.js','motion.js','scroll.js','fish-bounds.js','ARTWORK-PROMPT.md','VIEW-PROMPTS.md','assets']) await cp(resolve(root,file),resolve(out,file),{recursive:true});
await writeFile(resolve(out,'build-info.json'),JSON.stringify({name:'koi-flow-motion-study',builtAt:new Date().toISOString(),dependencies:0},null,2)+'\n');
console.log('Built Koi Flow into dist/ — static files, no dependencies or external services.');
