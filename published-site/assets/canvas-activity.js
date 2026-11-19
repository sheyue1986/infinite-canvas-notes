let drawing=false;
window.addEventListener('pointerdown',e=>{if(e.button===0&&e.target.closest?.('canvas.interactive'))drawing=true;},true);
window.addEventListener('pointerup',()=>{drawing=false;},true);
window.addEventListener('pointercancel',()=>{drawing=false;},true);
window.addEventListener('blur',()=>{drawing=false;});
export const canvasBusy=()=>drawing;
