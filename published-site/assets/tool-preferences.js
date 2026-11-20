const key='icn-tool-properties-v1';
const fields={strokeColor:'currentItemStrokeColor',backgroundColor:'currentItemBackgroundColor',strokeWidth:'currentItemStrokeWidth',strokeStyle:'currentItemStrokeStyle',fillStyle:'currentItemFillStyle',roughness:'currentItemRoughness',opacity:'currentItemOpacity',roundness:'currentItemRoundness',arrowType:'currentItemArrowType',startArrowhead:'currentItemStartArrowhead',endArrowhead:'currentItemEndArrowhead',fontSize:'currentItemFontSize',fontFamily:'currentItemFontFamily',textAlign:'currentItemTextAlign'};
const supported=new Set(['rectangle','ellipse','diamond','line','arrow','freedraw','text','image']);
const typeFields=type=>type==='text'?['strokeColor','opacity','fontSize','fontFamily','textAlign']:type==='image'?['opacity']:type==='freedraw'?['strokeColor','strokeWidth','strokeStyle','opacity']:['strokeColor','strokeWidth','strokeStyle','roughness','opacity',...(['rectangle','ellipse','diamond'].includes(type)?['backgroundColor','fillStyle']:[]),...(['rectangle','diamond','line'].includes(type)?['roundness']:[]),...(type==='arrow'?['arrowType','startArrowhead','endArrowhead']:type==='line'?['startArrowhead','endArrowhead']:[])];
export function createToolPreferences(){
 let saved={};try{saved=JSON.parse(localStorage.getItem(key))||{};}catch{}
 let active='',restoring=false;
 const toolKey=(s,kit)=>{const type=s.activeTool.type,id=kit?.pen?.type===type?kit.pen.id:null;return type+(id&&id!==type?':'+id:type==='freedraw'?':pen':'');};
 const read=s=>Object.fromEntries(typeFields(s.activeTool.type).map(k=>[k,s[fields[k]]]));
 const store=()=>{try{localStorage.setItem(key,JSON.stringify(saved));}catch{}};
 function remember(type,patch){
  const previous=saved[type]||{};
  if(Object.entries(patch).every(([field,value])=>Object.is(previous[field],value)))return false;
  saved[type]={...previous,...patch};return true;
 }
 function sync(api,kit){
  const s=api.getAppState(),type=s.activeTool.type;if(!supported.has(type)){active='';return;}
  const next=toolKey(s,kit);
  if(next!==active){active=next;const values=saved[next];if(values){restoring=true;queueMicrotask(()=>{if(toolKey(api.getAppState(),kit)!==next){restoring=false;return;}api.updateScene({appState:Object.fromEntries(Object.entries(values).filter(([k])=>typeFields(type).includes(k)).map(([k,v])=>[fields[k],v]))});restoring=false;});}else if(remember(next,read(s)))store();}
  else if(!restoring&&!Object.values(s.selectedElementIds).some(Boolean)){const values=read(s);if(remember(next,values))store();}
 }
 function set(api,kit,field,value){const s=api.getAppState();if(remember(toolKey(s,kit),{[field]:value}))store();const map={strokeWidth:'width',strokeColor:'color',strokeStyle:'strokeStyle',opacity:'opacity'};if(map[field])kit.setMany({[map[field]]:value});api.updateScene({appState:{[fields[field]]:value}});}
 function rememberSelected(elements,field,value){let changed=false;for(const e of elements){if(!supported.has(e.type)||!fields[field])continue;const id=e.customData?.icnBasicShape?.kind||(e.type==='freedraw'?(e.customData?.infiniteBrush?.id||'pen'):null);changed=remember(e.type+(id&&id!==e.type?':'+id:''),{[field]:value})||changed;}if(changed)store();}
 function virtual(api,kit){const s=api.getAppState();if(!supported.has(s.activeTool.type)||kit?.active&&['bucket','nudge','wand','partial','zoom','lasso'].includes(kit.active.type))return null;
  const values=read(s);return {id:'tool:'+toolKey(s,kit),type:s.activeTool.type,...values,roundness:values.roundness==='round'?{type:3}:null,elbowed:values.arrowType==='elbow',points:[[0,0],[10,10]],width:10,height:10,x:0,y:0};}
 return {sync,set,rememberSelected,virtual};
}
