import Drawing from './export-dxf-writer.js';
// Explicit block-record ownership also makes the document compatible with
// converters that initialize a reserved model-space handle.
function normalizeDxf(text){
 const lines=text.trimEnd().split(/\r?\n/),objects=[];
 for(let i=0;i<lines.length;i+=2){const pair=[Number(lines[i]),lines[i+1]];if(pair[0]===0||!objects.length)objects.push([]);objects.at(-1).push(pair);}
 const get=(o,k)=>o.find(p=>p[0]===k)?.[1],records=new Map(objects.filter(o=>get(o,0)==='BLOCK_RECORD').map(o=>[get(o,2),get(o,5)])),model=records.get('*Model_Space');
 let section='',block='';for(const object of objects){const type=get(object,0);if(type==='SECTION')section=get(object,2);
  if(section==='BLOCKS'){if(type==='BLOCK')block=get(object,2);if(['BLOCK','ENDBLK'].includes(type)){const owner=object.find(p=>p[0]===330);if(owner)owner[1]=records.get(block);}}
  if(section==='ENTITIES'&&type!=='ENDSEC'){const owner=object.find(p=>p[0]===330);if(owner)owner[1]=model;}
  for(const p of object)if([5,105,330,350,360,340].includes(p[0])&&p[1]&&p[1]!=='0')p[1]=p[1]===model?'1F':(parseInt(p[1],16)+4096).toString(16).toUpperCase();
 }
 return objects.flat().flat().join('\r\n')+'\r\n';
}
export function svgToDxf(svg,scale,quality=2){
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none';host.append(svg);document.body.append(host);
 const drawing=new Drawing();drawing.setUnits('Millimeters');
 try{const inverse=svg.getCTM()?.inverse();for(const shape of svg.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon')){
  if(shape.closest('defs,clipPath,mask')||!shape.getTotalLength||!shape.getCTM())continue;
  const original=shape.getAttribute('d'),pieces=original?.match(/M[^M]*/g)||[null];
  const matrix=inverse?inverse.multiply(shape.getCTM()):shape.getCTM();
  for(const piece of pieces){if(piece)shape.setAttribute('d',piece);const length=shape.getTotalLength();if(!length)continue;const n=Math.min(8192,Math.max(2,Math.ceil(length*quality/2))),points=[];
   for(let i=0;i<=n;i++){const p=shape.getPointAtLength(length*i/n),q=new DOMPoint(p.x,p.y).matrixTransform(matrix);points.push([q.x*scale,-q.y*scale]);}
   drawing.drawPolyline(points,/z\s*$/i.test(piece||''));
  }if(original)shape.setAttribute('d',original);
 }for(const text of svg.querySelectorAll('text')){const m=text.getCTM();if(!m)continue;const matrix=inverse?inverse.multiply(m):m,p=new DOMPoint(Number(text.getAttribute('x')||0),Number(text.getAttribute('y')||0)).matrixTransform(matrix);drawing.drawText(p.x*scale,-p.y*scale,Number(text.getAttribute('font-size')||20)*scale,0,text.textContent.replace(/[\r\n]/g,' '));}
 return normalizeDxf(drawing.toDxfString());}finally{host.remove();}
}
