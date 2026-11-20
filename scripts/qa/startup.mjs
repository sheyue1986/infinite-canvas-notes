import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
let page;
for (let i=0;i<40;i++) {
  try { page=(await (await fetch("http://127.0.0.1:9259/json/list")).json()).find(x=>x.type==="page"); if(page) break; } catch {}
  await delay(250);
}
assert.ok(page);
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
const pending=new Map(),errors=[];
let seq=0;
ws.onmessage=({data})=>{
  const v=JSON.parse(data);
  pending.get(v.id)?.(v);
  if(v.method==="Runtime.exceptionThrown")errors.push(v.params.exceptionDetails.exception?.description);
};
async function call(method,params={}) {
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error(method+" timeout")),10000);
    pending.set(id,v=>{clearTimeout(timer);pending.delete(id);v.error?reject(Error(v.error.message)):resolve(v.result)});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function ev(expression) {
  const v=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(v.exceptionDetails)throw Error(v.exceptionDetails.exception?.description);
  return v.result.value;
}
async function wait(expression) {for(let i=0;i<60;i++){if(await ev(expression))return;await delay(150)}console.log(errors,await ev("({text:document.body.innerText.slice(0,1800),classes:[...document.querySelectorAll('main, [class*=shape-actions]')].map(x=>x.className)})"));const shot=await call("Page.captureScreenshot",{format:"png"});await writeFile(new URL("selection-qa.png",import.meta.url),Buffer.from(shot.data,"base64"));throw Error(expression);}
try {
 const runs=[];
 await call('Page.enable');
 for(let i=0;i<5;i++){
 await call('Page.navigate',{url:'http://127.0.0.1:4195/'});
 await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("新建画布")&&!b.disabled)');
 runs.push(await ev('({readyMs:performance.now(),heap:performance.memory.usedJSHeapSize,bytes:performance.getEntriesByType("resource").reduce((sum,r)=>sum+r.encodedBodySize,0)})'));
 }
 console.log(JSON.stringify(runs));
 await writeFile(new URL('startup-'+process.argv[2]+'.json',import.meta.url),JSON.stringify(runs,null,2));
}finally{ws.close();}
