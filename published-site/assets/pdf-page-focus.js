// Visibility changes carry their recovery state in the scene, so a reload cannot
// leave unrelated objects permanently hidden.
import { canvasBusy } from './canvas-activity.js';
export function createPdfPageFocus(apiRef, getLayers, revise, capture, changed) {
  let session=null,applying=false;
  const clean=(e)=>{const saved=e.customData?.icnPdfSolo;if(!saved)return e;const customData={...e.customData};delete customData.icnPdfSolo;
    if(saved.layerStyle)customData.infiniteLayerStyle=saved.layerStyle;else delete customData.infiniteLayerStyle;
    return revise(e,{opacity:saved.opacity,locked:saved.locked,customData});};
  const recover=()=>{const api=apiRef.current;if(!api||session||applying)return;const all=api.getSceneElementsIncludingDeleted();if(!all.some(e=>e.customData?.icnPdfSolo))return;applying=true;try{api.updateScene({elements:all.map(clean),captureUpdate:capture.NEVER});}finally{applying=false;}};
  function sync(){
    const api=apiRef.current;if(!api||applying||canvasBusy())return;if(!session)return;
    const all=api.getSceneElementsIncludingDeleted();if(!all.some(e=>e.id===session.page.id&&!e.isDeleted)){exit();return;}
    let dirty=false;
    const elements=all.map(e=>{
      if(e.isDeleted)return e;
      const owned=e.id===session.page.id||e.customData?.icnPdfPageId===session.page.id;
      if(!owned&&!session.known.has(e.id)){
        dirty=true;
        return revise(e,{customData:{...e.customData,icnPdfPageId:session.page.id,infiniteLayer:session.layer}});
      }
      if(owned&&e.id!==session.page.id){
        if(e.customData.infiniteLayer===session.layer)return e;
        dirty=true;return revise(e,{customData:{...e.customData,infiniteLayer:session.layer}});
      }
      const hide=!owned;
      if(e.customData?.icnPdfSolo&&e.locked&&(hide?e.opacity===0:true))return e;
      dirty=true;
      const saved=e.customData?.icnPdfSolo||{opacity:e.opacity,locked:e.locked,layerStyle:e.customData?.infiniteLayerStyle||null};
      return revise(e,{opacity:hide?0:e.opacity,locked:true,customData:{...e.customData,icnPdfSolo:saved,
        infiniteLayerStyle:{opacity:hide?0:e.opacity,locked:true,shownOpacity:hide?0:e.opacity,shownLocked:true}}});
    });
    if(dirty){applying=true;try{api.updateScene({elements,captureUpdate:capture.NEVER});}finally{applying=false;}}
  }
  function exit(){
    const api=apiRef.current;if(!session||!api)return;const saved=session;session=null;applying=true;
    try{api.updateScene({elements:api.getSceneElementsIncludingDeleted().map(clean),appState:{selectedElementIds:{},scrollX:saved.viewport.scrollX,scrollY:saved.viewport.scrollY,zoom:saved.viewport.zoom},captureUpdate:capture.NEVER});
      const layers=getLayers();if(layers.state.current.items.some(l=>l.id===saved.active&&!l.archived))layers.select(saved.active);
    }finally{applying=false;changed(null);}
  }
  function enter(page){
    exit();recover();const api=apiRef.current,layers=getLayers(),state=api.getAppState();
    const active=layers.state.current.active;
    let layer=layers.state.current.items.find(l=>l.pdfPageId===page.id&&!l.archived);
    if(!layer){layers.add(false);layer=layers.state.current.items.find(l=>l.id===layers.state.current.active);layers.patch(layer.id,{name:`PDF 第 ${page.customData.icnPdf.page} 页 · 批注`,pdfPageId:page.id});}
    else {layers.patch(layer.id,{visible:true,locked:false});layers.select(layer.id);}
    session={page,layer:layer.id,active,known:new Set(api.getSceneElementsIncludingDeleted().map(e=>e.id)),viewport:{scrollX:state.scrollX,scrollY:state.scrollY,zoom:state.zoom}};
    sync();api.updateScene({appState:{selectedElementIds:{}},captureUpdate:capture.NEVER});api.setActiveTool({type:'selection'});api.scrollToContent([page],{fitToViewport:true,animate:false});changed({id:page.id,number:page.customData.icnPdf.page});
  }
  return {enter,exit,sync,recover,get active(){return session;}};
}
