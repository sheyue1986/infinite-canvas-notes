import clipping from './polygon-clipping.js';
import {elementPolygons} from './boolean-geometry.js';

export function cutterPolygon(a,b,r){
  const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);r=Math.max(.001,r);
  const ring=[];
  for(let i=0;i<=16;i++){const t=angle-Math.PI/2+i*Math.PI/16;ring.push([b[0]+r*Math.cos(t),b[1]+r*Math.sin(t)]);}
  for(let i=0;i<=16;i++){const t=angle+Math.PI/2+i*Math.PI/16;ring.push([a[0]+r*Math.cos(t),a[1]+r*Math.sin(t)]);}
  ring.push(ring[0]);return [ring];
}
export function cutFilled(e,path,r){
  const original=elementPolygons({...e,locked:false});if(!original)return null;
  const cuts=path.slice(1).map((p,i)=>cutterPolygon(path[i],p,r));if(!cuts.length)cuts.push(cutterPolygon(path[0],path[0],r));
  const cutter=clipping.union(...cuts);
  if(!clipping.intersection(original,cutter).length)return null;
  return clipping.difference(original,cutter);
}
export function polygonElement(e,polygon,convert){
  const pts=polygon.flat(),x=Math.min(...pts.map(p=>p[0])),y=Math.min(...pts.map(p=>p[1]));
  const width=Math.max(...pts.map(p=>p[0]))-x,height=Math.max(...pts.map(p=>p[1]))-y;
  const [base]=convert([{type:'rectangle',x,y,width,height}]);
  const customData={...e.customData};delete customData.icnBasicShape;delete customData.precisionMeasure;
  customData.icnBoolean={version:1,polygons:[polygon.map(ring=>ring.map(p=>[(p[0]-x)/width,(p[1]-y)/height]))]};customData.icnSlice=true;
  return {...base,strokeColor:e.strokeColor,strokeWidth:e.strokeWidth,strokeStyle:e.strokeStyle,backgroundColor:e.backgroundColor,
    fillStyle:e.fillStyle,opacity:e.opacity,roughness:e.roughness,roundness:null,frameId:e.frameId,groupIds:e.groupIds,locked:e.locked,customData};
}

export function simplify(points,tolerance=1){
  if(points.length<=2)return points;
  const [a,b]=[points[0],points.at(-1)],dx=b[0]-a[0],dy=b[1]-a[1];let max=0,at=0;
  for(let i=1;i<points.length-1;i++){const p=points[i],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);if(d>max){max=d;at=i;}}
  return max>tolerance?[...simplify(points.slice(0,at+1),tolerance).slice(0,-1),...simplify(points.slice(at),tolerance)]:[a,b];
}
// Directed cell edges preserve separate islands and interior holes.
export function maskContours(mask,tolerance=.8){
  const on=(x,y)=>x>=0&&y>=0&&x<mask.w&&y<mask.h&&mask.rows[y]?.[x]==='1';
  const edges=new Map();const add=(a,b)=>{const key=a.join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(b);};
  for(let y=0;y<mask.h;y++)for(let x=0;x<mask.w;x++)if(on(x,y)){
    if(!on(x,y-1))add([x,y],[x+1,y]);if(!on(x+1,y))add([x+1,y],[x+1,y+1]);
    if(!on(x,y+1))add([x+1,y+1],[x,y+1]);if(!on(x-1,y))add([x,y+1],[x,y]);
  }
  const contours=[];
  while(edges.size){const start=edges.keys().next().value,first=start.split(',').map(Number),ring=[first];let key=start;
    do{const ends=edges.get(key);if(!ends)break;const p=ends.pop();if(!ends.length)edges.delete(key);ring.push(p);key=p.join(',');}while(key!==start);
    if(ring.length>4){const half=Math.floor(ring.length/2),a=simplify(ring.slice(0,half+1),tolerance),b=simplify(ring.slice(half),tolerance);contours.push([...a.slice(0,-1),...b]);}
  }return contours;
}
export function connectedPixels(data,w,h){
  const seen=new Uint8Array(w*h),components=[];
  for(let seed=0;seed<w*h;seed++)if(!seen[seed]&&data[seed*4+3]>4){
    const queue=[seed];seen[seed]=1;let left=w,top=h,right=0,bottom=0;
    for(let i=0;i<queue.length;i++){const n=queue[i],x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const k of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(k>=0&&!seen[k]&&data[k*4+3]>4){seen[k]=1;queue.push(k);}
    }
    components.push({pixels:queue,left,top,right,bottom});
  }return components;
}
