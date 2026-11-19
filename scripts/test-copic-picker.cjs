const {chromium}=require('../node_modules/.brush-test/node_modules/playwright-core');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const server=await(await import('vite')).preview({preview:{host:'127.0.0.1',port:4197,strictPort:true}});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept('COPIC test'));
 await page.route('**/assets/advanced-editing.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('published-site/assets/advanced-editing.js','utf8').replace('const current=useRef({kit,layers});','window.testApi=api;window.testKit=kit;window.testConvert=convert;const current=useRef({kit,layers});')}));
 await page.goto('http://127.0.0.1:4197');await page.getByRole('button',{name:/新建画布/}).click();await page.waitForFunction(()=>window.testKit);
 const choose=async()=>{const dialog=page.locator('.icn-copic-overlay');await dialog.waitFor();await dialog.getByRole('button',{name:'COPIC',exact:true}).waitFor();
   await page.waitForFunction(()=>{const wheel=document.querySelector('.brush-wheel').getBoundingClientRect(),fan=document.querySelector('.icn-copic-overlay .studio-color-wheel').getBoundingClientRect();return Math.abs(wheel.left+wheel.width/2-fan.left-fan.width*99/500)<1&&Math.abs(wheel.top+wheel.height/2-fan.top-fan.height*99/500)<1;});
   assert.equal(await dialog.getAttribute('role'),'group');assert.equal(await dialog.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   const swatch=dialog.locator('.copic-paints [data-color]').nth(33),color=await swatch.getAttribute('data-color');await swatch.click({force:true});await dialog.getByRole('button',{name:'关闭色轮',exact:true}).click();return color;};
 await page.evaluate(()=>window.testKit.activateById('pen'));await page.locator('.icn-object-ring').getByRole('button',{name:'描边颜色',exact:true}).click();const penColor=await choose();
 await page.waitForFunction(c=>window.testKit.pen?.color===c,penColor);console.log('PASS default tool stroke opens COPIC and applies color');
 await page.evaluate(()=>{const [shape]=window.testConvert([{type:'rectangle',x:500,y:350,width:200,height:120,backgroundColor:'#33aa66'}]);window.testId=shape.id;window.testKit.activateById('select');window.testApi.updateScene({elements:[shape],appState:{selectedElementIds:{[shape.id]:true}}});});
 await page.locator('.icn-object-ring').getByRole('button',{name:'填充颜色',exact:true}).click();const fillColor=await choose();
 assert.equal(await page.evaluate(()=>window.testApi.getSceneElements().find(e=>e.id===window.testId).backgroundColor),fillColor);
 await page.locator('.icn-object-ring').getByRole('button',{name:'填充颜色',exact:true}).click();await page.getByRole('button',{name:'透明 / 无填充'}).click();await page.getByRole('button',{name:'关闭色轮',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.testApi.getSceneElements().find(e=>e.id===window.testId).backgroundColor),'transparent');console.log('PASS fill COPIC and transparent option');
 // Fallback converts native color inputs while retaining their input/change contract.
 await page.evaluate(()=>{const input=document.createElement('input');input.type='color';input.id='native-color-test';input.setAttribute('aria-label','测试网格颜色');input.addEventListener('change',()=>window.nativeColor=input.value);document.body.append(input);});
 await page.locator('#native-color-test').click();const nativeColor=await choose();assert.equal(await page.evaluate(()=>window.nativeColor),nativeColor);console.log('PASS native settings input opens COPIC');
 // Native Excalidraw palette entries are single COPIC launchers.
 await page.evaluate(()=>window.testKit.setPanel('native'));
 const launcher=page.locator('[data-icn-copic-native]').first();await launcher.waitFor();await launcher.click();await choose();console.log('PASS native Excalidraw COPIC launcher');
 await page.setViewportSize({width:773,height:611});await page.evaluate(()=>{window.testKit.setPanel(null);window.testKit.activateById('pen');});
 await page.locator('.icn-object-ring').getByRole('button',{name:'描边颜色',exact:true}).click();await page.waitForTimeout(100);
 await page.screenshot({path:'node_modules/.brush-test/copic-wheel-anchored.png'});await choose();console.log('PASS anchored wheel at 773x611');
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
