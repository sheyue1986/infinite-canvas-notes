import { maskContours } from './erase-geometry.js';

export const isCutout = e => e.type === 'image' && !!e.customData?.icnCutout;
const fields=['strokeColor','strokeWidth','strokeStyle','roughness'];
export function edgeStyle(api,image){
  const line=api.getSceneElements().find(e=>e.customData?.icnEdgeSource===image.id);
  return Object.fromEntries(fields.map(field=>[field,line?.[field]??image.customData?.icnEdgeStyle?.[field]??
    ({strokeColor:'#1b1b1f',strokeWidth:1.5,strokeStyle:'solid',roughness:1})[field]]));
}
export function applyCutoutStyle(api,selected,values,revise,convert,capture){
  if(api.getAppState().viewModeEnabled)return false;
  const live=new Map(api.getSceneElements().map(e=>[e.id,e]));
  const images=selected.map(e=>live.get(e.id)).filter(e=>e&&isCutout(e)&&!e.locked&&!e.isDeleted);if(!images.length)return false;
  const ids=new Set(images.map(e=>e.id)),all=api.getSceneElementsIncludingDeleted(),updates=new Map(),added=[];
  for(const image of images){
    const style={...edgeStyle(api,image),...values},mask=image.customData.icnCutout;
    const existing=all.filter(e=>!e.isDeleted&&e.customData?.icnEdgeSource===image.id);
    const group=image.customData.icnEdgeGroup||crypto.randomUUID(),groups=[...new Set([...image.groupIds,group])];
    updates.set(image.id,revise(image,{groupIds:groups,customData:{...image.customData,icnEdgeStyle:style,icnEdgeGroup:group}}));
    if(existing.length){for(const line of existing)if(!line.locked)updates.set(line.id,revise(line,values));continue;}
    for(const ring of maskContours(mask,.8)){
      if(ring.length<4)continue;
      const c=Math.cos(image.angle||0),s=Math.sin(image.angle||0);
      const pts=ring.map(([u,v])=>{
        const x=(image.scale?.[0]<0?mask.w-u:u)*image.width/mask.w-image.width/2;
        const y=(image.scale?.[1]<0?mask.h-v:v)*image.height/mask.h-image.height/2;
        return [image.x+image.width/2+x*c-y*s,image.y+image.height/2+x*s+y*c];
      });
      const [line]=convert([{type:'line',x:pts[0][0],y:pts[0][1],points:pts.map(p=>[p[0]-pts[0][0],p[1]-pts[0][1]]),
        ...style,backgroundColor:'transparent',roundness:null}]);
      added.push({...line,groupIds:groups,frameId:image.frameId,opacity:image.opacity,customData:{infiniteLayer:image.customData?.infiniteLayer,icnEdgeSource:image.id}});
    }
  }
  // Mixed image/outline selection still edits ordinary selected vectors normally.
  const selectedIds=new Set(selected.map(e=>e.id));
  const elements=all.flatMap(e=>{
    let next=updates.get(e.id)||e;
    if(!updates.has(e.id)&&selectedIds.has(e.id)&&!e.locked&&!e.isDeleted&&!isCutout(e)&&['line','freedraw','rectangle','diamond','ellipse','arrow','text'].includes(e.type))next=revise(e,values);
    return ids.has(e.id)?[next,...added.filter(line=>line.customData.icnEdgeSource===e.id)]:[next];
  });
  api.updateScene({elements,captureUpdate:capture});return true;
}
export function applyCutoutBrushChanges(api,values,revise,convert,capture,expected){
  const map={color:'strokeColor',width:'strokeWidth',strokeStyle:'strokeStyle'};
  if(!api||!Object.keys(values).length||Object.keys(values).some(key=>!map[key]))return false;
  const selected=api.getSceneElements().filter(e=>api.getAppState().selectedElementIds[e.id]);
  if(expected?.selectionKey&&selected.map(e=>e.id).sort().join('|')!==expected.selectionKey)return false;
  return applyCutoutStyle(api,selected,Object.fromEntries(Object.entries(values).map(([key,value])=>[map[key],value])),revise,convert,capture);
}
