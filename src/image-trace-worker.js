import { cleanPaths } from './trace-cleanup.js';
self.onmessage=({data})=>{try{
 const {pixels,width:w,height:h,threshold,edge,tolerance,pathsInput,...settings}=data;
 if(pathsInput){self.postMessage(cleanPaths(pathsInput,{...settings,tolerance}));return;}
 const gray=new Uint8Array(w*h);for(let i=0;i<gray.length;i++){const a=pixels[i*4+3]/255;gray[i]=(pixels[i*4]*.2126+pixels[i*4+1]*.7152+pixels[i*4+2]*.0722)*a+255*(1-a);}
 const bits=new Uint8Array(w*h);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(edge){const gx=-gray[i-w-1]+gray[i-w+1]-2*gray[i-1]+2*gray[i+1]-gray[i+w-1]+gray[i+w+1],gy=-gray[i-w-1]-2*gray[i-w]-gray[i-w+1]+gray[i+w-1]+2*gray[i+w]+gray[i+w+1];bits[i]=Math.hypot(gx,gy)>threshold?1:0;}else bits[i]=gray[i]<threshold?1:0;}
 const shifts=[-w,-w+1,1,w+1,w,w-1,-1,-w-1];
 for(let round=0;round<160;round++){let changed=0;for(let pass=0;pass<2;pass++){const remove=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!bits[i])continue;const p=shifts.map(d=>bits[i+d]),sum=p.reduce((a,b)=>a+b,0);if(sum<2||sum>6)continue;let transitions=0;for(let j=0;j<8;j++)if(!p[j]&&p[(j+1)%8])transitions++;if(transitions!==1)continue;if(pass===0?(p[0]*p[2]*p[4]||p[2]*p[4]*p[6]):(p[0]*p[2]*p[6]||p[0]*p[4]*p[6]))continue;remove.push(i);}for(const i of remove)bits[i]=0;changed+=remove.length;}if(!changed)break;}
 const used=new Uint8Array(w*h),paths=[];
 const neighbors=i=>{const ns=[];for(let j=0;j<8;j++){const q=i+shifts[j];if(!bits[q])continue;if(j%2&&((bits[i+shifts[(j+7)%8]])||(bits[i+shifts[(j+1)%8]])))continue;ns.push([q,j]);}return ns;};
 function trace(start,next,direction){const ps=[[start%w,Math.floor(start/w)]];let a=start,b=next,j=direction;for(let count=0;count<w*h;count++){used[a]|=1<<j;used[b]|=1<<((j+4)%8);ps.push([b%w,Math.floor(b/w)]);const ns=neighbors(b);if(b===start||ns.length!==2)break;const step=ns.find(([q,d])=>q!==a&&!(used[b]&(1<<d)));if(!step)break;a=b;[b,j]=step;}if(ps.length>=2)paths.push(ps);}
 for(let i=w;i<bits.length-w;i++){if(!bits[i])continue;const ns=neighbors(i);if(ns.length!==2)for(const [q,j] of ns)if(!(used[i]&(1<<j)))trace(i,q,j);if(paths.length>12000)throw Error('线条过多，请提高简化程度或先裁剪图片。');}
 for(let i=w;i<bits.length-w;i++)if(bits[i])for(const [q,j] of neighbors(i))if(!(used[i]&(1<<j)))trace(i,q,j);
 if(paths.length>12000)throw Error('线条过多，请裁剪图片后重试。');self.postMessage(cleanPaths(paths,{...settings,tolerance}));
}catch(e){self.postMessage({error:e.message});}};
