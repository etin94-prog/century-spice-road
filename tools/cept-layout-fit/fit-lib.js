// Runs in the page (see fit.cjs). Lays a stage's tile grid over the tiles painted in its 600x400 picture.
// hints: {tile: [x, y]} places that tile at a picture pixel; [x, y, 1] also pins its whole island there.
// m.grid holds the layout's own grid steps and m.size optionally the tile's half width in pixels.
// A painted tile is a 2:1 diamond: a coloured face inside a black frame.
async function fitStage(m,hints={}){
  const img=new Image();img.src='art/cept-maps/'+m.image+'.webp';await img.decode();
  const W=600,H=400,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,W,H);
  const p=g.getImageData(0,0,W,H).data,cls=new Uint8Array(W*H),dark=new Uint8Array(W*H);
  for(let i=0,j=0;i<p.length;i+=4,j++){
    const r=p[i]/255,gg=p[i+1]/255,b=p[i+2]/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),v=mx,sat=mx?(mx-mn)/mx:0;
    let h=0;if(mx>mn){h=mx===r?((gg-b)/(mx-mn))%6:mx===gg?(b-r)/(mx-mn)+2:(r-gg)/(mx-mn)+4;h*=60;if(h<0)h+=360;}
    if(v<.17)dark[j]=1;
    if(v<.13)cls[j]=5;
    else if(sat>.5&&(h<24||h>343)&&v>.3)cls[j]=1;
    else if(sat>.35&&h>200&&h<258&&v>.28)cls[j]=2;
    else if(sat>.28&&h>90&&h<178&&v<.55)cls[j]=3;
    else if(sat>.4&&h>32&&h<60&&v>.38)cls[j]=4;
    else if(sat<.16&&v>.42&&v<.9)cls[j]=6;
  }
  // Coloured faces, as blobs.
  const blobs=[];
  for(const k of [1,2,3,4,6]){
    let mk=new Uint8Array(W*H);for(let j=0;j<W*H;j++)mk[j]=cls[j]===k?1:0;
    const morph=(src,grow)=>{const out=new Uint8Array(W*H);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const j=y*W+x;let any=0,all=1;for(const d of [0,-1,1,-W,W]){if(src[j+d])any=1;else all=0;}out[j]=grow?any:all;}return out;};
    mk=morph(morph(morph(morph(mk,1),1),0),0);
    const seen=new Uint8Array(W*H);
    for(let s=0;s<W*H;s++){
      if(!mk[s]||seen[s])continue;
      const stack=[s];seen[s]=1;let n=0,x0=W,x1=0,y0=H,y1=0;
      while(stack.length){const j=stack.pop(),x=j%W,y=(j-x)/W;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
        for(const d of [-1,1,-W,W]){const q=j+d;if(q>=0&&q<W*H&&mk[q]&&!seen[q]&&Math.abs((q%W)-x)<=1){seen[q]=1;stack.push(q);}}}
      const w=x1-x0+1,h=y1-y0+1;
      if(n<70||n>1500||w/h<1.2||w/h>2.7||n/(w*h)<.34||n/(w*h)>.74)continue;
      blobs.push({k,x:(x0+x1)/2,y:(y0+y1)/2,w,h});
    }
  }
  // The layout as whole steps on its own grid (m.grid): one road step changes u and v by one each.
  const N=m.position.length,kind=n=>typeof m.types[n]==='number'?m.types[n]+1:m.types[n]==='무속성'?6:0;
  const U=m.grid.map(q=>q[0]),V=m.grid.map(q=>q[1]);
  // Tile size and origin by voting: every tile and every face of its colour propose an origin.
  const vote=(tiles,sizes,pool)=>{const found=[];
    for(const s of sizes){
      const bins=new Map();
      for(const n of tiles){const k=kind(n);if(!k)continue;for(const b of pool){if(b.k!==k)continue;
        const key=Math.round((b.x-s*U[n])/2)+','+Math.round((b.y-s/2*V[n])/2);bins.set(key,(bins.get(key)||0)+1);}}
      for(const [key,count] of bins){if(count<2&&tiles.length>3)continue;const [a,b]=key.split(',').map(Number);let sum=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=bins.get((a+dx)+','+(b+dy))||0;
        found.push({votes:sum,s,ox:a*2,oy:b*2});}
    }
    found.sort((a,b)=>b.votes-a.votes);const out=[];
    for(const f of found){if(out.length>=14||f.votes<out[0]?.votes*.34)break;if(out.every(o=>o.s!==f.s||Math.hypot(o.ox-f.ox,(o.oy-f.oy)*2)>f.s*.7))out.push(f);}
    return out;};
  // m.size pins the tile's half width in pixels where the vote would settle on scenery.
  const sizes=[];if(m.size)sizes.push(m.size);else for(let s=15;s<=32;s+=.2)sizes.push(s);
  const all=[...Array(N).keys()],tops=vote(all,sizes,blobs),top=tops[0]||{votes:0};
  if(!top.votes){const h=m.half*6;return {cell:[h,h/2,h,h/2],votes:0,anchors:0,blobs:blobs.length,place:m.position.map(q=>[q[0]*6,q[1]*4]),fit:Array(N).fill(0),info:Array(N).fill([0,0,0]),kept:true};}
  // The vote is close between neighbouring tile sizes, so the few likeliest sizes are each fitted in full
  // and the one that puts most tiles on a painted tile is kept.
  const solve=top=>{
    const s=top.s,cell=[s,s/2,s,s/2];
    const face=[],ring=[];
    {const det=s*s,rx=Math.ceil(s)+1,ry=Math.ceil(s/2)+1;
      for(let v=-ry;v<=ry;v++)for(let u=-rx;u<=rx;u++){const a=(u*s/2+v*s)/det,b=(v*s-u*s/2)/det,k=2*Math.max(Math.abs(a),Math.abs(b));
        if(k<.54)face.push([u,v]);else if(k>=.68&&k<=.9)ring.push([u,v]);}}
    function score(x,y,k){
      x=Math.round(x);y=Math.round(y);let rd=0,rn=0,fd=0,fc=0,fn=0,fo=0;
      for(const [u,v] of ring){const X=x+u,Y=y+v;if(X<0||Y<0||X>=W||Y>=H)continue;rn++;rd+=dark[Y*W+X];}
      for(const [u,v] of face){const X=x+u,Y=y+v;if(X<0||Y<0||X>=W||Y>=H)continue;fn++;const j=Y*W+X;fd+=dark[j];if(k&&cls[j]===k)fc++;else if(cls[j]>=1&&cls[j]<=4&&cls[j]!==k)fo++;}
      if(rn<ring.length*.7||!fn)return {s:-9,ring:0,colour:0,faceDark:1,other:1};
      const rg=rd/rn,colour=fc/fn,faceDark=fd/fn;return {s:rg-.5*faceDark+(k?colour:0),ring:rg,colour,faceDark,other:fo/fn};
    }
    const best=(x,y,n,wx,wy)=>{let t=null;const k=kind(n);
      for(let oy=-Math.ceil(wy);oy<=wy;oy++)for(let ox=-Math.ceil(wx);ox<=wx;ox++){
        const r=score(x+ox,y+oy,k);r.s-=.012*Math.hypot(ox,oy*1.7);if(!t||r.s>t.s){t=r;t.x=x+ox;t.y=y+oy;}}
      return t;};
    const good=(r,n)=>{const k=kind(n);return k&&k<6?r.ring>=.5&&r.colour>=.5:r.ring>=.6&&r.faceDark<.45&&r.other<(k?.3:.45)||k===6&&r.ring>=.5&&r.colour>=.5;};
    const place=Array(N).fill(null),fit=Array(N).fill(0),info=Array(N).fill(null);
    const free=(x,y,n)=>place.every((q,o)=>!q||o===n||fit[o]<1||Math.hypot(q[0]-x,(q[1]-y)*2)>s*.62);
    const links=m.position.map(()=>[]);
    for(const [a,b] of m.edges)if(Math.abs(Math.abs(U[a]-U[b])-1)<.2&&Math.abs(Math.abs(V[a]-V[b])-1)<.2){links[a].push(b);links[b].push(a);}
    const guess=n=>{const from=links[n].filter(o=>place[o]&&fit[o]===2);if(!from.length)return null;
      let gx=0,gy=0;for(const o of from){gx+=place[o][0]+s*(U[n]-U[o]);gy+=place[o][1]+s/2*(V[n]-V[o]);}return [gx/from.length,gy/from.length,from.length];};
    const put=(n,r,f)=>{place[n]=[r.x,r.y];fit[n]=f;info[n]=r;};
    // Follow the roads. A change of height moves the next tile straight up or down in the picture.
    const grow=()=>{
    for(let guard=0;guard<400;guard++){
      let moved=0;
      for(let n=0;n<N;n++){if(place[n])continue;const q=guess(n);if(!q)continue;const r=best(q[0],q[1],n,s*.3,s*.18);if(good(r,n)&&free(r.x,r.y,n)){put(n,r,2);moved++;}}
      if(moved)continue;
      let pick=null;
      for(let n=0;n<N;n++){if(place[n])continue;const q=guess(n);if(!q)continue;
        for(let oy=4;oy<=s*2.6&&!(pick&&pick.d<=oy);oy++)for(const sign of [-1,1]){
          const r=best(q[0],q[1]+sign*oy,n,s*.14,1);if(good(r,n)&&free(r.x,r.y,n)&&(!pick||oy<pick.d)){pick={n,r,d:oy};}}}
      if(pick){put(pick.n,pick.r,2);continue;}
      let shift=null;const seen=new Set();
      for(let seed=0;seed<N;seed++){if(place[seed]||seen.has(seed))continue;const q=guess(seed);if(!q)continue;
        const pred=new Map([[seed,[q[0],q[1]]]]),run=[seed];
        for(let i=0;i<run.length&&run.length<16;i++)for(const o of links[run[i]])if(!place[o]&&!pred.has(o)){const a=pred.get(run[i]);pred.set(o,[a[0]+s*(U[o]-U[run[i]]),a[1]+s/2*(V[o]-V[run[i]])]);run.push(o);}
        run.forEach(n=>seen.add(n));const col=run.filter(kind);if(col.length<2)continue;
        for(let dy=-Math.round(s*2);dy<=s*2;dy+=2)for(let dx=-Math.round(s*2.6);dx<=s*2.6;dx+=2){let hits=0;
          for(const n of col){const a=pred.get(n),r=score(a[0]+dx,a[1]+dy,kind(n));if(good(r,n)&&free(a[0]+dx,a[1]+dy,n))hits++;}
          const cost=Math.hypot(dx,dy*2);
          if(hits>=2&&hits>=col.length*.5&&(!shift||hits>shift.hits||hits===shift.hits&&cost<shift.cost))shift={hits,cost,dx,dy,run,pred};}}
      if(shift){let done=0;for(const n of shift.run){const a=shift.pred.get(n),r=best(a[0]+shift.dx,a[1]+shift.dy,n,s*.2,s*.12);if(good(r,n)&&free(r.x,r.y,n)){put(n,r,2);done++;}}if(done)continue;}
      break;
    }
    };
    // 1. Each island of the board is voted into place on its own: the picture spaces the islands differently.
    const island=Array(N).fill(-1),islands=[];
    for(let n=0;n<N;n++){if(island[n]>=0)continue;const group=[n];island[n]=islands.length;
      for(let i=0;i<group.length;i++)for(const o of links[group[i]])if(island[o]<0){island[o]=islands.length;group.push(o);}
      islands.push(group);}
    const origin=islands.map(()=>[top.ox,top.oy]),lost=[];
    for(const n in hints){const r=best(hints[n][0],hints[n][1],+n,3,2);put(+n,good(r,+n)?r:{x:hints[n][0],y:hints[n][1],ring:1,colour:1,faceDark:0,other:0},2);}
    if(Object.keys(hints).length)grow();
    const real=blobs.filter(b=>{const r=score(b.x,b.y,b.k);return r.ring>=.5&&r.colour>=.5;}),span=(v)=>[Math.min(...v),Math.max(...v)+1e-6];
    const bx=span((real.length>3?real:blobs).map(b=>b.x)),by=span((real.length>3?real:blobs).map(b=>b.y)),box=[bx[0],by[0],bx[1],by[1]],ub=span(U),vb=span(V);
    [...islands.keys()].sort((a,b)=>islands[b].length-islands[a].length).forEach(i=>{
      const group=islands[i].filter(n=>!place[n]),coloured=group.filter(kind).length;if(!group.length)return;
      const pool=blobs.filter(b=>place.every(q=>!q||Math.hypot(q[0]-b.x,(q[1]-b.y)*2)>s*.6));
      // Of the likeliest origins, keep the one that puts most tiles on a painted tile.
      const found=n=>(o=>{const r=best(o[0]+s*U[n],o[1]+s/2*V[n],n,s*.3,s*.18);return good(r,n)&&free(r.x,r.y,n)?r:null;});
      let pick=null;const gu=group.reduce((a,n)=>a+U[n],0)/group.length,gv=group.reduce((a,n)=>a+V[n],0)/group.length;
      for(const t of vote(group,[s],pool)){const o=[t.ox,t.oy],hits=group.filter(n=>found(n)(o)).length;
        const far=Math.hypot((o[0]+s*gu-box[0])/(box[2]-box[0])-(gu-ub[0])/(ub[1]-ub[0]),(o[1]+s/2*gv-box[1])/(box[3]-box[1])-(gv-vb[0])/(vb[1]-vb[0]));
        const value=hits-Math.min(.9,far)*Math.max(1,hits*.2);if(!pick||value>pick.value)pick={o,hits,value};}
      const pin=islands[i].find(n=>hints[n]&&hints[n][2]);
      if(pin!=null)origin[i]=[hints[pin][0]-s*U[pin],hints[pin][1]-s/2*V[pin]];
      else if(pick&&pick.hits>=Math.max(2,coloured*.3))origin[i]=pick.o;
      else lost.push(i);
      for(const n of group){if(place[n])continue;const r=found(n)(origin[i]);if(r)put(n,r,2);}
    });
    const anchors=fit.filter(f=>f===2).length;
    grow();
    // 3. What is left has no painted tile of its own colour: keep it on the grid beside its neighbours.
    for(let guard=0;guard<N;guard++){let moved=0;
      for(let n=0;n<N;n++){if(place[n])continue;
        const from=links[n].filter(o=>place[o]);if(!from.length)continue;
        let gx=0,gy=0;for(const o of from){gx+=place[o][0]+s*(U[n]-U[o]);gy+=place[o][1]+s/2*(V[n]-V[o]);}gx/=from.length;gy/=from.length;
        const r=best(gx,gy,n,s*.25,s*.15),framed=r.ring>=.58&&r.faceDark<.5&&free(r.x,r.y,n);
        let rim=null;
        if(!framed)for(let oy=-Math.round(s*.9);oy<=s*.9;oy++)for(let ox=-Math.round(s*.2);ox<=s*.2;ox++){
          const t=score(gx+ox,gy+oy,0);if(t.ring>=.66&&free(gx+ox,gy+oy,n)){const v=t.ring-.006*Math.hypot(ox,oy);if(!rim||v>rim.v){rim=t;rim.v=v;rim.x=gx+ox;rim.y=gy+oy;}}}
        if(framed)put(n,r,1);else if(rim)put(n,rim,1);else{place[n]=[gx,gy];info[n]=score(gx,gy,kind(n));fit[n]=kind(n)?0:(info[n].ring>=.3&&free(gx,gy,n)?1:0);}
        moved++;}
      if(!moved)break;}
    for(let n=0;n<N;n++)if(!place[n]){const x=origin[island[n]][0]+s*U[n],y=origin[island[n]][1]+s/2*V[n];place[n]=[x,y];info[n]=score(x,y,kind(n));fit[n]=0;}
    return {cell,votes:Math.round(top.votes),anchors,islands:islands.length,lost:lost.map(i=>islands[i][0]),blobs:blobs.length,place,fit,info:info.map(r=>[+r.ring.toFixed(2),+r.colour.toFixed(2),+r.faceDark.toFixed(2)])};
  };
  let kept=null;const tried=new Set();
  for(const t of tops){
    if(tried.has(t.s)||tried.size>=4||t.votes<top.votes*.75)continue;tried.add(t.s);
    const r=solve(t),value=r.fit.reduce((sum,f)=>sum+[-1,1,2][f],0);
    if(!kept||value>kept.value){kept=r;kept.value=value;}
  }
  return kept;
}
