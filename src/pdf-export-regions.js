export function elementBox(e){const c=Math.abs(Math.cos(e.angle||0)),s=Math.abs(Math.sin(e.angle||0)),w=e.width*c+e.height*s,h=e.height*c+e.width*s;return {x:e.x+e.width/2-w/2,y:e.y+e.height/2-h/2,width:Math.max(1,w),height:Math.max(1,h)};}
const combined=es=>{const bs=es.map(elementBox),x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));return {x,y,width:Math.max(...bs.map(b=>b.x+b.width))-x,height:Math.max(...bs.map(b=>b.y+b.height))-y};};
export function exportRegions(elements,mode='rows'){
 const regions=[],claimed=new Set(),byId=new Map(elements.map(e=>[e.id,e]));
 const rootFrame=e=>{const seen=new Set();while(e.frameId&&byId.has(e.frameId)&&!seen.has(e.id)){seen.add(e.id);e=byId.get(e.frameId);}return e;};
 for(const frame of elements.filter(e=>e.type==='frame'&&!e.frameId)){
  const box=elementBox(frame),members=elements.filter(e=>rootFrame(e).id===frame.id||e.x>=box.x&&e.y>=box.y&&e.x+e.width<=box.x+box.width&&e.y+e.height<=box.y+box.height);
  members.forEach(e=>claimed.add(e.id));regions.push({box,elements:members.filter(e=>e.id!==frame.id)});
 }
 const groups=new Map();for(const e of elements){if(claimed.has(e.id)||!e.groupIds?.length)continue;const id=e.groupIds.at(-1);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(e);}
 for(const members of groups.values()){members.forEach(e=>claimed.add(e.id));regions.push({box:combined(members),elements:members});}
 for(const source of elements.filter(e=>e.customData?.icnPdf&&!claimed.has(e.id))){const box=elementBox(source);regions.push({box,source});claimed.add(source.id);for(const e of elements)if(e.customData?.icnPdfPageId===source.id||!e.customData?.icnPdf&&e.x>=box.x&&e.y>=box.y&&e.x+e.width<=box.x+box.width&&e.y+e.height<=box.y+box.height)claimed.add(e.id);}
 const loose=elements.filter(e=>!claimed.has(e.id));if(loose.length)regions.push({box:combined(loose),elements:loose});
 if(!regions.length)throw Error('画布中没有可导出的内容。');
 const axis=mode==='columns'?'x':'y',other=mode==='columns'?'y':'x',size=mode==='columns'?'width':'height';
 const bands=[];for(const region of regions.sort((a,b)=>a.box[axis]-b.box[axis])){let band=bands.at(-1);if(!band||Math.abs(band[0].box[axis]-region.box[axis])>Math.min(band[0].box[size],region.box[size])*.25){band=[];bands.push(band);}band.push(region);}
 return bands.flatMap(band=>band.sort((a,b)=>a.box[other]-b.box[other]));
}
