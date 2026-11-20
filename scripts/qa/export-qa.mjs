import {fileURLToPath} from "node:url";
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
 await call('Page.enable');await call('Runtime.enable');await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:fileURLToPath(new URL('./downloads/',import.meta.url))});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:'window.prompt=()=>"导出验证";window.pdfRequests=[];new PerformanceObserver(list=>window.pdfRequests.push(...list.getEntries().map(e=>e.name))).observe({type:"resource",buffered:true});'});
 await call('Page.navigate',{url:'http://127.0.0.1:4195/'});
 await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("新建画布")&&!b.disabled)');
 await ev('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("新建画布")).click()');await wait('!!window.__selectionQARef?.current');
 await ev(`(()=>{const api=window.__selectionQARef.current;window.qa=api;const shape={id:'red',type:'rectangle',x:500,y:250,width:120,height:90,angle:0,strokeColor:'#e03131',backgroundColor:'#e03131',fillStyle:'solid',strokeWidth:2,strokeStyle:'solid',roughness:0,opacity:100,groupIds:[],frameId:null,roundness:null,seed:123,version:1,versionNonce:1,isDeleted:false,boundElements:[],updated:Date.now(),link:null,locked:false};window.baseShape=shape;api.updateScene({elements:[shape,{...shape,id:'blue',x:900,backgroundColor:'#1971c2'}],appState:{selectedElementIds:{red:true}},captureUpdate:'IMMEDIATELY'});})()`);
 await delay(300);
 assert.ok(await ev('!pdfRequests.some(url=>/pdfjs|pdf-workspace|export-psd|pdf-lib/.test(url))'));
 await ev('window.dispatchEvent(new Event("icn:export"))');await wait('!!document.querySelector(".icn-export-dialog")');
 assert.equal(await ev('document.querySelector("[aria-label=导出范围]").value'),'selection');
 const set=async(label,value)=>ev(`(()=>{const e=document.querySelector(${JSON.stringify('[aria-label="'+label+'"]')});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 for(const fmt of ['png','jpg','svg','psd','dxf','pdf']){
  if(!await ev('!!document.querySelector(".icn-export-dialog")'))await ev('window.dispatchEvent(new Event("icn:export"))');
  await set('导出格式',fmt);await ev('document.querySelector(".icn-export-save").click()');
  await wait('!document.querySelector(".icn-export-dialog")||!!document.querySelector(".icn-export-dialog [role=alert]")');
  assert.equal(await ev('document.querySelector(".icn-export-dialog [role=alert]")?.textContent||""'),'');
 }
 // A large existing scene must not trigger application scene replacements mid-stroke.
 await ev(`(()=>{qa.updateScene({elements:Array.from({length:700},(_,i)=>({...baseShape,id:'load-'+i,x:1500+i%35*20,y:100+Math.floor(i/35)*20,width:10,height:10,customData:{}})),appState:{selectedElementIds:{},scrollX:0,scrollY:0},captureUpdate:'IMMEDIATELY'});qa.setActiveTool({type:'freedraw'});window.appWrites=0;const update=qa.updateScene;qa.updateScene=(...args)=>{appWrites++;return update(...args);};window.startIds=new Set(qa.getSceneElements().map(e=>e.id));})()`);
 await delay(200);await ev('window.appWrites=0');
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:500,y:450,button:'left',buttons:1,clickCount:1});
 const started=Date.now();for(let i=1;i<=100;i++){await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:500+i*3,y:450+Math.sin(i/10)*40,buttons:1});if(i===50)assert.ok(await ev('qa.getAppState().newElement?.points.length>=35 && qa.getAppState().newElement?.width>100'),'Live pointer preview must follow before release');}
 const midWrites=await ev('window.appWrites');
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:800,y:450,button:'left',buttons:0,clickCount:1});
 await wait('qa.getSceneElements().some(e=>!startIds.has(e.id)&&e.type==="freedraw"&&e.points.length>=80&&e.width>250)');
 console.log('700-object scene, 100 real pointer samples:',Date.now()-started,'ms; application updateScene calls while dragging:',midWrites);
 assert.equal(midWrites,0);
 assert.deepEqual(errors,[]);
 console.log('Lazy loading, selected-object PNG/JPG/SVG/PSD/DXF/PDF exports and real large-scene drawing passed.');
 const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(new URL('export-qa.png',import.meta.url),Buffer.from(shot.data,'base64'));
} finally {ws.close();}
