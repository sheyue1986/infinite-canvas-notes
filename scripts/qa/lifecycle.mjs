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
 await call('Page.enable');await call('Page.navigate',{url:'http://127.0.0.1:4195/'});
 await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("新建画布")&&!b.disabled)');
 const result=await ev(`(async()=>{
  const effects=[];let reads=0,changed,unsubscribed=false;
  const React={createElement:()=>null,useEffect:fn=>effects.push(fn),useRef:current=>({current}),useState:value=>[value,()=>{}]};
  const api={getAppState:()=>({zoom:{value:1},selectedElementIds:{}}),getSceneElements:()=>{reads++;return []},onChange:fn=>{changed=fn;return()=>{unsubscribed=true}}};
  const module=await import('/assets/advanced-editing.js');
  module.createAdvancedEditing(React,()=>{},()=>{},{},()=>{})({api,kit:{},layers:{}});
  reads=0;const stop=effects[1]();
  await new Promise(r=>setTimeout(r,1800));const idleReads=reads;
  changed();await new Promise(r=>setTimeout(r,600));const afterChange=reads;stop();
  return {idleReads,afterChange,unsubscribed};
 })()`);
 assert.equal(result.idleReads,1);assert.equal(result.afterChange,2);assert.equal(result.unsubscribed,true);
 console.log('Image preprocessing skips idle scans, resumes after change and unsubscribes on cleanup.',result);
 for(const file of ['map-setup-BCD1m3fp.js','ModelWorkspace-hxdeJkNj.js','presentation-export.js']){
  await ev(`import('/assets/${file}').then(()=>true)`);
 }
 console.log('Map, 3D workspace and presentation export modules loaded.');
}finally{ws.close();}
