import { exportRegions, elementBox } from './pdf-export-regions.js';
const union=es=>{if(!es.length)throw Error('没有可导出的内容');const bs=es.map(elementBox),x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));return {x,y,width:Math.max(...bs.map(b=>b.x+b.width))-x,height:Math.max(...bs.map(b=>b.y+b.height))-y};};
const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};
const asBlob=(canvas,type)=>new Promise((r,j)=>canvas.toBlob(b=>b?r(b):j(Error('图像编码失败')),type,.96));
export function createExportHub(React,portal,convert,revise,capture,render,svgRender){
 const {createElement:h,useState,useEffect}=React;
 return function ExportHub({apiRef,layers,precision}){
  const [open,setOpen]=useState(false),[format,setFormat]=useState('png'),[scope,setScope]=useState('all'),[quality,setQuality]=useState(2),[paper,setPaper]=useState(true),[order,setOrder]=useState('rows'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState('画布导出');
  useEffect(()=>{let timer;const listen=()=>{const api=apiRef.current;setScope(Object.values(api?.getAppState().selectedElementIds||{}).some(Boolean)?'selection':'all');setError('');setOpen(true);};window.addEventListener('icn:export',listen);
   // Recover visibility markers written by the removed single-page editor once.
   const recover=()=>{const api=apiRef.current;if(!api){timer=setTimeout(recover,100);return;}const all=api.getSceneElementsIncludingDeleted();if(all.some(e=>e.customData?.icnPdfSolo)){api.updateScene({elements:all.map(e=>{const saved=e.customData?.icnPdfSolo;if(!saved)return e;const customData={...e.customData};delete customData.icnPdfSolo;if(saved.layerStyle)customData.infiniteLayerStyle=saved.layerStyle;else delete customData.infiniteLayerStyle;return revise(e,{opacity:saved.opacity,locked:saved.locked,customData});}),captureUpdate:capture.NEVER});}};recover();return()=>{clearTimeout(timer);window.removeEventListener('icn:export',listen);};},[]);
  async function run(){setBusy(true);setError('');try{
   const api=apiRef.current,s=api.getAppState(),visible=api.getSceneElements().filter(e=>!e.isDeleted&&e.opacity>0),ids=s.selectedElementIds;
   const chosen=scope==='selection'?visible.filter(e=>ids[e.id]||ids[e.containerId]||ids[e.frameId]):visible;
   if(!chosen.length)throw Error('请先选择需要导出的对象。');
   const regions=scope==='pages'?exportRegions(chosen,order):[{box:scope==='screen'?{x:-s.scrollX,y:-s.scrollY,width:s.width/s.zoom.value,height:s.height/s.zoom.value}:union(chosen),elements:chosen}];
   const unit={mm:.001,cm:.01,m:1,km:1000,in:.0254,ft:.3048},meters=precision?.scale?precision.scale*(unit[precision.unit]||1):.0254/72;
   const draw=async(region,elements=region.elements||chosen,background=paper,divisor=1)=>{
    const [frame]=convert([{type:'frame',...region.box,children:[],name:null}]);return render({elements,files:api.getFiles(),appState:{...s,exportBackground:background,exportWithDarkMode:false,viewBackgroundColor:paper?s.viewBackgroundColor:'#ffffff',exportEmbedScene:false},exportingFrame:frame,exportPadding:0,getDimensions:(w,hh)=>{const scale=Math.min(quality,16384/Math.max(w,hh),Math.sqrt(64000000/(w*hh*divisor)));return {width:Math.max(1,Math.ceil(w*scale)),height:Math.max(1,Math.ceil(hh*scale)),scale};}});
   };
   let blob;
   if(format==='pdf'){
    const {PDFDocument}=await import('./pdf-lib.js'),pdf=await PDFDocument.create();
    for(const r of regions){const c=await draw(r),img=await pdf.embedPng(c.toDataURL()),w=r.box.width*meters*72/.0254,hh=r.box.height*meters*72/.0254;if(Math.max(w,hh)>14400)throw Error('纸张过大，请选择框架或较小范围。');pdf.addPage([w,hh]).drawImage(img,{x:0,y:0,width:w,height:hh});c.width=c.height=0;}blob=new Blob([await pdf.save()],{type:'application/pdf'});
   }else if(format==='svg'||format==='dxf'||format==='dwg'){
    const [frame]=convert([{type:'frame',...regions[0].box,children:[],name:null}]);
    const svg=await svgRender({elements:chosen,files:api.getFiles(),appState:{...s,exportBackground:paper,exportEmbedScene:false},exportingFrame:frame,exportPadding:0});
    if(format==='svg')blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'});
    else {const {svgToDxf}=await import('./export-dxf.js');blob=new Blob([svgToDxf(svg,meters*1000,quality)],{type:'application/dxf'});if(format==='dwg'){const response=await fetch('/api/export/dwg',{method:'POST',headers:{'Content-Type':'application/dxf'},body:blob});if(!response.ok)throw Error(await response.text());blob=await response.blob();}}
   }else if(format==='psd'){
    const {writePsd}=await import('./export-psd.js'),items=layers.state.current.items.filter(l=>l.visible&&!l.archived),divisor=Math.max(1,items.length+1),region=regions[0],canvas=await draw(region,chosen,paper,divisor),children=[];
    for(const layer of items){const es=chosen.filter(e=>(e.customData?.infiniteLayer||'layer-base')===layer.id);if(es.length)children.push({name:layer.name,canvas:await draw(region,es,false,divisor)});}
    blob=new Blob([writePsd({width:canvas.width,height:canvas.height,canvas,children:children.reverse()})],{type:'image/vnd.adobe.photoshop'});for(const c of children)c.canvas.width=c.canvas.height=0;canvas.width=canvas.height=0;
   }else {const c=await draw(regions[0],chosen,paper||format==='jpg');blob=await asBlob(c,format==='jpg'?'image/jpeg':'image/png');c.width=c.height=0;}
   download(blob,(name.trim()||'画布导出').replace(/[\\/:*?"<>|]/g,'_')+'.'+format);setOpen(false);
  }catch(e){setError(e.message||'无法导出');}finally{setBusy(false);}}
  if(!open)return null;
  const label=(text,control)=>h('label',null,h('span',null,text),control),opt=(value,text)=>h('option',{key:value,value},text);
  return portal(h('div',{className:'icn-export-backdrop'},h('section',{className:'icn-export-dialog',role:'dialog','aria-label':'导出'},h('header',null,h('strong',null,'导出'),h('button',{disabled:busy,onClick:()=>setOpen(false),'aria-label':'关闭导出'},'×')),
   label('文件名称',h('input',{value:name,onChange:e=>setName(e.target.value)})),
   label('格式',h('select',{'aria-label':'导出格式',value:format,onChange:e=>{setFormat(e.target.value);if(e.target.value!=='pdf'&&scope==='pages')setScope('all');}},['pdf','png','jpg','svg','psd','dxf','dwg'].map(v=>opt(v,v.toUpperCase())))),
   label('范围',h('select',{'aria-label':'导出范围',value:scope,onChange:e=>setScope(e.target.value)},opt('selection','仅选中对象'),opt('all','整个画布'),opt('screen','当前可见画面'),...(format==='pdf'?[opt('pages','自动多页：分组／框架')]:[]))),
   scope==='pages'&&format==='pdf'&&label('顺序',h('select',{value:order,onChange:e=>setOrder(e.target.value)},opt('rows','从左到右，再从上到下'),opt('columns','从上到下，再从左到右'))),
   label('清晰度',h('select',{'aria-label':'导出清晰度',value:quality,onChange:e=>setQuality(Number(e.target.value))},opt(1,'标准 · 100%'),opt(2,'高清 · 200%'),opt(4,'超清 · 400%'),opt(8,'精细 · 800%'))),
   label('背景',h('input',{type:'checkbox',checked:paper,onChange:e=>setPaper(e.target.checked)})),
   h('small',null,format==='svg'?'SVG 保留矢量路径，图片仍按原分辨率嵌入。':['dwg','dxf'].includes(format)?'CAD 导出保留矢量轮廓；图片底图不包含。DWG 使用本机转换组件。':'输出按内存和最大边长上限调整；PSD 按现有图层输出。'),
   error&&h('p',{role:'alert'},error),h('button',{disabled:busy,onClick:run,className:'icn-export-save'},busy?'正在生成…':'选择位置并保存'))),document.body);
 };
}
