const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.join(__dirname,'../dist');
const types={js:'text/javascript',css:'text/css',html:'text/html; charset=utf-8',json:'application/json',webp:'image/webp',svg:'image/svg+xml',jpg:'image/jpeg',png:'image/png'};
http.createServer((req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!/^(art\/(?:[\w-]+\/)*)?[\w-][\w.-]*$/.test(file)){res.writeHead(404).end();return;}
  fs.readFile(path.join(root,file),(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]||'application/octet-stream'}).end(data);
  });
}).listen(Number(process.env.QA_HTTP_PORT||8088),'127.0.0.1');
