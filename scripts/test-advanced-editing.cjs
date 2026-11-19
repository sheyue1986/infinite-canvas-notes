const {chromium}=require('../node_modules/.brush-test/node_modules/playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const server=await(await import('vite')).preview({preview:{host:'127.0.0.1',port:4197,strictPort:true}});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
 page.on('dialog',dialog=>dialog.accept('Advanced editing test'));
 await page.route('**/assets/advanced-editing.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('published-site/assets/advanced-editing.js','utf8').replace('const current=useRef({kit,layers});','window.testApi=api;window.testKit=kit;window.testConvert=convert;const current=useRef({kit,layers});')}));
 await page.goto('http://127.0.0.1:4197');await page.getByRole('button',{name:/新建画布/}).click();
 await page.waitForTimeout(1500);console.log((await page.locator('body').innerText()).slice(0,1800));await page.screenshot({path:'node_modules/.brush-test/advanced-debug.png'});
 await page.waitForFunction(()=>window.testApi&&window.testKit);console.log('ready');
 await page.evaluate(()=>window.testKit.activateById('select'));
 for(const [key,id] of [['b','pen'],['b','fixed'],['b','water'],['b','pen'],['e','eraser'],['e','slice'],['e','softErase'],['e','eraser']]){
   await page.keyboard.press(key);await page.waitForFunction(id=>window.testKit.active?.id===id,id);console.log('key',key,id);
 }
 const helper=await page.evaluate(async()=>{const m=await import('/assets/advanced-editing.js');return {split:m.splitStroke({x:0,y:0,width:100,height:0,points:[[0,0],[100,0]]},[50,-20],[50,20],5),hit:m.imageHit({x:0,y:0,width:100,height:100,customData:{icnCutout:{w:2,h:2,rows:['10','01']}}},75,25)};});
 assert.equal(helper.split.length,2);assert.equal(helper.hit,false);
 // Create a real brush stroke and cut it through the middle.
 await page.keyboard.press('b');await page.mouse.move(500,400);await page.mouse.down();await page.mouse.move(850,400,{steps:25});await page.mouse.up();
 const before=await page.evaluate(()=>window.testApi.getSceneElements().filter(e=>e.type==='freedraw').length);assert(before>0);
 await page.keyboard.press('e');await page.keyboard.press('e');await page.waitForTimeout(200);
 await page.mouse.move(675,360);await page.mouse.down();await page.mouse.move(675,440,{steps:8});await page.mouse.up();
 const cut=await page.evaluate(()=>window.testApi.getSceneElements().filter(e=>e.customData?.icnSlice));assert(cut.length>=2,'slice produced independent pieces');
 await page.keyboard.press('e');await page.waitForTimeout(200);
 await page.mouse.move(550,400);await page.mouse.down();await page.mouse.move(570,400,{steps:2});await page.mouse.up();
 await page.waitForFunction(()=>window.testApi.getSceneElements().some(e=>e.customData?.icnSoftOriginal),null,{timeout:20000});
 await page.evaluate(()=>{const api=window.testApi,e=api.getSceneElements().find(e=>e.customData?.icnSoftOriginal);api.setActiveTool({type:'selection'});api.updateScene({appState:{selectedElementIds:{[e.id]:true}}});});
 await page.getByRole('button',{name:'恢复软擦除原稿'}).click();
 assert.equal(await page.evaluate(()=>window.testApi.getSceneElements().some(e=>e.customData?.icnSoftOriginal)),false);
 // Transparent image is cropped to alpha bounds without moving its visible content.
 await page.evaluate(()=>{const api=window.testApi,base=api.getSceneElements()[0];const c=document.createElement('canvas');c.width=c.height=100;c.getContext('2d').fillRect(20,30,40,10);c.getContext('2d').fillRect(20,30,10,50);api.addFiles([{id:'test-cutout',dataURL:c.toDataURL(),mimeType:'image/png',created:Date.now()}]);api.updateScene({elements:[...api.getSceneElements(),{...base,id:'test-cutout-element',type:'image',x:900,y:400,width:100,height:100,angle:0,fileId:'test-cutout',scale:[1,1],crop:null,status:'saved',index:null,customData:{},version:1}]});});
 await page.waitForFunction(()=>window.testApi.getSceneElements().find(e=>e.id==='test-cutout-element')?.customData?.icnCutout);
 const image=await page.evaluate(()=>window.testApi.getSceneElements().find(e=>e.id==='test-cutout-element'));
 assert.equal(image.x,920);assert.equal(image.y,430);assert.equal(image.width,40);assert.equal(image.height,50);
 await page.evaluate(()=>{window.testKit.activateById('select');window.testApi.updateScene({appState:{selectedElementIds:{}}});});await page.waitForTimeout(200);
 const screen=await page.evaluate(()=>{const s=window.testApi.getAppState();return {x:(950+s.scrollX)*s.zoom.value+s.offsetLeft,y:(465+s.scrollY)*s.zoom.value+s.offsetTop};});
 await page.mouse.click(screen.x,screen.y);
 assert.equal(await page.evaluate(()=>!!window.testApi.getAppState().selectedElementIds['test-cutout-element']),false,'transparent interior should not capture clicks');
 // Contours become native, persisted line elements with the requested properties.
 await page.evaluate(()=>window.testApi.updateScene({appState:{selectedElementIds:{'test-cutout-element':true}}}));
 // Image-only selection exposes its edge controls directly on the wheel.
 const ring=page.locator('.icn-object-ring');
 const originalFile=await page.evaluate(()=>window.testApi.getSceneElements().find(e=>e.id==='test-cutout-element').fileId);
 await ring.getByRole('button',{name:'线宽',exact:true}).click();
 await ring.getByRole('spinbutton',{name:'线宽',exact:true}).fill('4');await ring.getByRole('spinbutton',{name:'线宽',exact:true}).press('Enter');
 await page.waitForFunction(()=>window.testApi.getSceneElements().some(e=>e.customData?.icnEdgeSource==='test-cutout-element'&&e.strokeWidth===4));
 await ring.getByRole('button',{name:'线型',exact:true}).click();await ring.getByRole('button',{name:'虚线',exact:true}).click();
 await ring.getByRole('button',{name:'线条风格',exact:true}).click();await ring.getByRole('button',{name:'草绘',exact:true}).click();
 await ring.getByRole('button',{name:'描边颜色',exact:true}).click();
 const swatch=page.locator('.copic-paints [data-color]').nth(20);await swatch.waitFor();const chosenColor=await swatch.getAttribute('data-color');await swatch.click({force:true});
 await page.waitForFunction(color=>window.testApi.getSceneElements().filter(e=>e.customData?.icnEdgeSource==='test-cutout-element').every(e=>e.strokeColor===color),chosenColor);
 const styled=await page.evaluate(()=>({image:window.testApi.getSceneElements().find(e=>e.id==='test-cutout-element'),edge:window.testApi.getSceneElements().find(e=>e.customData?.icnEdgeSource==='test-cutout-element')}));
 assert.equal(styled.image.fileId,originalFile,'edge colors must not recolor source pixels');assert.equal(styled.edge.roughness,2);assert.equal(styled.edge.strokeStyle,'dashed');
 await page.getByRole('button',{name:'关闭色轮',exact:true}).click();
 await page.evaluate(()=>window.testKit.setPanel(null));console.log('PASS wheel edge width, line style, roughness and COPIC color without tinting image');
 assert.equal(await page.getByRole('button',{name:'编辑边缘',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'用边线裁剪图片',exact:true}).count(),0);
 const swipe=async()=>{const p=await page.evaluate(()=>{const s=window.testApi.getAppState();return {x:(580+s.scrollX)*s.zoom.value+s.offsetLeft,y:(320+s.scrollY)*s.zoom.value+s.offsetTop,z:s.zoom.value};});await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x,p.y+170*p.z,{steps:12});await page.mouse.up();};
 for(const tool of ['slice','softErase'])for(const type of ['rectangle','outline','ellipse','arrow','text','image','frame']){
   await page.evaluate(({type,tool})=>{const api=window.testApi,convert=window.testConvert;
     let raw={type:type==='outline'?'rectangle':type,x:500,y:350,width:160,height:100,backgroundColor:type==='outline'?'transparent':'#33aa66',strokeColor:'#111111',strokeWidth:3};
     if(type==='frame')raw.children=[];
     if(type==='arrow')raw={...raw,y:400,height:0,points:[[0,0],[160,0]],endArrowhead:'arrow',backgroundColor:'transparent'};
     if(type==='text')raw={type:'text',x:500,y:370,text:'ABCDEFGH',fontSize:35,fontFamily:1};
     let [element]=convert([type==='image'?{...raw,type:'rectangle'}:raw]);
     if(type==='image'){const c=document.createElement('canvas');c.width=160;c.height=100;c.getContext('2d').fillRect(0,0,160,100);api.addFiles([{id:'opaque-source',mimeType:'image/png',dataURL:c.toDataURL(),created:Date.now()}]);element={...element,type:'image',fileId:'opaque-source',status:'saved',scale:[1,1],crop:null};}
     window.originalId=element.id;api.updateScene({elements:[element],appState:{selectedElementIds:{},selectedGroupIds:{}},captureUpdate:'IMMEDIATELY'});window.testKit.activateById(tool);
   },{type,tool});await page.waitForTimeout(200);await swipe();
   await page.waitForFunction(({tool})=>{const es=window.testApi.getSceneElements();return tool==='slice'?es.every(e=>e.id!==window.originalId):es.some(e=>e.customData?.icnSoftOriginal);},{tool},{timeout:15000}).catch(async err=>{console.log('FAIL',tool,type,await page.evaluate(()=>({es:window.testApi.getSceneElements(),body:document.body.innerText})));throw err;});
   const result=await page.evaluate(()=>window.testApi.getSceneElements().map(e=>({type:e.type,head:e.endArrowhead,polygons:!!e.customData?.icnBoolean,x:e.x,y:e.y,width:e.width,height:e.height})));
   if(tool==='slice'&&type==='rectangle'){assert(result.length>=2);assert(result.every(e=>e.polygons),'filled shape remains vector');}
   if(tool==='slice'&&type==='outline')assert.equal(result.length,2,'outline cut joins across original seam');
   if(tool==='slice'&&type==='arrow'){assert(result.length>=2);assert.equal(result.filter(e=>e.head==='arrow').length,1);}
   if(tool==='slice'&&type==='image'){console.log('Image fragments',result);assert(result.length>=2,'image split must create two independent pieces');}
   console.log('PASS',tool,type,result.length);
   if(tool==='slice'&&type==='rectangle'){await page.keyboard.press('Control+z');await page.waitForFunction(()=>window.testApi.getSceneElements().some(e=>e.id===window.originalId));console.log('PASS single gesture undo');}
 }
 assert.deepEqual(errors,[]);console.log('PASS brush/eraser cycles, independent slices, soft erase + restore, alpha bounds and picking');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
