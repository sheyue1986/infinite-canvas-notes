import * as pdfjs from './pdfjs/pdf.js';
import { PDFDocument, degrees } from './pdf-lib.js';
import { createPdfPageFocus } from './pdf-page-focus.js';
import { canvasBusy } from './canvas-activity.js';
import { exportRegions } from './pdf-export-regions.js';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdfjs/pdf.worker.js', import.meta.url).href;
const docs = new Map();
const toData = blob => new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
const bytesOf = data => Uint8Array.from(atob(data.split(',')[1]), c=>c.charCodeAt(0));
const pdfMark = e => e.customData?.icnPdf;
export async function openPdf(data, name, id=crypto.randomUUID(), password) {
  if(docs.has(id))return docs.get(id);
  const task=pdfjs.getDocument({data:bytesOf(data),cMapUrl:new URL('./pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./pdfjs/standard_fonts/',import.meta.url).href});
  task.onPassword=(update,reason)=>{const value=password?.(reason);if(value==null){task.destroy();return;}update(value);};
  const pdf=await task.promise;
  const doc={id,data,name,pdf,count:pdf.numPages};docs.set(id,doc);return doc;
}
export async function renderPdf(doc, number, transparent=false, dpi=150) {
  const page=await doc.pdf.getPage(number),unit=page.getViewport({scale:1});
  const scale=Math.min(dpi/72,8192/Math.max(unit.width,unit.height),Math.sqrt(24000000/(unit.width*unit.height)));
  const viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport,background:transparent?'rgba(0,0,0,0)':'rgb(255,255,255)'}).promise;
  const dataURL=canvas.toDataURL('image/png');canvas.width=canvas.height=0;
  return {dataURL,width:unit.width,height:unit.height};
}
function bounds(e) {
  const c=Math.abs(Math.cos(e.angle||0)),s=Math.abs(Math.sin(e.angle||0));
  const w=e.width*c+e.height*s,h=e.height*c+e.width*s;
  return {x:e.x+e.width/2-w/2,y:e.y+e.height/2-h/2,width:w,height:h};
}
function allBounds(elements) {
  const boxes=elements.map(bounds);if(!boxes.length)throw Error('画布中没有可导出的内容。');
  const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
}
export function createPdfWorkspace(React, portal, convert, revise, capture, exportCanvas) {
  const {createElement:h,useState,useEffect,useRef}=React;
  const icon=(kind)=>h('svg',{viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor',strokeWidth:1.6,'aria-hidden':true},h('path',{d:kind==='out'?'M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7':'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8m-8 4h8'}));
  return function PdfWorkspace({apiRef,layers,precision,zh=true}) {
    const [panel,setPanel]=useState(null),[doc,setDoc]=useState(null),[thumbs,setThumbs]=useState({}),[busy,setBusy]=useState(''),[error,setError]=useState('');
    const [range,setRange]=useState('pages'),[dpi,setDpi]=useState(150),[paper,setPaper]=useState(true),[originals,setOriginals]=useState(false),[vector,setVector]=useState(true);
    const [pageOrder,setPageOrder]=useState('rows');
    const [multi,setMulti]=useState(false),[checked,setChecked]=useState([]),[filter,setFilter]=useState(''),[order,setOrder]=useState([]),[focused,setFocused]=useState(null);
    const clickTimer=useRef(),focusController=useRef();
    const [,refresh]=useState(0),input=useRef(),replaceId=useRef(null),cancel=useRef(false),docRef=useRef(doc),handlers=useRef({});docRef.current=doc;
    const api=apiRef.current;
    const sidebar=api?.getAppState().openSidebar;
    if(!focusController.current)focusController.current=createPdfPageFocus(apiRef,()=>handlers.current.layers,revise,capture,setFocused);
    const message=e=>e?.message || 'PDF 操作失败，请检查文件。';
    useEffect(()=>{
      let frame,change,observer,alive=true;
      let lastHost,lastSidebar,lastSelection,lastManifest;
      const update=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=null;if(!alive||canvasBusy())return;focusController.current.sync();const api=apiRef.current,s=api.getAppState(),host=document.querySelector('.icn-sidebar-pdf-host'),sidebar=s.openSidebar?.tab,selection=Object.keys(s.selectedElementIds).filter(id=>s.selectedElementIds[id]).join('|'),manifest=docRef.current&&api.getSceneElements().find(e=>pdfMark(e)?.documentId===docRef.current.id)?.customData?.icnPdf?.catalog;if(host!==lastHost||sidebar!==lastSidebar||selection!==lastSelection||manifest!==lastManifest){lastHost=host;lastSidebar=sidebar;lastSelection=selection;lastManifest=manifest;refresh(n=>n+1);}});};
      const bind=()=>{frame=null;if(!apiRef.current){frame=requestAnimationFrame(bind);return;}focusController.current.recover();change=apiRef.current.onChange(update);observer=new MutationObserver(update);observer.observe(document.querySelector('.app-shell'),{childList:true,subtree:true});update();};bind();
      window.addEventListener('pointerup',update,true);
      const drag=e=>{if([...e.dataTransfer?.types||[]].some(t=>t==='Files'||t==='application/x-icn-pdf-page'))e.preventDefault();};
      const drop=e=>{const number=Number(e.dataTransfer?.getData('application/x-icn-pdf-page'));if(number&&e.target.closest?.('.excalidraw')&&!e.target.closest?.('.icn-pdf-panel')){e.preventDefault();e.stopImmediatePropagation();const s=apiRef.current.getAppState();handlers.current.add(number,[(e.clientX-s.offsetLeft)/s.zoom.value-s.scrollX,(e.clientY-s.offsetTop)/s.zoom.value-s.scrollY]);return;}const file=[...e.dataTransfer?.files||[]].find(f=>/\.pdf$/i.test(f.name));if(file){e.preventDefault();e.stopImmediatePropagation();handlers.current.load(file);}};
      window.addEventListener('drop',drop,true);window.addEventListener('dragover',drag,true);
      const key=e=>{if(e.key==='Escape'&&focusController.current.active){e.preventDefault();e.stopImmediatePropagation();focusController.current.exit();}};
      window.addEventListener('keydown',key,true);
      const double=e=>{if(!e.target.closest?.('canvas.interactive'))return;const s=apiRef.current.getAppState(),x=(e.clientX-s.offsetLeft)/s.zoom.value-s.scrollX,y=(e.clientY-s.offsetTop)/s.zoom.value-s.scrollY;const page=apiRef.current.getSceneElements().filter(pdfMark).findLast(p=>{const b=bounds(p);return x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height&&p.opacity>0;});if(page){e.preventDefault();e.stopImmediatePropagation();focusController.current.enter(page);}};
      window.addEventListener('dblclick',double,true);
      return()=>{alive=false;clearTimeout(clickTimer.current);cancelAnimationFrame(frame);change?.();observer?.disconnect();window.removeEventListener('pointerup',update,true);window.removeEventListener('drop',drop,true);window.removeEventListener('dragover',drag,true);window.removeEventListener('keydown',key,true);window.removeEventListener('dblclick',double,true);focusController.current.exit();};
    },[]);
    useEffect(()=>{
      if(panel!=='import'||!doc||sidebar?.tab!=='icn-pdf')return;
      let alive=true;cancel.current=false;setThumbs({});
      (async()=>{for(let n=1;n<=doc.count&&alive;n++){while(alive&&canvasBusy())await new Promise(r=>setTimeout(r,80));if(!alive)break;try{const p=await renderPdf(doc,n,false,18);if(alive)setThumbs(old=>({...old,[n]:p}));await new Promise(r=>setTimeout(r,0));}catch(e){if(alive)setError(message(e));break;}}})();return()=>{alive=false;};
    },[doc,panel,sidebar?.tab]);
    useEffect(()=>{if(sidebar?.tab==='icn-pdf'&&!panel)setPanel('import');},[sidebar?.tab,panel]);
    const manifest=doc&&api?.getSceneElements().find(e=>pdfMark(e)?.documentId===doc.id)?.customData?.icnPdf?.catalog;
    useEffect(()=>{if(doc&&manifest?.order&&JSON.stringify(manifest.order)!==JSON.stringify(doc.order)){doc.order=manifest.order;setOrder(manifest.order);setChecked([]);}},[manifest,doc]);
    const openPanel=mode=>{setPanel(mode);apiRef.current?.updateScene({appState:{openSidebar:{name:'default',tab:'icn-pdf'}}});};
    const closePanel=()=>{setPanel(null);apiRef.current?.updateScene({appState:{openSidebar:null}});};
    function catalog(opened,manifest){const numbers=manifest?.order||Array.from({length:opened.count},(_,i)=>i+1);setOrder(numbers);opened.order=numbers;setChecked([]);setFilter('');}
    async function load(file) {
      setError('');setBusy('读取 PDF…');
      try {focusController.current.exit();const data=await toData(file),opened=await openPdf(data,file.name,undefined,()=>window.prompt('请输入 PDF 打开密码'));setDoc(opened);catalog(opened);openPanel('import');}
      catch(e){setError(message(e));openPanel('import');}finally{setBusy('');}
    }
    async function restore(element) {
      setBusy('打开分页…');setError('');
      try{const m=pdfMark(element),opened=await openPdf(m.data,m.name,m.documentId,()=>window.prompt('请输入 PDF 打开密码'));setDoc(opened);catalog(opened,m.catalog);openPanel('import');}
      catch(e){setError(message(e));}finally{setBusy('');}
    }
    async function place(number,position,transparent=false,targetId) {
      const current=docRef.current;if(!current||!apiRef.current)return;
      const api=apiRef.current,render=await renderPdf(current,number,transparent),state=api.getAppState();
      const unitMeters={mm:.001,cm:.01,m:1,km:1000,in:.0254,ft:.3048};
      const metersPerPoint=precision?.scale?precision.scale*(unitMeters[precision.unit]||1):.0254/72;
      const factor=(.0254/72)/metersPerPoint;
      const old=targetId&&api.getSceneElements().find(e=>e.id===targetId);
      const width=render.width*factor,height=render.height*factor;
      const center=position||[state.width/(2*state.zoom.value)-state.scrollX,state.height/(2*state.zoom.value)-state.scrollY];
      const fileId=crypto.randomUUID();api.addFiles([{id:fileId,dataURL:render.dataURL,mimeType:'image/png',created:Date.now()}]);
      const meta={documentId:current.id,name:current.name,page:number,count:current.count,data:current.data,paperWidth:render.width,paperHeight:render.height,transparent,catalog:{order:current.order||order}};
      let element;
      if(old)element=revise(old,{fileId,customData:{...old.customData,icnPdf:meta}});
      else {
        const layer=layers.state.current.items.find(l=>l.id===layers.state.current.active);
        if(layer?.locked||layer&&!layer.visible)throw Error('请先选择可见且未锁定的图层。');
        [element]=convert([{type:'image',x:center[0]-width/2,y:center[1]-height/2,width,height,fileId,status:'saved',scale:[1,1],customData:{icnPdf:meta,infiniteLayer:layer?.id}}]);
      }
      api.updateScene({elements:old?api.getSceneElementsIncludingDeleted().map(e=>e.id===old.id?element:e):[...api.getSceneElementsIncludingDeleted(),element],appState:{selectedElementIds:{[element.id]:true}},captureUpdate:capture.IMMEDIATELY});
      api.setActiveTool({type:'selection'});return element;
    }
    async function add(number,position) {
      focusController.current.exit();
      setBusy('导入页面…');setError('');try{await place(number,position,false,replaceId.current);replaceId.current=null;}catch(e){setError(message(e));}finally{setBusy('');}
    }
    function setCatalog(numbers,deleted=[]) {
      doc.order=numbers;setOrder(numbers);setChecked([]);
      const remove=new Set(api.getSceneElements().filter(e=>pdfMark(e)?.documentId===doc.id&&deleted.includes(pdfMark(e).page)).map(e=>e.id));
      api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(e=>{
        if(remove.has(e.id)||remove.has(e.customData?.icnPdfPageId))return revise(e,{isDeleted:true});
        if(pdfMark(e)?.documentId===doc.id)return revise(e,{customData:{...e.customData,icnPdf:{...pdfMark(e),catalog:{order:numbers}}}});return e;
      }),captureUpdate:capture.IMMEDIATELY});
    }
    function reorder(number,target){if(number===target||!order.includes(number))return;const next=order.filter(n=>n!==number);next.splice(next.indexOf(target),0,number);setCatalog(next);}
    const matching=number=>api.getSceneElements().filter(e=>pdfMark(e)?.documentId===doc?.id&&pdfMark(e).page===number);
    async function single(number){
      clearTimeout(clickTimer.current);focusController.current.exit();setBusy('打开单页…');setError('');
      try{const page=matching(number)[0]||await place(number);if(page)focusController.current.enter(page);}catch(e){setError(message(e));}finally{setBusy('');}
    }
    async function batch(action){
      if(!checked.length||busy)return;focusController.current.exit();setBusy('批量处理…');setError('');
      try{
        if(action==='delete'){setCatalog(order.filter(n=>!checked.includes(n)),checked);return;}
        const selected=[];
        for(const n of order.filter(n=>checked.includes(n))){
          let originals=matching(n);
          if(action==='copy'&&originals.length){const source=originals[0],owned=api.getSceneElements().filter(e=>e.id===source.id||e.customData?.icnPdfPageId===source.id),ids=new Map(owned.map(e=>[e.id,crypto.randomUUID()])),groups=new Map();
            const copies=owned.map(e=>({...e,id:ids.get(e.id),index:null,x:e.x+40,y:e.y+40,version:1,versionNonce:Math.floor(Math.random()*2147483647),updated:Date.now(),groupIds:e.groupIds.map(g=>{if(!groups.has(g))groups.set(g,crypto.randomUUID());return groups.get(g);}),boundElements:e.boundElements?.filter(b=>ids.has(b.id)).map(b=>({...b,id:ids.get(b.id)}))||null,...(e.type==='text'?{containerId:ids.get(e.containerId)||null}:{}),...(['arrow','line'].includes(e.type)?Object.fromEntries(['startBinding','endBinding'].map(k=>[k,e[k]&&ids.has(e[k].elementId)?{...e[k],elementId:ids.get(e[k].elementId)}:null])):{}),customData:{...e.customData,...(e.customData?.icnPdfPageId?{icnPdfPageId:ids.get(source.id)}:{})}}));
            api.updateScene({elements:[...api.getSceneElementsIncludingDeleted(),...copies],captureUpdate:capture.IMMEDIATELY});selected.push(copies[0]);
          }else if(originals.length)selected.push(...originals);else{const e=await place(n);if(e)selected.push(e);}
        }
        api.setActiveTool({type:'selection'});api.updateScene({appState:{selectedElementIds:Object.fromEntries(selected.filter(e=>!e.locked).map(e=>[e.id,true]))},captureUpdate:capture.NEVER});
      }catch(e){setError(message(e));}finally{setBusy('');}
    }
    async function alpha(element) {
      if(element.locked)return;
      setBusy('更新纸张透明度…');setError('');
      try{const m=pdfMark(element),current=await openPdf(m.data,m.name,m.documentId);const r=await renderPdf(current,m.page,!m.transparent);const id=crypto.randomUUID();api.addFiles([{id,dataURL:r.dataURL,mimeType:'image/png',created:Date.now()}]);api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(e=>e.id===element.id?revise(e,{fileId:id,customData:{...e.customData,icnPdf:{...m,transparent:!m.transparent}}}):e),captureUpdate:capture.IMMEDIATELY});}catch(e){setError(message(e));}finally{setBusy('');}
    }
    async function exportPdf() {
      setBusy('生成 PDF…');setError('');cancel.current=false;
      try {
        const scene=api.getSceneElements().filter(e=>!e.isDeleted),state=api.getAppState();
        const visible=scene.filter(e=>{const layer=layers.state.current.items.find(l=>l.id===e.customData?.infiniteLayer);return !layer||layer.visible;});
        const selected=visible.filter(e=>state.selectedElementIds[e.id]);
        const pages=visible.filter(pdfMark).sort((a,b)=>{const ma=pdfMark(a),mb=pdfMark(b);if(ma.documentId===mb.documentId&&ma.catalog?.order){const difference=ma.catalog.order.indexOf(ma.page)-ma.catalog.order.indexOf(mb.page);if(difference)return difference;}return Math.abs(a.y-b.y)<Math.min(a.height,b.height)*.2?a.x-b.x:a.y-b.y;});
        let regions;
        if(range==='pages')regions=exportRegions(visible,pageOrder);
        else if(range==='pdf'){if(!pages.length)throw Error('请先将 PDF 页面放入画布。');regions=pages.map(e=>({box:bounds(e),source:e}));}
        else if(range==='screen')regions=[{box:{x:-state.scrollX,y:-state.scrollY,width:state.width/state.zoom.value,height:state.height/state.zoom.value}}];
        else regions=[{box:allBounds(range==='selection'?selected:visible)}];
        const output=await PDFDocument.create(),seenDocs=new Map();
        const unitMeters={mm:.001,cm:.01,m:1,km:1000,in:.0254,ft:.3048};
        const paperFactor=precision?.scale?precision.scale*(unitMeters[precision.unit]||1)*72/.0254:1;
        for(let n=0;n<regions.length;n++) {
          if(cancel.current)throw Error('已取消导出。');setBusy(`导出 ${n+1} / ${regions.length}…`);
          const {box,source,elements:members}=regions[n],mark=source&&pdfMark(source);
          const intersects=e=>{const b=bounds(e);return b.x<=box.x+box.width&&b.x+b.width>=box.x&&b.y<=box.y+box.height&&b.y+b.height>=box.y;};
          const native=!!(vector&&mark&&Math.abs(source.angle||0)<.00001&&source.scale?.every(v=>v===1)&&!source.crop&&!mark.transparent&&source.opacity===100&&!visible.slice(0,visible.indexOf(source)).some(intersects));
          const w=Math.max(1,box.width*(mark?mark.paperWidth/source.width:paperFactor)),hh=Math.max(1,box.height*(mark?mark.paperHeight/source.height:paperFactor));
          if(Math.max(w,hh)>14400)throw Error('导出纸张超过 PDF 尺寸上限，请选择页面边界或较小的选区。');
          const page=output.addPage([w,hh]);
          if(native){
            let original=seenDocs.get(mark.documentId);if(!original){original=await PDFDocument.load(bytesOf(mark.data));seenDocs.set(mark.documentId,original);}
            const originalPage=original.getPage(mark.page-1),embedded=await output.embedPage(originalPage);
            const rotation=((originalPage.getRotation().angle%360)+360)%360;
            const ew=rotation%180?hh:w,eh=rotation%180?w:hh;
            page.drawPage(embedded,{x:rotation===180||rotation===270?w:0,y:rotation===90||rotation===180?hh:0,width:ew,height:eh,rotate:degrees(-rotation)});
          }
          const elements=(members||(range==='selection'?selected:visible)).filter(e=>intersects(e)&&!(native&&e.id===source.id));
          if(!elements.length&&native)continue;
          const [frame]=convert([{type:'frame',...box,name:null,children:[]}]);
          const canvas=await exportCanvas({elements,files:api.getFiles(),appState:{...state,exportBackground:paper&&!native,viewBackgroundColor:paper?'#ffffff':state.viewBackgroundColor,exportWithDarkMode:false},exportingFrame:frame,exportPadding:0,getDimensions:(cw,ch)=>{const scale=Math.min(dpi/72*w/cw,8192/Math.max(cw,ch),Math.sqrt(24000000/(cw*ch)));return {width:Math.ceil(cw*scale),height:Math.ceil(ch*scale),scale};}});
          const image=await output.embedPng(canvas.toDataURL('image/png'));page.drawImage(image,{x:0,y:0,width:w,height:hh});canvas.width=canvas.height=0;
        }
        if(originals&&['pages','pdf'].includes(range)){
          const ids=new Set();for(const e of pages){const m=pdfMark(e);if(ids.has(m.documentId))continue;ids.add(m.documentId);const original=await PDFDocument.load(bytesOf(m.data));const imported=new Set(pages.filter(p=>pdfMark(p).documentId===m.documentId).map(p=>pdfMark(p).page));for(const number of m.catalog?.order||Array.from({length:original.getPageCount()},(_,i)=>i+1))if(!imported.has(number)){const [copy]=await output.copyPages(original,[number-1]);output.addPage(copy);}}
        }
        const bytes=await output.save(),blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(doc?.name?.replace(/\.pdf$/i,'')||'画布批注')+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);setBusy('');api.setToast({message:`已导出 ${output.getPageCount()} 页 PDF`});
      }catch(e){console.error('PDF export',e);setError(message(e));}finally{setBusy('');}
    }
    handlers.current={load,add,layers};
    if(!api)return null;
    const selected=api.getSceneElements().filter(e=>api.getAppState().selectedElementIds[e.id]),page=selected.length===1&&pdfMark(selected[0])?selected[0]:null;
    const tools=document.querySelector('.icn-selection-popup .icn-pills');
    const host=document.querySelector('.icn-sidebar-pdf-host');
    const shown=order.filter(n=>!filter.trim()||filter.split(/[,，\s]+/).some(part=>{const [a,b]=part.split('-').map(Number);return Number.isFinite(a)&&(b?n>=a&&n<=b:n===a);}));
    const button=(label,run,kind='in',disabled=false)=>h('button',{type:'button',onClick:run,disabled,title:label},icon(kind),h('span',null,label));
    return h(React.Fragment,null,
      focused&&h('div',{className:'icn-pdf-focus-bar'},h('strong',null,`PDF 第 ${focused.number} 页 · 单页编辑`),button('退出单页（Esc）',()=>focusController.current.exit())),
      h('input',{ref:input,type:'file',accept:'application/pdf,.pdf',hidden:true,onChange:e=>{const file=e.target.files[0];e.target.value='';if(file)load(file);}}),
      page&&tools&&portal(h('div',{className:'icn-pdf-selection'},button('PDF 分页',()=>restore(page)),button(pdfMark(page).transparent?'白色纸张':'透明纸张',()=>alpha(page),'in',!!busy||page.locked),button('替换页面',async()=>{replaceId.current=page.id;await restore(page);},'in',page.locked)),tools),
      panel&&host&&portal(h('section',{className:'icn-pdf-panel','aria-label':'PDF 文档'},
        h('header',null,h('strong',null,'PDF'),h('button',{onClick:closePanel,'aria-label':'收起 PDF 面板'},'×')),
        h('nav',null,button('导入与分页',()=>setPanel('import')),button('导出 PDF',()=>setPanel('export'),'out'),h('button',{type:'button','aria-label':'筛选与多选','aria-pressed':multi,onClick:()=>setMulti(v=>!v)},h('svg',{viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor',strokeWidth:1.6},h('path',{d:'M3 5h18l-7 8v6l-4 2v-8z'})))),
        error&&h('p',{role:'alert',className:'icn-pdf-error'},error),busy&&h('p',{role:'status'},busy),
        panel==='import'?h(React.Fragment,null,button('选择 PDF 文件',()=>{replaceId.current=null;input.current.click();},'in',!!busy),
          doc?h(React.Fragment,null,h('p',null,doc.name+' · '+order.length+' 页'),h('small',null,'单击放入或选择页面，双击进入单页编辑；拖动缩略图调整导出顺序。'),
            multi&&h('div',{className:'icn-pdf-batch'},h('input',{type:'search',value:filter,'aria-label':'筛选页码',placeholder:'筛选页码，如 1,3-8',onChange:e=>setFilter(e.target.value)}),
              h('label',null,h('input',{type:'checkbox','aria-label':'全选筛选结果',checked:shown.length>0&&shown.every(n=>checked.includes(n)),onChange:e=>setChecked(e.target.checked?[...new Set([...checked,...shown])]:checked.filter(n=>!shown.includes(n)))}),'全选 · 已选 '+checked.length),
              h('div',null,button('选择',()=>batch('select'),'in',!checked.length||!!busy||!!focused),button('复制',()=>batch('copy'),'in',!checked.length||!!busy||!!focused),button('删除',()=>batch('delete'),'in',!checked.length||!!busy||!!focused))),
            replaceId.current&&h('p',null,'选择页面替换当前底图，保留其位置和批注。'),
            h('div',{className:'icn-pdf-thumbs'},shown.map(number=>h('article',{key:number,'data-pdf-page':number,className:checked.includes(number)?'is-selected':'',onDragOver:e=>{if(e.dataTransfer.types.includes('application/x-icn-pdf-page'))e.preventDefault();},onDrop:e=>{const from=Number(e.dataTransfer.getData('application/x-icn-pdf-page'));if(from){e.preventDefault();e.stopPropagation();reorder(from,number);}}},
              multi&&h('input',{type:'checkbox','aria-label':`选择第 ${number} 页`,checked:checked.includes(number),onChange:e=>setChecked(old=>e.target.checked?[...old,number]:old.filter(n=>n!==number))}),
              h('button',{disabled:!!busy,draggable:!busy&&!focused,onDragStart:e=>{clearTimeout(clickTimer.current);e.dataTransfer.setData('application/x-icn-pdf-page',String(number));},onClick:()=>{clearTimeout(clickTimer.current);if(multi){setChecked(old=>old.includes(number)?old.filter(n=>n!==number):[...old,number]);return;}clickTimer.current=setTimeout(()=>{const existing=matching(number)[0];if(existing&&!replaceId.current){api.updateScene({appState:{selectedElementIds:{[existing.id]:true}}});api.scrollToContent([existing],{fitToViewport:true,animate:false});}else add(number);},230);},onDoubleClick:()=>single(number)},
                thumbs[number]?h('img',{src:thumbs[number].dataURL,alt:`第 ${number} 页`,draggable:false}):h('span',null,'加载缩略图…'),h('span',null,`第 ${number} 页`)))))) :h('p',null,'选择或拖入 PDF 文件，按原纸张尺寸导入到画布。'),
          h('div',{className:'icn-pdf-drop',onDragOver:e=>e.preventDefault(),onDrop:e=>{e.preventDefault();const number=Number(e.dataTransfer.getData('application/x-icn-pdf-page'));if(number)add(number);}},'拖页到这里，放置在画布中央')):
          h('div',{className:'icn-pdf-options'},h('label',null,'导出范围',h('select',{value:range,onChange:e=>setRange(e.target.value)},[['pages','自动分页（分组／框架）'],['pdf','PDF 页面边界'],['all','整个画布'],['screen','当前可见画面'],['selection','当前选区']].map(([v,t])=>h('option',{key:v,value:v},t)))),
            range==='pages'&&h('label',null,'分页顺序',h('select',{'aria-label':'分页顺序',value:pageOrder,onChange:e=>setPageOrder(e.target.value)},h('option',{value:'rows'},'从左到右，再从上到下'),h('option',{value:'columns'},'从上到下，再从左到右'))),
            h('label',null,'输出精度',h('select',{value:dpi,onChange:e=>setDpi(Number(e.target.value))},[72,150,300,600].map(v=>h('option',{key:v,value:v},v+' PPI')))),
            h('label',null,h('input',{type:'checkbox',checked:paper,onChange:e=>setPaper(e.target.checked)}),'包含白色纸张'),
            h('label',null,h('input',{type:'checkbox',checked:vector,onChange:e=>setVector(e.target.checked)}),'保留原 PDF 矢量内容'),h('small',null,'未旋转、未裁剪的原页保留矢量，批注按所选精度叠加；其余页面按当前外观输出。'),
            h('label',null,h('input',{type:'checkbox',checked:originals,disabled:!['pages','pdf'].includes(range),onChange:e=>setOriginals(e.target.checked)}),'附加未放入画布的原页'),
            h('small',null,'每个外层分组或框架形成一页；未分组的 PDF 底图按原页输出。独立散件合为一页。PDF 页面边界模式沿用缩略图顺序。'),
            button('导出 PDF',exportPdf,'out',!!busy||!!focused),busy&&button('取消导出',()=>{cancel.current=true;}))),host));
  };
}
