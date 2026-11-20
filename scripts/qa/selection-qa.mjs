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
  await call("Page.enable");await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument",{source:'window.prompt=()=>"属性验证";'});
  await call("Page.navigate",{url:"http://127.0.0.1:4195/"});
  await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("新建画布") && !b.disabled)');
  await ev('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("新建画布")).click()');
  await wait('!!window.__selectionQARef?.current');
  await ev("window.__selectionQA=window.__selectionQARef.current");
  await ev(`(async()=>{
    const module=await import("/assets/index-icn-selection-r15.js");
    const api=window.__selectionQA;
    const seed=api.getSceneElements()[0];
    const shape={id:"qa-rectangle",type:"rectangle",x:500,y:250,width:160,height:100,angle:0,
      strokeColor:"#1b1b1f",backgroundColor:"transparent",fillStyle:"hachure",strokeWidth:2,strokeStyle:"solid",
      roughness:1,opacity:100,groupIds:[],frameId:null,roundness:null,seed:1234,version:1,versionNonce:1,
      isDeleted:false,boundElements:[],updated:Date.now(),link:null,locked:false};
    api.updateScene({elements:[shape],appState:{selectedElementIds:{"qa-rectangle":true}},captureUpdate:"IMMEDIATELY"});
  })()`);
  await wait('!!document.querySelector(".icn-object-ring")');
  assert.equal(await ev('getComputedStyle(document.querySelector(".selected-shape-actions")).display'),"none");
  assert.ok(await ev('!!document.querySelector(".icn-ring-property[aria-label=边角]")'));
  assert.ok(await ev('!document.querySelector(".icn-ring-property[aria-label=箭头类型]")'));
  await ev('document.querySelector(".icn-ring-property[aria-label=线型]").click()');
  await ev('[...document.querySelectorAll(".icn-ring-choices button")].find(b=>b.textContent==="虚线").click()');
  assert.equal(await ev('window.__selectionQA.getSceneElements().find(e=>e.id==="qa-rectangle").strokeStyle'),"dashed");
  await ev(`(()=>{
    const api=window.__selectionQA, original=api.getSceneElements()[0];
    const arrow={...original,id:"qa-arrow",type:"arrow",x:450,y:450,width:220,height:0,
      points:[[0,0],[220,0]],startBinding:null,endBinding:null,startArrowhead:null,endArrowhead:"arrow",
      elbowed:false,roundness:null,boundElements:[]};
    api.updateScene({elements:[...api.getSceneElements(),arrow],appState:{selectedElementIds:{"qa-arrow":true}}});
  })()`);
  await delay(200);
  assert.ok(await ev('!!document.querySelector(".icn-ring-property[aria-label=箭头类型]")'));
  assert.ok(await ev('!document.querySelector(".icn-ring-property[aria-label=填充图案]")'));
  await ev('document.querySelector(".icn-ring-property[aria-label=箭头类型]").click()');
  await ev('[...document.querySelectorAll(".icn-ring-choices button")].find(b=>b.textContent==="曲线箭头").click()');
  assert.ok(await ev('!!window.__selectionQA.getSceneElements().find(e=>e.id==="qa-arrow").roundness'));
  await ev('[...document.querySelectorAll(".icn-ring-choices button")].find(b=>b.textContent==="折线箭头").click()');
  assert.ok(await ev('window.__selectionQA.getSceneElements().find(e=>e.id==="qa-arrow").elbowed'));
  await ev('[...document.querySelectorAll(".icn-ring-choices button")].find(b=>b.textContent==="直线箭头").click()');
  await ev('window.__selectionQA.setActiveTool({type:"text"})');
  const pt=await ev('(()=>{const s=window.__selectionQA.getAppState();return [(450+s.scrollX)*s.zoom.value+s.offsetLeft,(450+s.scrollY)*s.zoom.value+s.offsetTop]})()');
  await call("Input.dispatchMouseEvent",{type:"mouseMoved",x:pt[0],y:pt[1]});
  await wait('!!document.querySelector(".icn-endpoint-hint")');
  await call("Input.dispatchMouseEvent",{type:"mousePressed",x:pt[0],y:pt[1],button:"left",buttons:1,clickCount:1});
  await call("Input.dispatchMouseEvent",{type:"mouseReleased",x:pt[0],y:pt[1],button:"left",buttons:0,clickCount:1});
  await wait('!!document.querySelector(".icn-endpoint-text")');
  await call("Input.insertText",{text:"端点说明"});
  await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  await wait('window.__selectionQA.getSceneElements().some(e=>e.text==="端点说明")');
  const before=await ev('window.__selectionQA.getSceneElements().find(e=>e.text==="端点说明")?.x');
  assert.ok(Number.isFinite(before));
  await ev(`(()=>{const api=window.__selectionQA;api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(e=>e.id==="qa-arrow"?{...e,x:e.x+80,version:e.version+1}:e),captureUpdate:"IMMEDIATELY"});})()`);
  await delay(350);
  assert.equal(await ev('window.__selectionQA.getSceneElements().find(e=>e.text==="端点说明").x'),before+80);
  await ev(`(()=>{const api=window.__selectionQA;const label=api.getSceneElements().find(e=>e.text==="端点说明");api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(e=>e.id===label.id?{...e,y:e.y+30,version:e.version+1}:e),captureUpdate:"IMMEDIATELY"});})()`);
  await delay(250);
  assert.equal(await ev('(()=>{const a=window.__selectionQA.getSceneElements().find(e=>e.id==="qa-arrow");return a.y+a.points[0][1]})()'),480);
  assert.ok(await ev('!!document.querySelector(".icn-ring-property[aria-label=字体]")'));
  assert.ok(await ev('!document.querySelector(".icn-ring-property[aria-label=线型]")'));
  await ev(`(()=>{
    const api=window.__selectionQA, canvas=document.createElement("canvas");canvas.width=8;canvas.height=8;
    api.addFiles([{id:"qa-image-file",dataURL:canvas.toDataURL(),mimeType:"image/png",created:Date.now()}]);
    const e=api.getSceneElements().find(e=>e.id==="qa-rectangle");
    api.updateScene({elements:[...api.getSceneElementsIncludingDeleted(),{...e,id:"qa-image",type:"image",fileId:"qa-image-file",status:"saved",scale:[1,1],crop:null,x:900,y:300,width:80,height:80}],appState:{selectedElementIds:{"qa-image":true}}});
  })()`);
  await delay(200);
  assert.deepEqual(await ev('[...document.querySelectorAll(".icn-ring-property")].map(b=>b.getAttribute("aria-label"))'),["不透明度","尺寸与位置","裁剪图片"]);
  await ev('window.__selectionQA.updateScene({appState:{selectedElementIds:{"qa-rectangle":true}}})');
  await wait('!!document.querySelector(".icn-selection-popup .icn-pills .icn-layer-menu")');
  assert.equal(await ev('document.querySelectorAll(".icn-object-layer").length'),0);
  await ev('document.querySelector(".icn-layer-menu summary").click()');
  await ev('document.querySelector(".icn-layer-dropdown button").click()');
  await delay(250);
  assert.ok(await ev('!!window.__selectionQA.getSceneElements().find(e=>e.id==="qa-rectangle").customData?.infiniteLayer'));
  await ev('document.querySelector(".icn-layer-menu").open=false');
  await ev('document.querySelector(".icn-ring-property[aria-label=线条风格]").click()');
  assert.ok(await ev('[...document.querySelectorAll(".icn-ring-choices button")].every(b=>b.querySelector("svg") && b.querySelector("span")?.textContent)'));
  await ev(`(()=>{
    const api=window.__selectionQA, source=api.getSceneElements().find(e=>e.id==="qa-rectangle");
    const shapes=[{...source,id:"union-a",x:500,y:250,width:160,height:100,roundness:null,angle:0,backgroundColor:"#b2f2bb",customData:{...source.customData,icnAreaFill:{x:.5,y:.5}}},
      {...source,id:"union-b",x:580,y:300,width:160,height:100,roundness:null,angle:0,backgroundColor:"#b2f2bb",customData:{...source.customData,icnAreaFill:{x:.5,y:.5}}}];
    api.setActiveTool({type:"selection"});
    api.updateScene({elements:[...api.getSceneElementsIncludingDeleted().map(e=>e.id===source.id?{...e,x:1000,version:e.version+1}:e),...shapes],appState:{selectedElementIds:{"union-a":true,"union-b":true}},captureUpdate:"IMMEDIATELY"});
  })()`);
  await wait('!!document.querySelector(".icn-boolean-merge")');
  const unionPoint=await ev('(()=>{const s=window.__selectionQA.getAppState();return [(520+s.scrollX)*s.zoom.value+s.offsetLeft,(270+s.scrollY)*s.zoom.value+s.offsetTop]})()');
  await call("Input.dispatchMouseEvent",{type:"mousePressed",x:unionPoint[0],y:unionPoint[1],button:"right",buttons:2,clickCount:1});
  await call("Input.dispatchMouseEvent",{type:"mouseReleased",x:unionPoint[0],y:unionPoint[1],button:"right",buttons:0,clickCount:1});
  await wait('!!document.querySelector(".icn-boolean-context button")');
  assert.ok(await ev('document.querySelector(".icn-boolean-context").textContent.includes("合并填充并计算面积")'));
  await ev('document.querySelector(".icn-boolean-context button").click()');
  await wait('window.__selectionQA.getSceneElements().some(e=>e.customData?.icnBoolean)');
  assert.equal(await ev('(async()=>{const {measureBucketElement}=await import("/assets/bucket-fill-union.js");return measureBucketElement(window.__selectionQA.getSceneElements().find(e=>e.customData?.icnBoolean)).value})()'),28000);
  assert.equal(await ev('window.__selectionQA.getSceneElements().filter(e=>["union-a","union-b"].includes(e.id)).length'),0);
  await call("Input.dispatchKeyEvent",{type:"keyDown",key:"z",code:"KeyZ",modifiers:2,windowsVirtualKeyCode:90});
  await call("Input.dispatchKeyEvent",{type:"keyUp",key:"z",code:"KeyZ",modifiers:2,windowsVirtualKeyCode:90});
  await wait('window.__selectionQA.getSceneElements().filter(e=>["union-a","union-b"].includes(e.id)).length===2');
  await ev('window.__selectionQA.updateScene({appState:{selectedElementIds:{"union-a":true,"union-b":true}}})');
  await wait('!!document.querySelector(".icn-boolean-merge")');
  await ev('document.querySelector(".icn-boolean-merge").click()');
  await wait('window.__selectionQA.getSceneElements().some(e=>e.customData?.icnBoolean)');
  await ev('window.__selectionQA.updateScene({appState:{selectedElementIds:{},scrollX:50000,scrollY:50000}})');
  await wait('!!document.querySelector(".scroll-back-to-content")');
  assert.ok(await ev('(()=>{const b=document.querySelector(".scroll-back-to-content"),r=b.getBoundingClientRect(),s=getComputedStyle(b);return r.width>0 && r.height>0 && s.visibility==="visible" && Number(s.zIndex)>0})()'));
  await ev('document.querySelector(".scroll-back-to-content").click()');
  await wait('!window.__selectionQA.getAppState().scrolledOutside');
  console.log("Boolean toolbar, native context menu, union area, undo, native scroll-to-content and icon labels passed.");
  const snapshot=await call("Page.captureScreenshot",{format:"png"});
  await writeFile(new URL("selection-qa.png",import.meta.url),Buffer.from(snapshot.data,"base64"));
  assert.deepEqual(errors,[]);
  await delay(700);
  await call("Page.reload",{ignoreCache:true});
  await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("属性验证"))');
  await ev('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("属性验证")).click()');
  await wait('!!window.__selectionQARef?.current');
  assert.ok(await ev('window.__selectionQARef.current.getSceneElements().some(e=>e.text==="端点说明" && e.customData?.icnArrowEndpoint?.arrowId==="qa-arrow")'));
  assert.ok(await ev('window.__selectionQARef.current.getSceneElements().some(e=>e.customData?.icnBoolean)'));
  await ev(`(()=>{
    const api=window.__selectionQARef.current;
    window.__selectionQA=api;
    const base=api.getSceneElements().find(e=>e.type==="rectangle");
    const rectangles=[[500,250,200,40],[500,410,200,40],[500,250,40,200],[660,250,40,200],[800,300,100,100]];
    const shapes=rectangles.map(([x,y,width,height],i)=>({...base,id:"hole-"+i,x,y,width,height,angle:0,customData:{icnAreaFill:{x:.5,y:.5}},backgroundColor:"#e03131",fillStyle:"solid",strokeStyle:"solid",roundness:null,roughness:0}));
    api.updateScene({elements:shapes,appState:{scrollX:0,scrollY:0,selectedElementIds:Object.fromEntries(shapes.map(e=>[e.id,true]))},captureUpdate:"IMMEDIATELY"});
  })()`);
  await wait('!!document.querySelector(".icn-boolean-merge")');
  await ev('document.querySelector(".icn-boolean-merge").click()');
  await wait('window.__selectionQA.getSceneElements().length===1');
  await ev('window.__selectionQA.updateScene({appState:{selectedElementIds:{}}})');
  await delay(350);
  const compound=await ev(`(()=>{
    const api=window.__selectionQA, s=api.getAppState(),e=api.getSceneElements()[0],c=document.querySelector('.excalidraw canvas');
    const ctx=c.getContext('2d');
    const pixel=(x,y)=>[...ctx.getImageData(Math.round((x+s.scrollX)*s.zoom.value*c.width/s.width),Math.round((y+s.scrollY)*s.zoom.value*c.height/s.height),1,1).data];
    return {polygons:e.customData.icnBoolean.polygons.map(p=>p.length),outer:pixel(600,270),hole:pixel(600,350),island:pixel(850,350),gap:pixel(750,330),canvases:[...document.querySelectorAll('.excalidraw canvas')].map(c=>({class:c.className,width:c.width,height:c.height,style:c.getAttribute('style')})),state:{zoom:s.zoom,width:s.width,height:s.height,scrollX:s.scrollX,scrollY:s.scrollY}};
  })()`);
  const geometryShot=await call("Page.captureScreenshot",{format:"png"});
  await writeFile(new URL("boolean-qa.png",import.meta.url),Buffer.from(geometryShot.data,"base64"));
  assert.deepEqual(compound.polygons,[2,1]);
  assert.ok(compound.outer[0]>180 && compound.outer[1]<100,JSON.stringify(compound));
  assert.deepEqual(compound.hole,compound.gap);
  assert.ok(compound.island[0]>180 && compound.island[1]<100);
  await ev('window.__selectionQA.updateScene({appState:{selectedElementIds:Object.fromEntries(window.__selectionQA.getSceneElements().map(e=>[e.id,true]))}})');
  await wait('!!document.querySelector(".icn-ring-property[aria-label=线条风格]")');
  await ev('document.querySelector(".icn-ring-property[aria-label=线条风格]").click()');
  const optionsShot=await call("Page.captureScreenshot",{format:"png"});
  await writeFile(new URL("property-options-qa.png",import.meta.url),Buffer.from(optionsShot.data,"base64"));
  assert.deepEqual(errors,[]);
  console.log("Compound fill renders actual holes and disconnected islands without bridge edges.");
  console.log("Context-specific wheel controls, native arrow routing, inline layer dropdown, endpoint labels and persistence passed.");
}finally{ws.close();}
