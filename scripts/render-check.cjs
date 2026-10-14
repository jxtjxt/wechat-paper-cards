const fs=require('fs'),path=require('path'),os=require('os');
const {pathToFileURL}=require('url');
function dependency(name){
 const roots=[process.env.NODE_PATH,path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')].filter(Boolean);
 try{return require(name)}catch{}
 for(const r of roots)try{return require(path.join(r,name))}catch{}
 throw Error(`${name} unavailable: locate a trusted installed dependency; do not auto-download.`);
}
(async()=>{
 const input=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||input);
 const files=fs.readdirSync(input).filter(n=>/^\d{2}\.html$/.test(n)).sort();
 if(!files.length)throw Error('No numbered HTML cards');
 fs.mkdirSync(out,{recursive:true});
 const {chromium}=dependency('playwright'),sharp=dependency('sharp');
 const candidates=[process.env.WECHAT_CARD_BROWSER,chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
 const executablePath=candidates.find(p=>fs.existsSync(p));
 if(!executablePath)throw Error('No cached browser found');
 const browser=await chromium.launch({executablePath,headless:true});
 const report=[];
 try{
  for(const name of files){
   const html=fs.readFileSync(path.join(input,name),'utf8');
   if(/\{\{[A-Z_]+\}\}/.test(html))throw Error(`${name}: unreplaced template placeholder`);
   if(/<(?:img|script|link)[^>]+(?:src|href)=["']https?:/i.test(html)||/@import\s+url/i.test(html))throw Error(`${name}: remote render dependency`);
   const page=await browser.newPage({viewport:{width:1080,height:1440},deviceScaleFactor:1,javaScriptEnabled:false});
   await page.route('**/*',route=>/^(?:file|data):/.test(route.request().url())?route.continue():route.abort());
   await page.goto(pathToFileURL(path.join(input,name)).href,{waitUntil:'load'});
   await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>{
    const violations=[],root=document.querySelector('.card');
    if(!root)return{violations:['Missing .card']};
    const canvas=root.getBoundingClientRect();
    const content=document.querySelector('.content');
    const active=e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
    for(const img of document.images)if(active(img)&&(!img.complete||img.naturalWidth===0))violations.push('Broken image');
    if(content)for(const e of content.children){if(!active(e))continue;const r=e.getBoundingClientRect();if(r.bottom>content.getBoundingClientRect().bottom+1)violations.push('Content overflow: '+e.textContent.slice(0,45));}
    for(const e of root.querySelectorAll('h1,p,.key-claim,.boundary,.evidence-tag,.reference,svg text')){
     if(!active(e))continue;const r=e.getBoundingClientRect();
     if(r.left<canvas.left-1||r.right>canvas.right+1||r.top<canvas.top-1||r.bottom>canvas.bottom+1)violations.push('Canvas overflow: '+e.textContent.slice(0,45));
     if(e.tagName.toLowerCase()!=='text'&&e.scrollWidth>e.clientWidth+1)violations.push('Text overflow');
     if(e.tagName.toLowerCase()==='text'){const s=e.closest('svg').getBoundingClientRect();if(r.left<s.left-1||r.right>s.right+1||r.top<s.top-1||r.bottom>s.bottom+1)violations.push('SVG label overflow: '+e.textContent);}
    }
    return{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,violations};
   });
   const png=path.join(out,name.replace('.html','.png'));
   await page.screenshot({path:png,animations:'disabled'});await page.close();
   const meta=await sharp(png).metadata();
   if(meta.width!==1080||meta.height!==1440||result.width!==1080||result.height!==1440)result.violations.push('Invalid dimensions');
   report.push({card:name,...result});
  }
 }finally{await browser.close()}
 const composite=[];
 for(let i=0;i<files.length;i++)composite.push({input:await sharp(path.join(out,files[i].replace('.html','.png'))).resize(375,500).toBuffer(),left:20+(i%2)*395,top:20+Math.floor(i/2)*520});
 await sharp({create:{width:810,height:20+Math.ceil(files.length/2)*520,channels:3,background:'#E8EFF1'}}).composite(composite).jpeg({quality:92}).toFile(path.join(out,'overview.jpg'));
 fs.writeFileSync(path.join(out,'layout-qa.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({cards:files.length,passed:report.filter(r=>!r.violations.length).length,out}));
 if(report.some(r=>r.violations.length))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
