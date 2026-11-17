'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname,PORT=Number(process.env.ZIPING_PORT||4317);
let passages;
function getPassages(){return passages??=fs.readFileSync(path.join(ROOT,'private','passages.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg'};
function openBrowser(url){
  const {spawn}=require('node:child_process');
  if(process.platform==='win32')spawn('cmd.exe',['/d','/s','/c',`start "" "${url}"`],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});
  else if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'}).on('error',()=>{});
}
const send=(res,status,data,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(typeof data==='string'?data:JSON.stringify(data));};
const server=http.createServer((req,res)=>{
  if(!new RegExp(`^(127\\.0\\.0\\.1|localhost)(:${PORT})?$`,'i').test(req.headers.host||''))return send(res,403,{error:'本服务只接受本机地址。'});
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'只支持读取。'});
  let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{return send(res,400,{error:'无效地址。'});}
  if(url.pathname==='/api/health')return send(res,200,{app:'ziping-study',version:'0.3.0',localOnly:true,tz:process.versions.tz,icu:process.versions.icu,node:process.version});
  if(url.pathname==='/api/search'){
    const q=(url.searchParams.get('q')||'').trim(),book=url.searchParams.get('book')||'',offset=Math.max(0,Math.min(15000,Number(url.searchParams.get('offset'))||0));
    if(q.length>80||!/^$|^BK0[1-7]$/.test(book))return send(res,400,{error:'检索参数无效。'});
    if(!q&&!book)return send(res,200,{total:0,results:[]});
    if(!fs.existsSync(path.join(ROOT,'private','passages.jsonl')))return send(res,503,{error:'公开仓库未附全文语料。请使用已配置本机书库的版本；排盘、详批、教学和实训仍可用。'});
    const matches=getPassages().filter(p=>(!book||p.source_id===book)&&(!q||p.text.includes(q)||p.chapter.includes(q)));
    return send(res,200,{total:matches.length,offset,results:matches.slice(offset,offset+15),review_status:'网络整理本，待校勘；仅供本地研究'});
  }
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(res,400,{error:'无效编码。'});}
  if(pathname==='/'||pathname==='/index.html')pathname='/index.html';
  const allowed=pathname==='/index.html'||['/app.js','/content.js','/academy.js','/academy-advanced.js','/reading.js','/engine.js','/styles.css'].includes(pathname)||/^\/books\/BK0[1-7]\.js$/.test(pathname)||/^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname)||/^\/vendor\/(lunar.js|lunar.LICENSE)$/.test(pathname);
  if(!allowed)return send(res,404,{error:'未提供此文件。'});
  const filename=path.join(ROOT,pathname);
  fs.readFile(filename,(err,data)=>{
    if(err)return send(res,404,{error:'文件不存在。'});
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
    res.end(req.method==='HEAD'?undefined:data);
  });
});
server.on('error',async e=>{
  if(e.code==='EADDRINUSE'){
    try{const health=await fetch(`http://127.0.0.1:${PORT}/api/health`,{signal:AbortSignal.timeout(2000)}).then(r=>r.json());if(health.app==='ziping-study'){console.log('子平研习已经运行，正在打开现有页面。');if(process.argv.includes('--open'))openBrowser(`http://127.0.0.1:${PORT}`);return;}}catch{}
    console.error(`端口${PORT}正在被其他程序使用，请关闭冲突服务或更换ZIPING_PORT。`);
  }else console.error(e.message);
  process.exitCode=1;
});
server.listen(PORT,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${PORT}`;
  console.log(`子平研习已在本机启动：${url}\n关闭此窗口将停止本机服务；直接打开index.html仍可离线阅读。\n出生资料在浏览器本机计算，本服务不记录出生输入。`);
  if(process.argv.includes('--open'))openBrowser(url);
});
