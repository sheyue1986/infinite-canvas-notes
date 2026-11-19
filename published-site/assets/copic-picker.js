const channel='icn:open-copic-picker';
export function openCopicPicker(options){window.dispatchEvent(new CustomEvent(channel,{detail:options}));}
export function createCopicPicker(React,portal,ColorFan){
  const {createElement:h,useState,useEffect,useRef}=React;
  return function CopicPicker(){
    const [request,setRequest]=useState(null),[color,setColor]=useState('#1b1b1f'),[state,set]=useState({mode:'spectrum'}),[details,setDetails]=useState(false),[message,setMessage]=useState('');
    const [position,setPosition]=useState({left:17,top:62,scale:1});
    const root=useRef(null),current=useRef(null),suspendedDialog=useRef(null);
    const close=()=>{setRequest(null);current.current=null;const dialog=suspendedDialog.current;suspendedDialog.current=null;if(dialog?.isConnected&&!dialog.open)dialog.showModal();};
    useEffect(()=>{
      const open=e=>{const options=e.detail;
        const dialog=options.anchor?.closest?.('dialog[open]');if(dialog){suspendedDialog.current=dialog;dialog.close();}
        current.current=options;setRequest(options);setColor(/^#[\da-f]{6}/i.test(options.value||'')?options.value.slice(0,7):'#1b1b1f');set({mode:'spectrum'});setDetails(false);setMessage('');};
      // Also cover native color inputs in settings and extension panels.
      const native=e=>{const input=e.target.closest?.('input[type=color]');if(!input||e.target.closest('.icn-copic-overlay'))return;
        e.preventDefault();e.stopImmediatePropagation();
        open({detail:{value:input.value,title:input.getAttribute('aria-label')||input.closest('label')?.textContent?.trim()||'颜色',anchor:input,
          choose:value=>{if(!input.isConnected)return;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
            input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}}});
      };
      const key=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('input[type=color]'))native(e);};
      const outside=e=>{if(!current.current||e.target.closest?.('.icn-copic-overlay')||e.target===current.current.anchor)return;close();};
      window.addEventListener(channel,open);window.addEventListener('click',native,true);window.addEventListener('keydown',key,true);
      window.addEventListener('pointerdown',outside,true);
      return()=>{window.removeEventListener(channel,open);window.removeEventListener('click',native,true);window.removeEventListener('keydown',key,true);window.removeEventListener('pointerdown',outside,true);};
    },[]);
    useEffect(()=>{
      if(!request)return;
      let frame,previous='';
      const track=()=>{
        const wheel=document.querySelector('.brush-wheel'),core=document.querySelector('.brush-core'),box=(wheel||core)?.getBoundingClientRect();
        const cx=box?box.left+box.width/2:116,cy=box?box.top+box.height/2:161;
        const scale=Math.max(.3,Math.min(wheel?box.width/198:1,(window.innerWidth-cx-12)/445,(window.innerHeight-cy-12)/455));
        const next={left:cx-99*scale,top:cy-99*scale,scale},key=JSON.stringify(next);
        if(key!==previous){previous=key;setPosition(next);}frame=requestAnimationFrame(track);
      };track();return()=>cancelAnimationFrame(frame);
    },[request]);
    useEffect(()=>{if(request)root.current?.focus();},[request]);
    if(!request)return null;
    const choose=value=>{setColor(value);current.current?.choose(value);};
    return portal(h('div',{className:'icn-copic-overlay',ref:root,tabIndex:-1,role:'group','aria-label':`${request.title||'颜色'} · COPIC 色环`,
      onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}},
      style:{position:'fixed',left:position.left,top:position.top,width:500,height:500,transform:`scale(${position.scale})`,transformOrigin:'top left',zIndex:2147483000,pointerEvents:'none',outline:'none'}},
      h('style',null,'.icn-copic-overlay .studio-color-fan{position:absolute;left:0;top:0;width:500px;height:500px;transform:none}.icn-copic-overlay button,.icn-copic-overlay input{pointer-events:auto}.icn-copic-overlay .icn-copic-extras{position:absolute;left:8px;top:278px;font:12px Excalifont,Virgil,sans-serif}.icn-copic-extras button,.icn-copic-extras label{background:#fafbf9;border:0;border-radius:4px;padding:4px 6px;box-shadow:0 1px 4px #1c242015}.icn-copic-overlay input{max-width:110px}body:has(.icn-copic-overlay) .brush-kit .studio-color-fan,body:has(.icn-copic-overlay) .brush-kit .brush-actions{visibility:hidden}'),
      h(ColorFan,{colors:{state,set},color:color==='transparent'?'#ffffff':color,choose,close,openPalettes:()=>setDetails(v=>!v),
        sample:async()=>{if(!window.EyeDropper){setMessage('当前环境暂不支持屏幕吸色，请在色环中选择。');return;}try{const result=await new window.EyeDropper().open();choose(result.sRGBHex);}catch{} }}),
      h('div',{className:'icn-copic-extras'},
        request.allowTransparent&&h('button',{type:'button',onClick:()=>choose('transparent')},'透明 / 无填充'),
        details&&h('label',null,'HEX ',h('input',{'aria-label':'HEX 色值',value:color,onChange:e=>{if(/^#[\da-f]{6}$/i.test(e.target.value))choose(e.target.value);}})),
        message&&h('p',{role:'status'},message))),document.body);
  };
}
