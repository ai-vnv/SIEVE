/** Deterministic 24-second presentation montage. It is not a fleet-model trace. */
import {chromium} from 'playwright';
import fs from 'node:fs';
import {overlapPairs} from '../simulator/traffic.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const duration=24,fps=20,width=960,height=540,cache='.media-cache/frames';
fs.mkdirSync(cache,{recursive:true});fs.mkdirSync('media',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('crash',()=>errors.push('Page crashed'));
await page.goto(`${process.env.SIEVE_BASE_URL||'http://127.0.0.1:8766'}/simulator/?paused&clean&family=nominal&policy=integrated`);await page.waitForFunction(()=>window.sieve?.ready);
const sourceHashes=Object.fromEntries(['simulator/app.mjs','simulator/core.mjs','simulator/traffic.mjs','simulator/style.css'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const stages=[];let checkedFrames=0;
for(let frame=0;frame<duration*fps;frame++){
 const state=await page.evaluate(t=>window.sieve.cinematic(t),frame/fps);
 const pairs=overlapPairs(state.actors,.5);if(pairs.length)throw Error(`Interpenetration at frame ${frame}: ${JSON.stringify(pairs)}`);checkedFrames++;
 if(frame%fps===0){console.log(`Rendered ${frame/fps}/${duration}s (${state.phase})`);stages.push(state);}
 await page.screenshot({path:path.join(cache,`${String(frame).padStart(5,'0')}.jpg`),type:'jpeg',quality:88});
}
await browser.close();if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync('media/render-manifest.json',JSON.stringify({sourceHashes,width,height,fps,duration,visualSeed:2027,evidenceKind:'synthetic illustrative animation',numericalTrace:false,stages,footprintCheck:{checkedFrames,overlaps:0,marginPerActorMetres:.5},browserErrors:errors},null,2)+'\n');
const result=spawnSync('python3',['scripts/encode_media.py'],{stdio:'inherit'});if(result.status)process.exit(result.status);
