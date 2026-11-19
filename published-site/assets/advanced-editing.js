import { elementBox } from './pdf-export-regions.js';
import { elementPolygons } from './boolean-geometry.js';
import { cutFilled, polygonElement, maskContours, connectedPixels } from './erase-geometry.js';
import { openCopicPicker } from './copic-picker.js';

export const brushCycle = ['pen', 'fixed', 'water'];
export const eraserCycle = ['eraser', 'slice', 'softErase'];
export const nextTool = (cycle, active) => cycle[(cycle.indexOf(active) + 1) % cycle.length];
const distance = (p, a, b) => {
  const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
};
export function worldPoint(e,p) {
  const c=Math.cos(e.angle||0),s=Math.sin(e.angle||0),x=p[0]-e.width/2,y=p[1]-e.height/2;
  return [e.x+e.width/2+x*c-y*s,e.y+e.height/2+x*s+y*c];
}
// Subdivide sparse paths before cutting, including a line with just two endpoints.
export function splitStroke(e,a,b,radius) {
  const points=e.points.map(p=>worldPoint(e,p)), runs=[];let run=[],touched=false;
  if(radius===0){
    if(a[0]===b[0]&&a[1]===b[1])return null;
    run=[[...points[0],e.pressures?.[0]??.5]];
    for(let i=1;i<points.length;i++){
      const p=points[i-1],q=points[i],dx=q[0]-p[0],dy=q[1]-p[1],vx=b[0]-a[0],vy=b[1]-a[1],den=dx*vy-dy*vx;
      const t=((a[0]-p[0])*vy-(a[1]-p[1])*vx)/den,u=((a[0]-p[0])*dy-(a[1]-p[1])*dx)/den;
      if(Math.abs(den)>1e-9&&t>0&&t<1&&u>=0&&u<=1){
        const hit=[p[0]+dx*t,p[1]+dy*t,(e.pressures?.[i-1]??.5)*(1-t)+(e.pressures?.[i]??.5)*t];
        run.push(hit);runs.push(run);run=[hit];touched=true;
      }
      run.push([...q,e.pressures?.[i]??.5]);
    }
    if(run.length>1)runs.push(run);return touched?runs:null;
  }
  for(let i=1;i<points.length;i++) {
    const p=points[i-1],q=points[i],length=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const steps=Math.max(1,Math.ceil(length/Math.max(.25,Math.min(2,radius/3))));
    for(let j=i===1?0:1;j<=steps;j++) {
      const t=j/steps,v=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
      const pressure=(e.pressures?.[i-1]??.5)*(1-t)+(e.pressures?.[i]??.5)*t;
      if(distance(v,a,b)<=Math.max(.3,radius)) {touched=true;if(run.length>1)runs.push(run);run=[];}
      else run.push([...v,pressure]);
    }
  }
  if(run.length>1)runs.push(run);
  return touched?runs:null;
}

// Alpha-aware picking uses the local image coordinates (including rotation and flips).
export function imageHit(e,x,y) {
  const mask=e.customData?.icnCutout;if(!mask)return true;
  const c=Math.cos(e.angle||0),s=Math.sin(e.angle||0),dx=x-e.x-e.width/2,dy=y-e.y-e.height/2;
  let u=(dx*c+dy*s+e.width/2)/e.width,v=(-dx*s+dy*c+e.height/2)/e.height;
  if(e.scale?.[0]<0)u=1-u;if(e.scale?.[1]<0)v=1-v;
  if(u<0||v<0||u>=1||v>=1)return false;
  return mask.rows[Math.floor(v*mask.h)]?.[Math.floor(u*mask.w)]==='1';
}
export function cutoutOutline(mask){
  const filled=(x,y)=>x>=0&&y>=0&&x<mask.w&&y<mask.h&&mask.rows[y]?.[x]==='1';
  let path='';for(let y=0;y<mask.h;y++)for(let x=0;x<mask.w;x++)if(filled(x,y)){
    if(!filled(x,y-1))path+=`M${x} ${y}h1`;
    if(!filled(x,y+1))path+=`M${x} ${y+1}h1`;
    if(!filled(x-1,y))path+=`M${x} ${y}v1`;
    if(!filled(x+1,y))path+=`M${x+1} ${y}v1`;
  }return path;
}

export function alphaBounds(data,w,h) {
  let left=w,top=h,right=-1,bottom=-1,transparent=false;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const a=data[(y*w+x)*4+3];if(a<255)transparent=true;
    if(a>4){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  return {left,top,right,bottom,transparent};
}
async function prepareCutout(api,e,revise,capture) {
  const file=api.getFiles()[e.fileId];if(!file?.dataURL||file.mimeType==='image/gif'||e.customData?.icnMedia)return;
  const bitmap=await createImageBitmap(await(await fetch(file.dataURL)).blob());
  const crop=e.crop||{x:0,y:0,width:bitmap.width,height:bitmap.height};
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(crop.width));canvas.height=Math.max(1,Math.round(crop.height));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);bitmap.close();
  const bounds=alphaBounds(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
  if(!bounds.transparent)return;
  let patch;
  if(bounds.right<0)patch={isDeleted:true};
  else {
    const {left,top,right,bottom}=bounds,w=right-left+1,h=bottom-top+1;
    const trimmed=document.createElement('canvas');trimmed.width=w;trimmed.height=h;
    trimmed.getContext('2d').drawImage(canvas,left,top,w,h,0,0,w,h);
    const small=document.createElement('canvas');small.width=Math.min(256,w);small.height=Math.min(256,h);
    small.getContext('2d').drawImage(trimmed,0,0,small.width,small.height);
    const pixels=small.getContext('2d').getImageData(0,0,small.width,small.height).data;
    const rows=Array.from({length:small.height},(_,y)=>Array.from({length:small.width},(_,x)=>pixels[(y*small.width+x)*4+3]>4?'1':'0').join(''));
    const width=e.width*w/canvas.width,height=e.height*h/canvas.height;
    const offsetX=e.scale?.[0]<0?canvas.width-1-right:left,offsetY=e.scale?.[1]<0?canvas.height-1-bottom:top;
    const center=worldPoint(e,[e.width*(offsetX+w/2)/canvas.width,e.height*(offsetY+h/2)/canvas.height]);
    const id=crypto.randomUUID();api.addFiles([{id,dataURL:trimmed.toDataURL('image/png'),mimeType:'image/png',created:Date.now()}]);
    patch={fileId:id,crop:null,x:center[0]-width/2,y:center[1]-height/2,width,height,
      customData:{...e.customData,icnCutout:{w:small.width,h:small.height,rows,fileId:id}}};
  }
  // An asynchronous decode must never overwrite a newer edit or undo.
  const live=api.getSceneElements().find(v=>v.id===e.id);
  if(!live||live.version!==e.version||live.fileId!==e.fileId)return;
  api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(v=>v.id===e.id?revise(v,patch):v),captureUpdate:capture.NEVER});
}

export function createAdvancedEditing(React,revise,convert,capture,render) {
  const {createElement:h,useEffect,useRef,useState}=React;
  return function AdvancedEditing({api,kit,layers}) {
    const current=useRef({kit,layers});current.current={kit,layers};
    const [mode,setMode]=useState(null),[size,setSize]=useState(24),[strength,setStrength]=useState(70),[cursor,setCursor]=useState(null),[error,setError]=useState('');
    const [allLayers,setAllLayers]=useState(true),[includeLocked,setIncludeLocked]=useState(false),[busy,setBusy]=useState(false),[hardness,setHardness]=useState(0);
    const options=useRef({});options.current={allLayers,includeLocked,hardness};
    const [edgeOpen,setEdgeOpen]=useState(false),[edgeColor,setEdgeColor]=useState('#1b1b1f'),[edgeWidth,setEdgeWidth]=useState(1.5),[edgeStyle,setEdgeStyle]=useState('solid'),[edgeRough,setEdgeRough]=useState(1),[edgeSmooth,setEdgeSmooth]=useState(.8);
    const pending=useRef(false),edgeDialog=useRef(null);
    useEffect(()=>{if(edgeOpen)edgeDialog.current?.showModal();},[edgeOpen]);
    const active=useRef(null),sizeRef=useRef(size),strengthRef=useRef(strength);sizeRef.current=size;strengthRef.current=strength;
    const gesture=useRef(null);
    useEffect(()=>{
      const seen=new Set(),pending=new Set();let disposed=false;
      const scan=()=>{for(const e of api.getSceneElements()){
        if(e.type!=='image'||e.customData?.icnCutout?.fileId===e.fileId||pending.has(e.id)||seen.has(e.fileId)||!api.getFiles()[e.fileId])continue;
        pending.add(e.id);seen.add(e.fileId);
        prepareCutout(api,e,revise,capture).catch(err=>{console.warn('Cutout preparation',err);seen.delete(e.fileId);}).finally(()=>pending.delete(e.id));
      }};
      const timer=setInterval(()=>{if(!disposed&&!gesture.current&&!pending.current)scan();},500);
      return()=>{disposed=true;clearInterval(timer);};
    },[api]);
    useEffect(()=>{
      const choose=id=>{active.current=['slice','softErase'].includes(id)?id:null;setMode(active.current);
        current.current.kit.activateById(id);current.current.kit.setPanel(null);
      };
      const key=e=>{
        if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.target.closest?.('input,textarea,select,[contenteditable=true],dialog,.icn-copic-overlay'))return;
        if(!['b','e'].includes(e.key.toLowerCase()))return;
        e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
        const cycle=e.key.toLowerCase()==='b'?brushCycle:eraserCycle;
        const old=active.current||current.current.kit.active?.id;
        choose(nextTool(cycle,old));
      };
      window.addEventListener('keydown',key,true);
      const stop=()=>{if(!gesture.current)return;gesture.current=null;setCursor(null);};
      const change=()=>{const tool=current.current.kit.active?.id;
        if(!gesture.current&&tool!==active.current){active.current=['slice','softErase'].includes(tool)?tool:null;setMode(active.current);}};
      const tick=setInterval(change,100);
      const scene=e=>{const s=api.getAppState(),z=s.zoom.value;return [(e.clientX-s.offsetLeft)/z-s.scrollX,(e.clientY-s.offsetTop)/z-s.scrollY];};
      const eligible=e=>{const l=current.current.layers.state.current,layer=l.items.find(v=>v.id===e.customData?.infiniteLayer);
        return !e.isDeleted&&(!e.locked||options.current.includeLocked)&&e.opacity>0&&(!layer||layer.visible&&(!layer.locked||options.current.includeLocked))&&
          (options.current.allLayers||!l.active||!e.customData?.infiniteLayer||e.customData.infiniteLayer===l.active);
      };
      function strokePieces(e,path,r){
          let runs=[e.points.map((p,i)=>[...worldPoint(e,p),e.pressures?.[i]??.5])],touched=false;
          const segments=path.length>1?path.slice(1).map((p,i)=>[path[i],p]):[[path[0],path[0]]];
          for(const [a,b] of segments){const next=[];for(const run of runs){
            const source={x:0,y:0,width:0,height:0,angle:0,points:run,pressures:run.map(p=>p[2])};
            const cut=splitStroke(source,a,b,r);if(cut){touched=true;next.push(...cut);}else next.push(run);
          }runs=next;}
          if(!touched)return null;
          if(runs.length>1){const first=runs[0],last=runs.at(-1);if(Math.hypot(first[0][0]-last.at(-1)[0],first[0][1]-last.at(-1)[1])<.001){runs[0]=[...last.slice(0,-1),...first];runs.pop();}}
          const start=worldPoint(e,e.points[0]),end=worldPoint(e,e.points.at(-1));
          return runs.map(run=>{const x=Math.min(...run.map(p=>p[0])),y=Math.min(...run.map(p=>p[1]));
            const points=run.map(p=>[p[0]-x,p[1]-y]),width=Math.max(...points.map(p=>p[0])),height=Math.max(...points.map(p=>p[1]));
            const [base]=convert([{type:'line',x,y,points}]);
            const customData={...e.customData,icnSlice:true};delete customData.precisionMeasure;delete customData.icnBasicShape;delete customData.icnBoolean;
            return {...e,id:base.id,index:null,x,y,width,height,points,angle:0,isDeleted:false,version:1,versionNonce:base.versionNonce,
              pressures:e.type==='freedraw'?run.map(p=>p[2]):undefined,startBinding:null,endBinding:null,boundElements:null,
              elbowed:false,fixedSegments:null,startIsSpecial:null,endIsSpecial:null,
              startArrowhead:Math.hypot(run[0][0]-start[0],run[0][1]-start[1])<.1?e.startArrowhead:null,
              endArrowhead:Math.hypot(run.at(-1)[0]-end[0],run.at(-1)[1]-end[1])<.1?e.endArrowhead:null,
              backgroundColor:'transparent',customData};
          });
      }
      async function rasterErase(snapshot,path,r,soft){
          const box=elementBox(snapshot);
          const padding=2+(snapshot.strokeWidth||1)*3,region={x:box.x-padding,y:box.y-padding,width:box.width+padding*2,height:box.height+padding*2};
          const [frame]=convert([{type:'frame',...region,children:[]}]);
          const drawable=snapshot.type==='frame'?{...snapshot,type:'rectangle',backgroundColor:'transparent',roundness:null}:snapshot;
          const canvas=await render({elements:[{...drawable,opacity:100}],files:api.getFiles(),appState:{...api.getAppState(),exportBackground:false,exportWithDarkMode:false},exportingFrame:frame,exportPadding:0,
            getDimensions:(w,h)=>{const scale=Math.min(2,4096/Math.max(w,h));return {width:Math.ceil(w*scale),height:Math.ceil(h*scale),scale};}});
          const ctx=canvas.getContext('2d'),scale=canvas.width/region.width;
          // The scene renderer leaves a scaled context. Eraser coordinates below
          // are already in output pixels and must not inherit that transform.
          ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
          const before=ctx.getImageData(0,0,canvas.width,canvas.height).data;
          ctx.globalCompositeOperation='destination-out';
          const segments=path.length>1?path.slice(1).map((p,i)=>[path[i],p]):[[path[0],path[0]]];
          for(const [a,b] of segments){
            if(!soft){ctx.strokeStyle='#000';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(.5,r*2*scale);ctx.beginPath();ctx.moveTo((a[0]-region.x)*scale,(a[1]-region.y)*scale);ctx.lineTo((b[0]-region.x)*scale,(b[1]-region.y)*scale);ctx.stroke();ctx.beginPath();ctx.arc((b[0]-region.x)*scale,(b[1]-region.y)*scale,Math.max(.25,r*scale),0,Math.PI*2);ctx.fillStyle='#000';ctx.fill();continue;}
            const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/Math.max(1,r/4)));
            for(let i=0;i<=steps;i++){const x=(a[0]+(b[0]-a[0])*i/steps-region.x)*scale,y=(a[1]+(b[1]-a[1])*i/steps-region.y)*scale;
              const g=ctx.createRadialGradient(x,y,r*scale*options.current.hardness/100,x,y,Math.max(.01,r*scale));g.addColorStop(0,`rgba(0,0,0,${strengthRef.current/100})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r*scale,y-r*scale,r*scale*2,r*scale*2);}
          }
          const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);let changed=false;
          for(let i=3;i<before.length;i+=4)if(before[i]!==pixels.data[i]){changed=true;break;}
          if(!changed)return null;
          const original=snapshot.customData?.icnSoftOriginal||snapshot;
          const parts=soft?[{left:0,top:0,right:canvas.width-1,bottom:canvas.height-1}]:connectedPixels(pixels.data,canvas.width,canvas.height);
          return parts.map(part=>{
            const tile=document.createElement('canvas');tile.width=part.right-part.left+1;tile.height=part.bottom-part.top+1;
            const tc=tile.getContext('2d');
            if(soft)tc.drawImage(canvas,0,0);else{const p=tc.createImageData(tile.width,tile.height);for(const n of part.pixels){const at=((Math.floor(n/canvas.width)-part.top)*tile.width+n%canvas.width-part.left)*4;p.data.set(pixels.data.subarray(n*4,n*4+4),at);}tc.putImageData(p,0,0);}
            const fileId=crypto.randomUUID();api.addFiles([{id:fileId,dataURL:tile.toDataURL('image/png'),mimeType:'image/png',created:Date.now()}]);
            const [base]=convert([{type:'rectangle',x:region.x+part.left/scale,y:region.y+part.top/scale,width:tile.width/scale,height:tile.height/scale}]);
            const customData={...snapshot.customData,icnCutout:null,icnSlice:!soft};delete customData.icnBoolean;delete customData.icnBasicShape;delete customData.precisionMeasure;
            if(soft){customData.icnSoftOriginal=original;customData.icnSoftOriginalFile=snapshot.customData?.icnSoftOriginalFile||(original.fileId?api.getFiles()[original.fileId]:null);}
            return {...base,type:'image',fileId,status:'saved',scale:[1,1],crop:null,opacity:snapshot.opacity,groupIds:snapshot.groupIds,frameId:snapshot.frameId,locked:snapshot.locked,customData};
          });
      }
      async function execute(path,r,soft){
        setBusy(true);setError('');const changes=new Map();
        try{for(const snapshot of api.getSceneElements().filter(eligible)){
          const box=elementBox(snapshot),segments=path.length>1?path.slice(1).map((p,i)=>[path[i],p]):[[path[0],path[0]]];
          if(!segments.some(([a,b])=>distance([box.x+box.width/2,box.y+box.height/2],a,b)<=Math.hypot(box.width,box.height)/2+r+(snapshot.strokeWidth||1)*3))continue;
          let pieces=null;
          if(!soft){const polygons=elementPolygons({...snapshot,type:snapshot.type==='frame'?'rectangle':snapshot.type,locked:false});
            if(polygons&&snapshot.backgroundColor&&snapshot.backgroundColor!=='transparent'){
              const cut=cutFilled({...snapshot,type:snapshot.type==='frame'?'rectangle':snapshot.type},path,r);pieces=cut?.map(p=>polygonElement(snapshot,p,convert));
            }else if(['line','freedraw','arrow'].includes(snapshot.type)&&!snapshot.customData?.icnBoolean&&!snapshot.customData?.icnBasicShape)pieces=strokePieces(snapshot,path,r);
            else if(polygons){pieces=[];let touched=false;
              for(const polygon of polygons)for(const ring of polygon){const pts=ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]?ring:[...ring,ring[0]];
                const outline={...snapshot,type:'line',x:0,y:0,width:0,height:0,angle:0,points:pts};const cut=strokePieces(outline,path,r);
                if(cut){touched=true;pieces.push(...cut);}else{const [base]=convert([{type:'line',x:0,y:0,points:pts}]);pieces.push({...base,strokeColor:snapshot.strokeColor,strokeWidth:snapshot.strokeWidth,strokeStyle:snapshot.strokeStyle,roughness:snapshot.roughness,opacity:snapshot.opacity,groupIds:snapshot.groupIds,frameId:snapshot.frameId,customData:{infiniteLayer:snapshot.customData?.infiniteLayer,icnSlice:true}});}
              }if(!touched)pieces=null;
            }else pieces=await rasterErase(snapshot,path,r,false);
          }else pieces=await rasterErase(snapshot,path,Math.max(.5,r),true);
          if(pieces){const live=api.getSceneElements().find(e=>e.id===snapshot.id);if(live?.version===snapshot.version)changes.set(snapshot.id,{snapshot,pieces});}
        }
        if(changes.size){
          const mapped=api.getSceneElementsIncludingDeleted().flatMap(e=>changes.has(e.id)?[revise(e,{isDeleted:true}),...changes.get(e.id).pieces]:[e]).map(e=>{
            if(e.isDeleted)return e;const patch={};if(e.containerId&&changes.has(e.containerId))patch.containerId=null;
            for(const k of ['startBinding','endBinding'])if(e[k]&&changes.has(e[k].elementId))patch[k]=null;
            if(e.boundElements?.some(b=>changes.has(b.id)))patch.boundElements=e.boundElements.filter(b=>!changes.has(b.id));
            if(e.frameId&&changes.has(e.frameId))patch.frameId=null;
            return Object.keys(patch).length?revise(e,patch):e;
          });
          api.updateScene({elements:mapped,appState:{selectedElementIds:{},selectedGroupIds:{},selectedLinearElement:null},captureUpdate:capture.IMMEDIATELY});
        }
        }catch(err){setError('擦除失败：'+err.message);console.error(err);}finally{pending.current=false;setBusy(false);}
      }
      const down=e=>{if(!active.current||e.button!==0||!e.target.matches?.('canvas'))return;
        e.preventDefault();e.stopImmediatePropagation();if(pending.current||api.getAppState().viewModeEnabled)return;
        e.target.closest('.excalidraw')?.focus({preventScroll:true});
        const p=scene(e);gesture.current={id:e.pointerId,path:[p],mode:active.current};e.target.setPointerCapture(e.pointerId);};
      const move=e=>{if(!active.current)return;
        if(e.target.matches?.('canvas'))setCursor({x:e.clientX,y:e.clientY});
        const g=gesture.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
        const p=scene(e);g.path.push(p);};
      const up=e=>{const g=gesture.current;if(!g)return;e.preventDefault();e.stopImmediatePropagation();stop();if(e.type==='pointercancel')return;pending.current=true;execute(g.path,sizeRef.current/2,g.mode==='softErase');};
      window.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);window.addEventListener('blur',stop);
      return()=>{clearInterval(tick);window.removeEventListener('keydown',key,true);window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);window.removeEventListener('blur',stop);};
    },[api]);
    const restore=()=>{
      const selected=api.getSceneElements().filter(e=>api.getAppState().selectedElementIds[e.id]&&e.customData?.icnSoftOriginal);
      for(const e of selected)if(e.customData.icnSoftOriginalFile)api.addFiles([e.customData.icnSoftOriginalFile]);
      api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(e=>selected.some(v=>v.id===e.id)?{...e.customData.icnSoftOriginal,id:e.id,version:e.version+1,versionNonce:Math.floor(Math.random()*2**31),updated:Date.now()}:e),captureUpdate:capture.IMMEDIATELY});
    };
    const canRestore=api.getSceneElements().some(e=>api.getAppState().selectedElementIds[e.id]&&e.customData?.icnSoftOriginal);
    const view=api.getAppState(),zoom=view.zoom.value;
    const outlines=api.getSceneElements().filter(e=>view.selectedElementIds[e.id]&&e.customData?.icnCutout);
    const chosenEdges=api.getSceneElements().filter(e=>view.selectedElementIds[e.id]&&e.customData?.icnEdgeSource);
    const edgeSources=[...new Map([...outlines,...chosenEdges.map(e=>api.getSceneElements().find(v=>v.id===e.customData.icnEdgeSource)).filter(Boolean)].map(e=>[e.id,e])).values()];
    function applyEdges(){
      const all=api.getSceneElementsIncludingDeleted(),updates=new Map(),added=[],ids=new Set(edgeSources.map(e=>e.id));
      for(const image of edgeSources){
        const mask=image.customData?.icnCutout;if(!mask)continue;
        const oldGroup=image.customData?.icnEdgeGroup,group=oldGroup||crypto.randomUUID(),groups=[...new Set([...image.groupIds,group])];
        updates.set(image.id,revise(image,{groupIds:groups,customData:{...image.customData,icnEdgeGroup:group}}));
        for(const ring of maskContours(mask,edgeSmooth)){
          if(ring.length<4)continue;
          const points=ring.map(([x,y])=>worldPoint(image,[(image.scale?.[0]<0?mask.w-x:x)*image.width/mask.w,(image.scale?.[1]<0?mask.h-y:y)*image.height/mask.h]));
          const [line]=convert([{type:'line',x:points[0][0],y:points[0][1],points:points.map(p=>[p[0]-points[0][0],p[1]-points[0][1]]),
            strokeColor:edgeColor,strokeWidth:edgeWidth,strokeStyle:edgeStyle,roughness:edgeRough,backgroundColor:'transparent',roundness:null}]);
          added.push({...line,groupIds:groups,frameId:image.frameId,customData:{infiniteLayer:image.customData?.infiniteLayer,icnEdgeSource:image.id}});
        }
      }
      const mapped=all.flatMap(e=>{if(e.customData?.icnEdgeSource&&ids.has(e.customData.icnEdgeSource))return [revise(e,{isDeleted:true})];return [updates.get(e.id)||e];});
      // Put each contour immediately above its source, preserving the scene stack.
      for(let i=mapped.length-1;i>=0;i--)if(ids.has(mapped[i].id))mapped.splice(i+1,0,...added.filter(e=>e.customData.icnEdgeSource===mapped[i].id));
      api.updateScene({elements:mapped,appState:{selectedElementIds:Object.fromEntries([...updates.keys(),...added.map(e=>e.id)].map(id=>[id,true]))},captureUpdate:capture.IMMEDIATELY});
      setEdgeOpen(false);
    }
    async function clipToEdges(){
      setBusy(true);setError('');
      try{for(const source of edgeSources){
        const lines=api.getSceneElements().filter(e=>e.type==='line'&&e.customData?.icnEdgeSource===source.id);
        if(!lines.length)continue;
        const file=api.getFiles()[source.fileId];if(!file)continue;
        const bitmap=await createImageBitmap(await(await fetch(file.dataURL)).blob()),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
        ctx.globalCompositeOperation='destination-in';ctx.beginPath();
        for(const line of lines){for(let i=0;i<line.points.length;i++){
          const [x,y]=worldPoint(line,line.points[i]),angle=source.angle||0,c=Math.cos(angle),s=Math.sin(angle),dx=x-source.x-source.width/2,dy=y-source.y-source.height/2;
          let u=(dx*c+dy*s+source.width/2)/source.width,v=(-dx*s+dy*c+source.height/2)/source.height;
          if(source.scale?.[0]<0)u=1-u;if(source.scale?.[1]<0)v=1-v;
          if(i)ctx.lineTo(u*canvas.width,v*canvas.height);else ctx.moveTo(u*canvas.width,v*canvas.height);
        }ctx.closePath();}ctx.fill('evenodd');
        const live=api.getSceneElements().find(e=>e.id===source.id);if(!live||live.version!==source.version)continue;
        const id=crypto.randomUUID();api.addFiles([{id,dataURL:canvas.toDataURL(),mimeType:'image/png',created:Date.now()}]);
        api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(e=>e.id===source.id?revise(e,{fileId:id,customData:{...e.customData,icnCutout:null}}):e),captureUpdate:capture.IMMEDIATELY});
      }}catch(err){setError('裁剪失败：'+err.message);}finally{setBusy(false);}
    }
    return h(React.Fragment,null,outlines.length>0&&h('svg',{'aria-label':'图片实际轮廓',style:{position:'fixed',inset:0,width:'100vw',height:'100vh',pointerEvents:'none',zIndex:3}},
      outlines.map(e=>{const mask=e.customData.icnCutout,cx=(e.x+e.width/2+view.scrollX)*zoom+view.offsetLeft,cy=(e.y+e.height/2+view.scrollY)*zoom+view.offsetTop;
        return h('g',{key:e.id,transform:`translate(${cx} ${cy}) rotate(${(e.angle||0)*180/Math.PI}) scale(${(e.scale?.[0]||1)*zoom} ${(e.scale?.[1]||1)*zoom}) translate(${-e.width/2} ${-e.height/2}) scale(${e.width/mask.w} ${e.height/mask.h})`},
          h('path',{d:cutoutOutline(mask),fill:'none',stroke:'#6965db',strokeWidth:1,'vectorEffect':'non-scaling-stroke'}));})),
      mode&&h('div',{className:'icn-eraser-options',style:{position:'fixed',left:225,top:90,zIndex:5,background:'white',padding:12,borderRadius:12,boxShadow:'0 4px 20px #0002'}},
      h('strong',null,mode==='slice'?'切割':'软橡皮擦'),h('small',{style:{display:'block'}},'E 循环：对象橡皮 → 切割 → 软橡皮擦'),
      h('label',null,'直径 ',h('input',{type:'number',min:mode==='slice'?0:1,max:300,value:size,onChange:e=>setSize(Math.max(mode==='slice'?0:1,Math.min(300,+e.target.value)))})),
      mode==='softErase'&&h('label',null,'强度 ',h('input',{type:'range',min:1,max:100,value:strength,onChange:e=>setStrength(+e.target.value)})),
      mode==='softErase'&&h('label',{style:{display:'block'}},'硬度 ',h('input',{type:'range',min:0,max:99,value:hardness,onChange:e=>setHardness(+e.target.value)})),
      h('label',{style:{display:'block'}},h('input',{type:'checkbox',checked:allLayers,onChange:e=>setAllLayers(e.target.checked)}),'所有可见图层'),
      h('label',{style:{display:'block'}},h('input',{type:'checkbox',checked:includeLocked,onChange:e=>setIncludeLocked(e.target.checked)}),'包含锁定对象'),
      h('small',{style:{display:'block'}},busy?'正在处理擦除…':mode==='slice'?'拖过对象后松开完成切割；分离的部分可单独选择。':'局部柔边擦除；强度和硬度可调，选中后可恢复原稿。'),error&&h('p',{role:'alert'},error)),
      edgeOpen&&h('dialog',{ref:edgeDialog,'aria-label':'编辑边缘',onCancel:()=>setEdgeOpen(false),style:{padding:24,border:'1px solid #ddd',borderRadius:14,minWidth:320}},
        h('h3',null,'编辑边缘'),h('p',null,'沿实际轮廓生成边线，可调整颜色、线宽与手绘效果。'),
        h('label',{style:{display:'block'}},'边线颜色 ',h('button',{type:'button','aria-label':'边线颜色 COPIC 色环',style:{background:edgeColor,width:38,height:26,border:'1px solid #aaa'},onClick:event=>openCopicPicker({title:'边线颜色',value:edgeColor,anchor:event.currentTarget,choose:setEdgeColor})})),
        h('label',{style:{display:'block'}},'边线粗细 ',h('input',{type:'number',min:.1,max:100,step:.1,value:edgeWidth,onChange:e=>setEdgeWidth(Math.max(.1,Math.min(100,+e.target.value)))})),
        h('label',{style:{display:'block'}},'边线线型 ',h('select',{value:edgeStyle,onChange:e=>setEdgeStyle(e.target.value)},[['solid','实线'],['dashed','虚线'],['dotted','点线']].map(([value,name])=>h('option',{value,key:value},name)))),
        h('label',{style:{display:'block'}},'手绘风格 ',h('select',{value:edgeRough,onChange:e=>setEdgeRough(+e.target.value)},[[0,'精确'],[1,'手绘'],[2,'草绘']].map(([value,name])=>h('option',{value,key:value},name)))),
        h('label',{style:{display:'block'}},'轮廓简化 ',h('input',{type:'number',min:0,max:5,step:.2,value:edgeSmooth,onChange:e=>setEdgeSmooth(Math.max(0,Math.min(5,+e.target.value)))})),
        h('p',null,'应用后与原图组合。进入组合选中边线，双击可编辑节点；圆盘可继续调整线条属性。修改节点后点“用边线裁剪图片”更新实际边缘。'),
        h('button',{onClick:()=>setEdgeOpen(false)},'取消'),h('button',{onClick:applyEdges},'应用可编辑边线')),
      canRestore&&h('button',{style:{position:'fixed',right:330,top:80,zIndex:6},onClick:restore},'恢复软擦除原稿'),
      mode&&cursor&&h('div',{style:{position:'fixed',pointerEvents:'none',zIndex:9999,left:cursor.x-size*api.getAppState().zoom.value/2,top:cursor.y-size*api.getAppState().zoom.value/2,width:size*api.getAppState().zoom.value,height:size*api.getAppState().zoom.value,border:'1px solid #6965db',borderRadius:'50%'}}));
  };
}
