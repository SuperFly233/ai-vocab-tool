const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

function createServer(){
  const root=path.resolve(__dirname,'..');
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
  return http.createServer((req,res)=>{
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}
    catch{res.writeHead(400).end();return}
    const route=pathname==='/'||/^\/(history|favorites|settings|about|account)(\/.*)?$/.test(pathname)?'/index.html':pathname;
    const file=path.resolve(root,'.'+route);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end();return}
      res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
      res.end(data);
    });
  });
}
module.exports={createServer};
