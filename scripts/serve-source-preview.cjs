const server=require('./browser-test-server.cjs').createServer(),handle=server.listeners('request')[0];
server.removeAllListeners('request');
server.on('request',(request,response)=>{
  if(request.url.startsWith('/api/')){response.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});response.end(JSON.stringify({error:'本机仅提供界面预览，外部服务未启用；不进行云同步或模型调用。'}));return}
  handle(request,response);
});
server.listen(Number(process.env.PORT||8898),'127.0.0.1',()=>console.log('Static-only source candidate: http://127.0.0.1:'+server.address().port));
