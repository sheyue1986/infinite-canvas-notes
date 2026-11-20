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
try{
 await call('Page.enable');await call('Runtime.enable');await call('Page.addScriptToEvaluateOnNewDocument',{source:'window.prompt=()=>"工具与转线验证"'});await call('Page.navigate',{url:'http://127.0.0.1:4195/'});
 await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("新建画布")&&!b.disabled)');await ev('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("新建画布")).click()');await wait('!!window.__selectionQARef?.current');
 await ev('window.qa=window.__selectionQARef.current;qa.setActiveTool({type:"arrow"})');
 await wait('!!document.querySelector(".icn-ring-property[aria-label=终点端头]")');
 assert.ok(await ev('!document.querySelector(".icn-ring-property[aria-label=尺寸与位置]")'));
 async function choose(label,option){await ev(`document.querySelector('.icn-ring-property[aria-label="${label}"]').click()`);await ev(`[...document.querySelectorAll('.icn-ring-choices button')].find(b=>b.textContent===${JSON.stringify(option)}).click()`);await delay(90);}
 await choose('线型','虚线');await choose('终点端头','实心三角');await choose('箭头类型','折线箭头');
 assert.equal(await ev('qa.getAppState().currentItemStrokeStyle'),'dashed');assert.equal(await ev('qa.getAppState().currentItemEndArrowhead'),'triangle');
 await ev('qa.setActiveTool({type:"rectangle"})');await delay(200);await ev('qa.setActiveTool({type:"arrow"})');await delay(300);
 assert.equal(await ev('qa.getAppState().currentItemStrokeStyle'),'dashed');assert.equal(await ev('qa.getAppState().currentItemEndArrowhead'),'triangle');assert.equal(await ev('qa.getAppState().currentItemArrowType'),'elbow');
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:520,y:400,button:'left',buttons:1,clickCount:1});for(let i=1;i<=20;i++)await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:520+i*10,y:400+i*2,buttons:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:720,y:440,button:'left',buttons:0,clickCount:1});
 await wait('qa.getSceneElements().some(e=>e.type==="arrow")');
 assert.ok(await ev('qa.getSceneElements().some(e=>e.type==="arrow"&&e.endArrowhead==="triangle"&&e.strokeStyle==="dashed"&&e.elbowed)'));
 await ev(`(()=>{const c=document.createElement('canvas');c.width=256;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,256,160);ctx.strokeStyle='black';ctx.lineWidth=5;ctx.strokeRect(25,25,150,100);ctx.beginPath();ctx.moveTo(20,80);ctx.lineTo(230,80);ctx.stroke();qa.addFiles([{id:'trace-file',dataURL:c.toDataURL(),mimeType:'image/png',created:Date.now()}]);const base=qa.getSceneElements()[0];qa.setActiveTool({type:'selection'});qa.updateScene({elements:[...qa.getSceneElementsIncludingDeleted(),{...base,id:'trace-image',type:'image',x:500,y:250,width:256,height:160,angle:0,fileId:'trace-file',status:'saved',scale:[1,1],crop:null,groupIds:[],customData:{},locked:false,points:undefined}],appState:{selectedElementIds:{'trace-image':true}},captureUpdate:'IMMEDIATELY'});})()`);
 await delay(200);await call('Input.dispatchMouseEvent',{type:'mousePressed',x:620,y:330,button:'right',buttons:2,clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:620,y:330,button:'right',buttons:0,clickCount:1});
 await wait('!!document.querySelector(".icn-image-trace-command button")');
 assert.ok(await ev('(()=>{const b=document.querySelector(".icn-image-trace-command button"),r=b.getBoundingClientRect();return r.width>0&&r.top>=0&&r.bottom<innerHeight&&getComputedStyle(b).visibility==="visible"})()'),'Image tracing action must be visible without scrolling');
 const menuShot=await call('Page.captureScreenshot',{format:'png'});await writeFile(new URL('trace-menu-qa.png',import.meta.url),Buffer.from(menuShot.data,'base64'));
 await ev('document.querySelector(".icn-image-trace-command button").click()');await wait('!!document.querySelector("[aria-label=图片转线]")');await ev('document.querySelector("[aria-label=图片转线] .icn-export-save").click()');
 await wait('!!document.querySelector(".icn-trace-apply")');
 assert.ok(await ev('!!document.querySelector(".icn-trace-preview svg")'));
 assert.ok(await ev('qa.getSceneElements().some(e=>e.id==="trace-image")'),'Preview must not replace original');
 await ev('document.querySelector(".icn-trace-apply").click()');
 await wait('qa.getSceneElements().some(e=>e.customData?.icnImageTrace)');
 assert.ok(await ev('!qa.getSceneElements().some(e=>e.id==="trace-image")'));
 assert.ok(await ev('qa.getSceneElements().filter(e=>e.customData?.icnImageTrace).every(e=>e.type==="line"&&e.points.length>=2)'));
 await choose('线条风格','草绘');assert.ok(await ev('qa.getSceneElements().filter(e=>e.customData?.icnImageTrace).every(e=>e.roughness===2)'));
 await choose('线型','点线');assert.ok(await ev('qa.getSceneElements().filter(e=>e.customData?.icnImageTrace).every(e=>e.strokeStyle==="dotted")'));
 const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(new URL('tools-trace-qa.png',import.meta.url),Buffer.from(shot.data,'base64'));
 // Existing, already saved vectors can be cleaned without their source bitmap.
 await ev(`(()=>{const base=qa.getSceneElements().find(e=>e.customData?.icnImageTrace),es=Array.from({length:20},(_,i)=>({...base,id:'fragment-'+i,x:450+i*8,y:520,width:7,height:0,angle:0,points:[[0,0],[3,0],[7,0]],groupIds:['old-trace'],version:1,customData:{...base.customData,icnImageTrace:{sourceId:'missing-old-original'}}}));window.fragmentIds=es.map(e=>e.id);qa.updateScene({elements:[...qa.getSceneElementsIncludingDeleted(),...es],appState:{selectedElementIds:Object.fromEntries(es.map(e=>[e.id,true])),selectedGroupIds:{'old-trace':true}},captureUpdate:'IMMEDIATELY'});})()`);
 await delay(200);await call('Input.dispatchMouseEvent',{type:'mousePressed',x:520,y:520,button:'right',buttons:2,clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:520,y:520,button:'right',buttons:0,clickCount:1});
 await wait('!!document.querySelector(".icn-image-trace-command button")');
 assert.ok(await ev('document.querySelector(".icn-image-trace-command").textContent.includes("合并并简化")'));
 await ev('document.querySelector(".icn-image-trace-command button").click()');await wait('!!document.querySelector("[aria-label=图片转线]")');await ev('document.querySelector("[aria-label=图片转线] .icn-export-save").click()');await wait('!!document.querySelector(".icn-trace-apply")');
 assert.ok(await ev('document.querySelector(".icn-trace-preview [role=status]").textContent.includes("1 条连续线")'));
 await ev('document.querySelector(".icn-trace-apply").click()');await wait('!document.querySelector("[aria-label=图片转线]")');
 assert.ok(await ev('!qa.getSceneElements().some(e=>fragmentIds.includes(e.id))'));
 assert.ok(await ev('qa.getSceneElements().some(e=>e.customData?.icnImageTrace?.sourceId==="missing-old-original"&&e.points.length===2&&e.strokeStyle==="dotted")'));
 console.log('Existing fragmented vectors merge to one 2-node line, preserving style, without original image.');
 await delay(800);await call('Page.reload',{ignoreCache:true});await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("工具与转线验证"))');await ev('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("工具与转线验证")).click()');await wait('!!window.__selectionQARef?.current');await ev('window.qa=window.__selectionQARef.current;qa.setActiveTool({type:"arrow"})');await delay(300);
 assert.equal(await ev('qa.getAppState().currentItemEndArrowhead'),'triangle');assert.equal(await ev('qa.getAppState().currentItemArrowType'),'elbow');assert.ok(await ev('qa.getSceneElements().some(e=>e.customData?.icnImageTrace&&e.strokeStyle==="dotted")'));assert.deepEqual(errors,[]);
 console.log('Initial tool wheel, remembered arrow type/style/heads, actual arrow creation, image context command, worker tracing, editable vector styles and reload persistence passed.');
}finally{ws.close();}
