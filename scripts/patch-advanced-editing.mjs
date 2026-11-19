import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../published-site/assets/index-icn-selection-r15.js',import.meta.url);
let text=await readFile(file,'utf8');
function replace(before,after){if(text.includes(after))return;if(text.split(before).length!==2)throw Error('Patch target not unique: '+before);text=text.replace(before,after);}
if(!text.includes('import { imageHit }'))text='import { imageHit } from "./advanced-editing.js";\n'+text;
if(!text.includes('import { applyCutoutBrushChanges }'))text='import { applyCutoutBrushChanges } from "./cutout-styles.js";\n'+text;
if(!text.includes('import { openCopicPicker }'))text='import { openCopicPicker } from "./copic-picker.js";\n'+text;
replace('f=o?l:s.mode,[p,m]', 'f=l,[p,m]');
replace('o?u(e):c(t=>({...t,mode:e}))', 'u(e),c(t=>({...t,mode:e}))');
const nativeColorStart='YR=({type:e,color:t,onChange:n,label:r,elements:i,palette:a=ks,topPicks:o,updateData:s,appState:c})=>';
const nativeColorEnd=',XR=({icon:e})=>';
if(!text.includes('data-icn-copic-native')){
  const start=text.indexOf(nativeColorStart),end=text.indexOf(nativeColorEnd,start);
  if(start<0||end<start)throw Error('Native color picker target missing');
  text=text.slice(0,start)+nativeColorStart+'(0,I.jsx)(`div`,{className:`color-picker-container`,children:(0,I.jsx)(`button`,{type:`button`,"data-icn-copic-native":e,"aria-label":r+` COPIC 色环`,style:{border:`1px solid #ccc`,borderRadius:6,padding:`5px 9px`,background:t&&t!==`transparent`?t:`#fff`,color:`#222`,boxShadow:`inset 0 0 0 3px #fff`},onClick:a=>openCopicPicker({title:r,value:t,allowTransparent:e!==`elementStroke`,anchor:a.currentTarget,choose:n}),children:`◉ COPIC`})})'+text.slice(end);
}
text=text.replace('applyCutoutBrushChanges(i,n,yE,aq,X.IMMEDIATELY)', 'applyCutoutBrushChanges(i,n,yE,aq,X.IMMEDIATELY,r)');
replace('se=(n,r)=>{let i=e.current,o=x.current.style;',
  'se=(n,r)=>{let i=e.current,o=x.current.style;if(applyCutoutBrushChanges(i,n,yE,aq,X.IMMEDIATELY,r))return true;');
replace('e.type===`image`?FZ(e)?.color??e.customData?.infiniteBrush?.color??null',
  'e.type===`image`?e.customData?.icnCutout?(e.customData?.icnEdgeStyle?.strokeColor??`#1b1b1f`):FZ(e)?.color??e.customData?.infiniteBrush?.color??null');
text=text.replace('createSelectionProperties(d,Ok.createPortal,yE,aq,X,mT)', 'createSelectionProperties(d,Ok.createPortal,yE,aq,X,mT,MQ)');
replace('createSelectionProperties(d,Ok.createPortal,yE,aq,X)','createSelectionProperties(d,Ok.createPortal,yE,aq,X,mT,MQ)');
replace('Ig=({x:e,y:t,element:n,shape:r,threshold:i=10,frameNameBound:a=null})=>{let o=',
  'Ig=({x:e,y:t,element:n,shape:r,threshold:i=10,frameNameBound:a=null})=>{if(n.type===`image`&&!imageHit(n,e,t))return false;let o=');
replace('{id:`eraser`,name:`对象橡皮`,en:`Eraser`,type:`eraser`,mark:`eraser`}',
  '{id:`eraser`,name:`对象橡皮`,en:`Eraser`,type:`eraser`,mark:`eraser`},{id:`slice`,name:`切割`,en:`Slice`,type:`slice`,mark:`eraser`,width:24},{id:`softErase`,name:`软橡皮擦`,en:`Soft eraser`,type:`softErase`,mark:`eraser`,width:24}');
replace('c$=[`partial`,`wand`,`nudge`,`bucket`,`zoom`,`lasso`,`stickyNote`]',
  'c$=[`slice`,`softErase`,`partial`,`wand`,`nudge`,`bucket`,`zoom`,`lasso`,`stickyNote`]');
replace('UQ(`fixed`,`固定宽度`,`Fixed width`','UQ(`fixed`,`等线笔`,`Monoline`');
// Reserve B for the requested brush cycle. Fill remains available on the wheel.
replace('[`b`,`bucket`]','[`b`,`pen`]');
await writeFile(file,text);
