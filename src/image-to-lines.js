export function createImageTracing(React,portal,convert,revise,capture){
 const {createElement:h,useState,useRef,useEffect}=React;
 return function ImageTracing({api,selected,context}){
  const [source,setSource]=useState(null),[mode,setMode]=useState('lines'),[threshold,setThreshold]=useState(185),[tolerance,setTolerance]=useState(2.5),[keep,setKeep]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [level,setLevel]=useState('clean'),[minLength,setMinLength]=useState(16),[joinGap,setJoinGap]=useState(5),[prepared,setPrepared]=useState(null);const worker=useRef();
  const presets={clean:{side:1280,maxPaths:300,maxNodes:6000,tolerance:2.5,minLength:16,joinGap:5},balanced:{side:1536,maxPaths:600,maxNodes:12000,tolerance:1.5,minLength:10,joinGap:4},detail:{side:2048,maxPaths:1500,maxNodes:30000,tolerance:.8,minLength:5,joinGap:2}};
  const reset=()=>setPrepared(null);
  useEffect(()=>()=>worker.current?.terminate(),[]);
  const image=selected.length===1&&selected[0].type==='image'&&!selected[0].locked?selected[0]:null;
  const vectors=selected.length>0&&selected.every(e=>e.type==='line'&&!e.locked&&e.customData?.icnImageTrace);
  const [menuHost,setMenuHost]=useState(null);
  useEffect(()=>{
   if((!image&&!vectors)||!context){setMenuHost(null);return;}
   const host=document.createElement('li');host.className='icn-image-trace-command';
   const pin=()=>{
    // Put the action near image operations, rather than below the long menu.
    const crop=context.querySelector('[data-testid="cropEditor"]')?.closest('li');
    const list=crop?.parentElement||(context.tagName==='UL'?context:context.querySelector('ul'))||context;
    if(!host.isConnected){if(crop)crop.after(host);else list.prepend(host);}
   };
   pin();setMenuHost(host);
   const observer=new MutationObserver(pin);observer.observe(context,{childList:true,subtree:true});
   return()=>{observer.disconnect();host.remove();};
  },[context,image?.id,vectors]);
  async function run(){setBusy(true);setError('');try{
   let live,pixels,w,hh;
   if(source.kind==='vectors'){
    const es=source.elements,points=es.map(e=>e.points.map(([x,y])=>{const c=Math.cos(e.angle||0),s=Math.sin(e.angle||0);return [e.x+e.width/2+(x-e.width/2)*c-(y-e.height/2)*s,e.y+e.height/2+(x-e.width/2)*s+(y-e.height/2)*c];}));
    let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;for(const ps of points)for(const [a,b] of ps){x=Math.min(x,a);y=Math.min(y,b);right=Math.max(right,a);bottom=Math.max(bottom,b);}
    w=Math.max(1,right-x);hh=Math.max(1,bottom-y);live={...es[0],x,y,width:w,height:hh,angle:0,scale:[1,1]};source.pathsInput=points.map(ps=>ps.map(([a,b])=>[a-x,b-y]));
   }else{
   live=api.getSceneElements().find(e=>e.id===source.id);if(!live||live.locked)throw Error('原图已移除或锁定。');
   const file=api.getFiles()[live.fileId];if(!file?.dataURL)throw Error('图片数据未加载。');const bitmap=await createImageBitmap(await(await fetch(file.dataURL)).blob());
   const crop=live.crop||{x:0,y:0,width:bitmap.width,height:bitmap.height},factor=Math.min(1,presets[level].side/Math.max(crop.width,crop.height));w=Math.max(2,Math.round(crop.width*factor));hh=Math.max(2,Math.round(crop.height*factor));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=hh;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,crop.x,crop.y,crop.width,crop.height,0,0,w,hh);bitmap.close();pixels=ctx.getImageData(0,0,w,hh).data;canvas.width=canvas.height=0;}
   worker.current=new Worker(new URL('./image-trace-worker.js',import.meta.url),{type:'module'});
   const result=await new Promise((resolve,reject)=>{worker.current.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data);worker.current.onerror=e=>reject(Error(e.message));worker.current.postMessage({pixels,width:w,height:hh,threshold,edge:mode==='edges',...presets[level],tolerance,minLength,joinGap,pathsInput:source.pathsInput},pixels?[pixels.buffer]:[]);});worker.current.terminate();worker.current=null;
   const {paths}=result;
   if(!paths.length)throw Error('未检测到线条，请调整阈值或选择轮廓模式。');
   setPrepared({...result,live,w,hh,versions:source.kind==='vectors'?source.elements.map(e=>[e.id,e.version]):[[live.id,live.version]]});
  }catch(e){setError(e.message);}finally{worker.current?.terminate();worker.current=null;setBusy(false);}}
  function apply(){try{
   const {paths,live,w,hh,versions}=prepared;
   if(versions.some(([id,version])=>!api.getSceneElements().some(e=>e.id===id&&e.version===version)))throw Error('原内容已变化，请重新预览。');
   const s=api.getAppState(),group=crypto.randomUUID(),angle=live.angle||0,c=Math.cos(angle),sin=Math.sin(angle);
   const style=source.kind==='vectors'?{strokeColor:live.strokeColor,strokeWidth:live.strokeWidth,strokeStyle:live.strokeStyle,roughness:live.roughness,opacity:live.opacity}:{};
   const elements=convert(paths.map(ps=>{const world=ps.map(([x,y])=>{x=x/w*live.width;y=y/hh*live.height;if(live.scale?.[0]<0)x=live.width-x;if(live.scale?.[1]<0)y=live.height-y;return [live.x+live.width/2+(x-live.width/2)*c-(y-live.height/2)*sin,live.y+live.height/2+(x-live.width/2)*sin+(y-live.height/2)*c];});const [x,y]=world[0];return {type:'line',x,y,points:world.map(([a,b])=>[a-x,b-y]),strokeColor:s.currentItemStrokeColor==='transparent'?'#1b1b1f':s.currentItemStrokeColor,backgroundColor:'transparent',strokeWidth:s.currentItemStrokeWidth||1,strokeStyle:'solid',roughness:0,roundness:null,startArrowhead:null,endArrowhead:null,groupIds:[group],...style,customData:{infiniteLayer:live.customData?.infiniteLayer,icnImageTrace:{sourceId:live.customData?.icnImageTrace?.sourceId||live.id}}};}));
   const remove=new Set(source.kind==='vectors'?versions.map(([id])=>id):keep?[]:[live.id]);
   api.updateScene({elements:[...api.getSceneElementsIncludingDeleted().map(e=>remove.has(e.id)?revise(e,{isDeleted:true}):e),...elements],appState:{selectedElementIds:Object.fromEntries(elements.map(e=>[e.id,true])),selectedGroupIds:{[group]:true}},captureUpdate:capture.IMMEDIATELY});api.setActiveTool({type:'selection'});setSource(null);setPrepared(null);api.setToast({message:`已生成 ${elements.length} 条连续线、${prepared.stats.nodes} 个节点。`});
  }catch(e){setError(e.message);}}
  const close=()=>{worker.current?.terminate();worker.current=null;setSource(null);setBusy(false);};
  return h(React.Fragment,null,
   (image||vectors)&&menuHost&&portal(h('button',{type:'button',className:'context-menu-item',onClick:()=>{setSource(image||{kind:'vectors',elements:selected});setError('');setPrepared(null);api.updateScene({appState:{contextMenu:null}});}},h('svg',{viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor',strokeWidth:1.6,'aria-hidden':true},h('path',{d:'M3 18 8 5l8 7 5-9M3 21h18'})),h('span',{className:'context-menu-item__label'},image?'图片转为可编辑线条…':'合并并简化转线结果…')),menuHost),
   source&&portal(h('div',{className:'icn-export-backdrop'},h('section',{className:'icn-export-dialog',role:'dialog','aria-label':'图片转线'},h('header',null,h('strong',null,'图片转线'),h('button',{onClick:close},'×')),
    h('label',null,'简洁程度',h('select',{'aria-label':'简洁程度',value:level,onChange:e=>{const value=e.target.value,p=presets[value];setLevel(value);setTolerance(p.tolerance);setMinLength(p.minLength);setJoinGap(p.joinGap);reset();}},h('option',{value:'clean'},'简洁（推荐）'),h('option',{value:'balanced'},'均衡'),h('option',{value:'detail'},'保留更多细节'))),
    source.kind!=='vectors'&&h('label',null,'转换方式',h('select',{'aria-label':'转换方式',value:mode,onChange:e=>{setMode(e.target.value);setThreshold(e.target.value==='edges'?70:185);reset();}},h('option',{value:'lines'},'线稿：提取中心线'),h('option',{value:'edges'},'图片：提取轮廓'))),
    source.kind!=='vectors'&&h('label',null,'识别阈值',h('input',{type:'number',min:1,max:254,value:threshold,onChange:e=>{setThreshold(+e.target.value);reset();}})),
    h('label',null,'线条简化',h('input',{type:'number',min:.2,max:12,step:.2,value:tolerance,onChange:e=>{setTolerance(+e.target.value);reset();}})),
    h('label',null,'过滤短线',h('input',{type:'number',min:0,max:100,value:minLength,onChange:e=>{setMinLength(+e.target.value);reset();}})),
    h('label',null,'断线连接距离',h('input',{type:'number',min:0,max:12,value:joinGap,onChange:e=>{setJoinGap(+e.target.value);reset();}})),
    source.kind!=='vectors'&&h('label',null,'保留原图',h('input',{type:'checkbox',checked:keep,onChange:e=>setKeep(e.target.checked)})),
    h('small',null,'优先连接同方向线段，过滤短碎线并减少节点。简洁模式最多保留 300 条线、6000 个节点；超过上限会省略较短细节，请先检查预览。'),
    prepared&&h('div',{className:'icn-trace-preview'},h('svg',{viewBox:`0 0 ${prepared.w} ${prepared.hh}`,role:'img','aria-label':'简洁线条预览',style:{width:'100%',height:180,background:'#f6f4f9'}},prepared.paths.map((ps,i)=>h('polyline',{key:i,points:ps.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#292431',strokeWidth:1.2,vectorEffect:'non-scaling-stroke'}))),h('p',{role:'status'},`预计 ${prepared.stats.paths} 条连续线、${prepared.stats.nodes} 个节点（原始 ${prepared.stats.inputPaths} 段、${prepared.stats.inputNodes} 个节点）`)),
    error&&h('p',{role:'alert'},error),h('button',{className:'icn-export-save',onClick:run,disabled:busy},busy?'正在后台整理…':prepared?'重新预览':'预览简洁线条'),prepared&&h('button',{className:'icn-trace-apply',onClick:apply,disabled:busy},`应用 ${prepared.paths.length} 条线`))),document.body));
 };
}
