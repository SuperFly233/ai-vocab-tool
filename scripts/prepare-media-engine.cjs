const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir='vendor/media-engine';fs.mkdirSync(dir,{recursive:true});
for(const name of fs.readdirSync('node_modules/@ffmpeg/ffmpeg/dist/esm').filter(n=>n.endsWith('.js')))fs.copyFileSync(path.join('node_modules/@ffmpeg/ffmpeg/dist/esm',name),path.join(dir,name));
const assets={};for(const name of ['ffmpeg-core.js','ffmpeg-core.wasm']){const bytes=fs.readFileSync(path.join('node_modules/@ffmpeg/core/dist/esm',name));assets[name]={url:'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/'+name,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({wrapper:'0.12.15',core:'0.12.10',singleThread:true,assets},null,2)+'\n');console.log('Pinned local wrapper and verified core manifest prepared.');
