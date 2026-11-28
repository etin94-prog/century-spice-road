// Drawn effects for the battle stage: terrain motes, charge auras, strike effects, bursts and victory light.
// Everything is painted on two canvases, one behind the cards and one in front, in stage pixels.
// A sprite sheet listed in CepterBattleArt.sprites replaces the drawn version of the effect with the same name.
const CepterBattleFx=(()=>{
  const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a),pick=list=>list[Math.floor(Math.random()*list.length)];
  const ease=t=>1-(1-t)*(1-t),clamp=t=>Math.max(0,Math.min(1,t));
  // [core, glow, deep] per effect.
  const palettes={
    slash:['#ffffff','#ffe2a0','#ff9440'],claw:['#fff4ec','#ff7a5c','#a3162a'],fang:['#fffdf0','#ffc9a0','#b3243a'],
    crush:['#fff6dc','#eab676','#7a5430'],leap:['#ffffff','#fff0a8','#ffb84a'],volley:['#fbffe4','#c4f070','#5a8a26'],
    ember:['#fff8c8','#ffa030','#d42c1c'],wave:['#f2fdff','#74d4ff','#2478c8'],gale:['#f6fff2','#a4f4c8','#34a480'],
    magic:['#ffffff','#d0b0ff','#7444dc'],bolt:['#ffffff','#fff488','#f4a800'],ward:['#f2fdff','#96e4ff','#3080d0'],
    reflect:['#ffffff','#bff2ff','#7aa8ff'],death:['#f4dcff','#aa50e8','#30104c'],heal:['#f6ffec','#94f480','#30a04c'],
    poison:['#f0e0ff','#b468e0','#5a2a80'],gold:['#fffbe0','#ffd45c','#e08a18'],ash:['#e8e4dc','#8a8478','#3a3630']
  };
  const terrainMotes={
    0:{colors:['#ffb040','#ff7020','#ffe090'],rise:-46,sway:14,size:[1.2,3.2],glow:true},
    1:{colors:['#b8ecff','#e8fbff','#7cc8f0'],rise:-22,sway:8,size:[1.5,4],ring:true},
    2:{colors:['#c8e08a','#e8d8a0','#8ab060'],rise:16,sway:26,size:[2,4.5],leaf:true},
    3:{colors:['#ffffff','#fff4c0','#d8f0ff'],rise:-6,sway:4,size:[1,2.2],streak:true}
  };
  const sheets=new Map();
  function sheet(name){
    const spec=typeof CepterBattleArt==='undefined'?null:CepterBattleArt.sprites?.[name];
    if(!spec)return null;
    if(!sheets.has(name)){
      const image=new Image(),entry={image,spec,ready:false};
      image.onload=()=>{entry.ready=true;};image.onerror=()=>{entry.failed=true;};image.src=spec.src;
      sheets.set(name,entry);
    }
    const entry=sheets.get(name);
    return entry.ready?entry:null;
  }
  // Loads the listed sheets ahead of the first strike.
  function preload(){
    if(typeof CepterBattleArt==='undefined')return;
    for(const name of Object.keys(CepterBattleArt.sprites||{}))sheet(name);
  }

  function mount(stage){
    const layers=['back','front'].map(name=>{
      const canvas=document.createElement('canvas');canvas.className='battle-fx '+name;canvas.setAttribute('aria-hidden','true');
      return {canvas,ctx:canvas.getContext('2d')};
    });
    let items=[],width=0,height=0,ratio=1,frame=0,last=0,stopped=false;
    function fit(){
      ratio=Math.min(2,window.devicePixelRatio||1);width=stage.clientWidth;height=stage.clientHeight;
      for(const {canvas} of layers){canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));}
    }
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(fit);
    observer?.observe(stage);
    function loop(now){
      frame=0;
      if(stopped||!stage.isConnected){stop();return;}
      const dt=Math.min(.05,Math.max(.001,(now-last)/1000));last=now;
      if(!width)fit();
      for(const {ctx} of layers){ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);}
      items=items.filter(item=>{
        item.age+=dt;
        if(item.age<0)return true;
        const p=item.life===Infinity?0:item.age/item.life;
        if(p>=1||item.dead)return false;
        const ctx=layers[item.front?1:0].ctx;
        ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation=item.blend||'lighter';
        item.draw(ctx,p,dt,item);ctx.restore();
        return true;
      });
      if(items.length)frame=requestAnimationFrame(loop);
    }
    function add(draw,{life=.5,delay=0,front=true,blend}={}){
      const item={draw,life,age:-delay,front,blend};items.push(item);
      if(!frame&&!stopped){last=performance.now();frame=requestAnimationFrame(loop);}
      return item;
    }
    function stop(){
      stopped=true;items=[];cancelAnimationFrame(frame);frame=0;observer?.disconnect();
      for(const {ctx,canvas} of layers){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}
    }
    // Clears what is in flight but keeps the stage usable: a skipped replay still shows the victory light.
    function clear(){items=items.filter(item=>item.keep);}
    // The middle of an element in stage pixels, with its size.
    function spot(element){
      const a=element.getBoundingClientRect(),b=stage.getBoundingClientRect();
      return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2,w:a.width,h:a.height};
    }

    function particles(x,y,{count=16,speed=[70,240],angle=[0,TAU],size=[1.6,4],life=[.35,.8],colors=palettes.slash,gravity=0,drag=2.4,
      front=true,delay=0,shape='dot',blend='lighter',spread=0,spin=9}={}){
      const list=Array.from({length:count},()=>{
        const a=rand(angle[0],angle[1]),v=rand(speed[0],speed[1]);
        return {x:x+rand(-spread,spread),y:y+rand(-spread,spread),vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:rand(size[0],size[1]),life:rand(life[0],life[1]),age:0,
          color:pick(colors),rot:rand(0,TAU),spin:rand(-spin,spin)};
      });
      return add((ctx,p,dt)=>{
        for(const q of list){
          q.age+=dt;if(q.age>=q.life)continue;
          const slow=Math.max(0,1-drag*dt);q.vx*=slow;q.vy=q.vy*slow+gravity*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.rot+=q.spin*dt;
          const k=1-q.age/q.life;ctx.globalAlpha=Math.min(1,k*1.6);ctx.fillStyle=q.color;
          if(shape==='streak'){
            const len=Math.hypot(q.vx,q.vy)*.045+q.r;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));
            ctx.beginPath();ctx.moveTo(len,0);ctx.lineTo(-len,q.r*.5);ctx.lineTo(-len,-q.r*.5);ctx.fill();ctx.restore();
          }else if(shape==='shard'){
            ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.beginPath();ctx.moveTo(-q.r,-q.r*.6);ctx.lineTo(q.r*1.2,0);ctx.lineTo(-q.r*.4,q.r);ctx.fill();ctx.restore();
          }else if(shape==='plus'){
            const s=q.r*(.6+k*.6);ctx.fillRect(q.x-s,q.y-s*.3,s*2,s*.6);ctx.fillRect(q.x-s*.3,q.y-s,s*.6,s*2);
          }else if(shape==='ring'){
            ctx.strokeStyle=q.color;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(q.x,q.y,q.r*(1.4-k*.6),0,TAU);ctx.stroke();
          }else{ctx.beginPath();ctx.arc(q.x,q.y,q.r*(.4+k*.6),0,TAU);ctx.fill();}
        }
      },{life:Math.max(life[1],.05),front,delay,blend});
    }
    function glow(x,y,radius,color,{life=.35,front=true,delay=0,alpha=1,grow=.5}={}){
      return add((ctx,p)=>{
        const r=radius*(1-grow+grow*ease(p)),g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,color);g.addColorStop(1,'transparent');
        ctx.globalAlpha=alpha*(1-p)*(1-p);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
      },{life,front,delay});
    }
    function ring(x,y,radius,color,{life=.45,front=true,delay=0,width=4,squash=1,from=.2}={}){
      return add((ctx,p)=>{
        const r=radius*(from+(1-from)*ease(p));
        ctx.globalAlpha=(1-p);ctx.strokeStyle=color;ctx.lineWidth=Math.max(.5,width*(1-p));
        ctx.beginPath();ctx.ellipse(x,y,r,r*squash,0,0,TAU);ctx.stroke();
      },{life,front,delay});
    }
    // The pointed star of a clean hit.
    function star(x,y,radius,colors,{rays=8,life=.3,delay=0,front=true}={}){
      const turn=rand(0,TAU),lengths=Array.from({length:rays},()=>rand(.55,1));
      return add((ctx,p)=>{
        const grow=ease(clamp(p/.35)),fade=1-clamp((p-.25)/.75);
        ctx.translate(x,y);ctx.rotate(turn);ctx.globalAlpha=fade;
        for(let i=0;i<rays;i++){
          const a=i/rays*TAU,len=radius*lengths[i]*grow,wide=radius*.09*fade;
          ctx.save();ctx.rotate(a);ctx.fillStyle=i%2?colors[1]:colors[0];
          ctx.beginPath();ctx.moveTo(0,-wide);ctx.lineTo(len,0);ctx.lineTo(0,wide);ctx.fill();ctx.restore();
        }
        const g=ctx.createRadialGradient(0,0,0,0,0,radius*.5);g.addColorStop(0,colors[0]);g.addColorStop(.4,colors[1]);g.addColorStop(1,'transparent');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius*.5,0,TAU);ctx.fill();
      },{life,delay,front});
    }
    // A tapered blade of light swept along an arc.
    function crescent(x,y,radius,{angle=0,sweep=2.2,thick=.2,colors=palettes.slash,life=.34,delay=0,front=true,flip=1}={}){
      return add((ctx,p)=>{
        const shown=ease(clamp(p/.42)),fade=1-clamp((p-.35)/.65),steps=18;
        ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1,flip);
        for(const [scale,color,alpha] of [[1.9,colors[2],.35],[1.25,colors[1],.75],[.6,colors[0],1]]){
          ctx.globalAlpha=alpha*fade;ctx.fillStyle=color;ctx.beginPath();
          for(let i=0;i<=steps;i++){
            const t=i/steps*shown,a=-sweep/2+sweep*t;
            ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);
          }
          for(let i=steps;i>=0;i--){
            const t=i/steps*shown,a=-sweep/2+sweep*t,inner=radius*(1-thick*scale*Math.sin(Math.PI*(i/steps))*shown);
            ctx.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);
          }
          ctx.fill();
        }
      },{life,delay,front});
    }
    function jagged(points,sway){
      const out=[points[0]];
      for(let i=1;i<points.length;i++){
        const [ax,ay]=points[i-1],[bx,by]=points[i],parts=5;
        for(let k=1;k<=parts;k++){
          const t=k/parts,nx=-(by-ay),ny=bx-ax,len=Math.hypot(nx,ny)||1,off=k===parts?0:rand(-sway,sway);
          out.push([ax+(bx-ax)*t+nx/len*off,ay+(by-ay)*t+ny/len*off]);
        }
      }
      return out;
    }
    function lightning(from,to,colors,{life=.28,delay=0,width=3,branches=2}={}){
      const make=()=>jagged([from,[(from[0]+to[0])/2+rand(-14,14),(from[1]+to[1])/2],to],Math.hypot(to[0]-from[0],to[1]-from[1])*.07);
      let path=make(),flick=0;
      const forks=Array.from({length:branches},()=>{
        const start=path[2+Math.floor(Math.random()*(path.length-4))]||from;
        return jagged([start,[start[0]+rand(-50,50),start[1]+rand(20,70)]],8);
      });
      return add((ctx,p,dt)=>{
        flick+=dt;if(flick>.05){flick=0;path=make();}
        const fade=1-p*p;
        for(const [w,color,alpha] of [[width*3.2,colors[2],.35],[width*1.6,colors[1],.8],[width*.6,colors[0],1]]){
          ctx.globalAlpha=alpha*fade;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineJoin='round';ctx.lineCap='round';
          ctx.beginPath();path.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();
          if(w<width*2)for(const fork of forks){ctx.lineWidth=w*.5;ctx.beginPath();fork.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();}
        }
      },{life,delay});
    }
    function drawSheet(name,x,y,size,direction,{delay=0,angle=0}={}){
      const entry=sheet(name);if(!entry)return false;
      const {image,spec}=entry,cols=spec.cols||spec.frames,rows=Math.ceil(spec.frames/cols),fw=image.naturalWidth/cols,fh=image.naturalHeight/rows;
      const scale=(spec.scale||1)*size/Math.max(fw,fh)*2.2;
      add((ctx,p)=>{
        const index=Math.min(spec.frames-1,Math.floor(p*spec.frames));
        ctx.translate(x,y);ctx.rotate(angle);ctx.scale(direction<0&&spec.mirror!==false?-scale:scale,scale);
        ctx.drawImage(image,index%cols*fw,Math.floor(index/cols)*fh,fw,fh,-fw/2,-fh/2,fw,fh);
      },{life:spec.frames/(spec.fps||24),delay,blend:spec.blend||'lighter'});
      return true;
    }

    // Strike effects. x,y is the middle of the struck card, r half its width, dir +1 when the blow comes from the left.
    const strikes={
      slash(x,y,r,dir){
        crescent(x,y,r*1.5,{angle:dir>0?-.5:Math.PI+.5,flip:dir,sweep:2.3,thick:.22});
        crescent(x,y,r*1.2,{angle:dir>0?.9:Math.PI-.9,flip:-dir,sweep:2,thick:.18,delay:.1});
        particles(x,y,{count:14,speed:[120,380],shape:'streak',colors:palettes.slash,life:[.25,.5],delay:.06});
      },
      leap(x,y,r,dir){
        crescent(x,y-r*.1,r*1.7,{angle:Math.PI/2*dir+(dir>0?-.2:Math.PI+.2),sweep:2.6,thick:.26,colors:palettes.leap,life:.36});
        star(x,y+r*.4,r*1.1,palettes.leap,{rays:10,delay:.12});
        particles(x,y+r*.5,{count:16,speed:[100,340],angle:[Math.PI,TAU],shape:'streak',colors:palettes.leap,delay:.12});
      },
      claw(x,y,r,dir){
        for(let i=-1;i<=1;i++)crescent(x+i*r*.42*dir,y+i*r*.06,r*2.6,{angle:(dir>0?0:Math.PI)+.05,sweep:.9,thick:.07,colors:palettes.claw,delay:.03*(i+1),life:.38,flip:dir});
        particles(x,y,{count:18,speed:[90,300],angle:[.2,Math.PI-.2],gravity:500,colors:palettes.claw,life:[.3,.6],delay:.08});
      },
      fang(x,y,r){
        const teeth=5,span=r*1.5;
        add((ctx,p)=>{
          const close=p<.38?ease(p/.38):1,fade=1-clamp((p-.5)/.5),gap=r*1.15*(1-close);
          ctx.globalAlpha=fade;
          for(const side of [-1,1])for(let i=0;i<teeth;i++){
            const tx=x-span/2+span*(i+.5)/teeth,long=r*(.5+.22*Math.sin(Math.PI*(i+.5)/teeth)),wide=span/teeth*.46,base=y+side*(gap+long);
            for(const [scale,color] of [[1.25,palettes.fang[2]],[1,palettes.fang[0]]]){
              ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(tx-wide*scale,base);ctx.lineTo(tx+wide*scale,base);ctx.lineTo(tx,base-side*long*scale);ctx.fill();
            }
          }
        },{life:.5});
        star(x,y,r*1.1,palettes.fang,{rays:8,delay:.18});
        particles(x,y,{count:16,speed:[80,280],gravity:420,colors:palettes.claw,delay:.19});
      },
      crush(x,y,r){
        const cracks=Array.from({length:9},(_,i)=>{const a=i/9*TAU+rand(-.2,.2),len=r*rand(.9,1.7);return jagged([[x,y],[x+Math.cos(a)*len,y+Math.sin(a)*len*.7]],r*.12);});
        add((ctx,p)=>{
          const shown=ease(clamp(p/.3)),fade=1-clamp((p-.45)/.55);
          for(const [w,color] of [[6,palettes.crush[2]],[2.4,palettes.crush[0]]]){
            ctx.globalAlpha=fade;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineJoin='round';
            for(const line of cracks){ctx.beginPath();const upto=Math.max(2,Math.ceil(line.length*shown));line.slice(0,upto).forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();}
          }
        },{life:.6,blend:'source-over'});
        ring(x,y,r*2,palettes.crush[1],{width:8,squash:.55,life:.5});ring(x,y,r*1.3,palettes.crush[0],{width:4,squash:.55,life:.38,delay:.05});
        star(x,y,r*1.2,palettes.crush,{rays:6});
        particles(x,y+r*.3,{count:22,speed:[80,300],angle:[Math.PI*1.1,Math.PI*1.9],gravity:620,size:[2,5.5],colors:palettes.crush,life:[.4,.9],shape:'shard',blend:'source-over'});
      },
      volley(x,y,r,dir){
        const arrows=Array.from({length:6},(_,i)=>({tx:x+rand(-r*.6,r*.6),ty:y+rand(-r*.8,r*.8),from:rand(2.2,3.2)*r,wait:i*.05,tilt:rand(-.12,.12)}));
        add((ctx,p,dt,item)=>{
          for(const a of arrows){
            const t=clamp((item.age-a.wait)/.16);if(t<=0)continue;
            const fade=1-clamp((item.age-a.wait-.3)/.3),reach=a.from*(1-ease(t));
            ctx.save();ctx.translate(a.tx,a.ty);ctx.rotate((dir>0?0:Math.PI)+a.tilt);ctx.globalAlpha=fade;
            ctx.strokeStyle=palettes.volley[1];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-reach-r*.8,0);ctx.lineTo(-reach,0);ctx.stroke();
            ctx.fillStyle=palettes.volley[0];ctx.beginPath();ctx.moveTo(-reach+r*.16,0);ctx.lineTo(-reach-r*.04,-r*.07);ctx.lineTo(-reach-r*.04,r*.07);ctx.fill();
            if(t<1){ctx.globalAlpha=.5*fade;ctx.fillStyle=palettes.volley[1];ctx.fillRect(-reach-r*2,-1,r*1.2,2);}
            ctx.restore();
          }
        },{life:.75});
        for(const a of arrows)particles(a.tx,a.ty,{count:4,speed:[50,180],colors:palettes.volley,life:[.2,.4],delay:a.wait+.16});
      },
      ember(x,y,r){
        glow(x,y+r*.3,r*2.4,palettes.ember[1],{life:.6,alpha:.9});
        const flames=Array.from({length:54},()=>({x:x+rand(-r*.7,r*.7),y:y+r*rand(.5,1.1),vx:rand(-20,20),vy:rand(-520,-220),r:rand(r*.1,r*.3),wait:rand(0,.34),life:rand(.3,.6),wob:rand(0,TAU)}));
        add((ctx,p,dt,item)=>{
          for(const f of flames){
            const age=item.age-f.wait;if(age<=0||age>=f.life)continue;
            const k=age/f.life;f.x+=(f.vx+Math.sin(f.wob+age*14)*40)*dt;f.y+=f.vy*dt*(1-k*.5);
            ctx.globalAlpha=(1-k)*.9;ctx.fillStyle=k<.25?palettes.ember[0]:k<.6?palettes.ember[1]:palettes.ember[2];
            ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1-k*.7),0,TAU);ctx.fill();
          }
        },{life:.95});
        star(x,y,r*1.3,palettes.ember,{rays:10,delay:.05});
        particles(x,y,{count:20,speed:[80,300],angle:[Math.PI,TAU],gravity:-120,colors:palettes.ember,life:[.4,1],size:[1.2,3]});
      },
      wave(x,y,r,dir){
        for(let i=0;i<3;i++)ring(x,y+r*.5,r*(1.3+i*.5),palettes.wave[i?1:0],{width:6-i*1.5,squash:.4,life:.5+i*.08,delay:i*.07});
        crescent(x-dir*r*.2,y+r*.5,r*1.6,{angle:-Math.PI/2,sweep:2.5,thick:.3,colors:palettes.wave,life:.45,flip:dir});
        particles(x,y+r*.3,{count:30,speed:[160,460],angle:[Math.PI*1.15,Math.PI*1.85],gravity:900,size:[1.6,4.4],colors:palettes.wave,life:[.5,.95]});
        glow(x,y,r*1.8,palettes.wave[1],{life:.4,alpha:.7});
      },
      gale(x,y,r,dir){
        for(let i=0;i<4;i++){
          const start=i/4*TAU;
          add((ctx,p)=>{
            const a=start+p*5.5*dir,rad=r*(.5+p*1.1),fade=Math.sin(Math.PI*clamp(p*1.1));
            ctx.translate(x,y);ctx.rotate(a);
            for(const [scale,color,alpha] of [[1.7,palettes.gale[2],.4],[1,palettes.gale[1],.8],[.5,palettes.gale[0],1]]){
              ctx.globalAlpha=alpha*fade;ctx.fillStyle=color;ctx.beginPath();
              for(let k=0;k<=14;k++){const t=k/14,b=-1.1+2.2*t;ctx.lineTo(Math.cos(b)*rad,Math.sin(b)*rad);}
              for(let k=14;k>=0;k--){const t=k/14,b=-1.1+2.2*t,inner=rad*(1-.2*scale*Math.sin(Math.PI*t));ctx.lineTo(Math.cos(b)*inner,Math.sin(b)*inner);}
              ctx.fill();
            }
          },{life:.6,delay:i*.03});
        }
        particles(x,y,{count:26,speed:[160,420],shape:'streak',colors:palettes.gale,life:[.3,.6],size:[1,2.4]});
      },
      magic(x,y,r,dir,colors=palettes.magic){
        const turn=rand(0,TAU);
        add((ctx,p)=>{
          const grow=ease(clamp(p/.3)),fade=1-clamp((p-.6)/.4);
          ctx.translate(x,y);ctx.scale(1,.42);ctx.rotate(turn+p*2.4);ctx.globalAlpha=fade;ctx.strokeStyle=colors[1];ctx.lineWidth=2.4;
          for(const k of [1.5,1.22])ctx.beginPath(),ctx.arc(0,0,r*k*grow,0,TAU),ctx.stroke();
          ctx.lineWidth=1.6;ctx.strokeStyle=colors[0];
          for(const offset of [0,Math.PI/3]){ctx.beginPath();for(let i=0;i<=3;i++){const a=offset+i*TAU/3;ctx.lineTo(Math.cos(a)*r*1.22*grow,Math.sin(a)*r*1.22*grow);}ctx.stroke();}
          for(let i=0;i<12;i++){const a=i/12*TAU;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*1.3*grow,Math.sin(a)*r*1.3*grow);ctx.lineTo(Math.cos(a)*r*1.44*grow,Math.sin(a)*r*1.44*grow);ctx.stroke();}
        },{life:.85,front:false});
        // The pillar of light.
        add((ctx,p)=>{
          const open=Math.sin(Math.PI*clamp(p)),wide=r*1.1*open,g=ctx.createLinearGradient(x-wide,0,x+wide,0);
          g.addColorStop(0,'transparent');g.addColorStop(.35,colors[1]);g.addColorStop(.5,colors[0]);g.addColorStop(.65,colors[1]);g.addColorStop(1,'transparent');
          ctx.globalAlpha=.85*open;ctx.fillStyle=g;ctx.fillRect(x-wide,0,wide*2,y+r*.9);
        },{life:.42,delay:.22});
        lightning([x+rand(-r,r),0],[x,y],colors,{delay:.2,width:3.4});
        star(x,y,r*1.5,colors,{rays:12,delay:.24,life:.36});
        particles(x,y,{count:26,speed:[60,320],colors,life:[.4,.9],delay:.24,shape:'plus',size:[2,4.5]});
      },
      bolt(x,y,r){
        lightning([x-r*.6,0],[x,y],palettes.bolt,{width:4,branches:3});lightning([x+r*.9,0],[x+r*.1,y+r*.2],palettes.bolt,{delay:.08,width:2.6});
        star(x,y,r*1.5,palettes.bolt,{rays:10,delay:.04});glow(x,y,r*2.4,palettes.bolt[1],{life:.3});
        particles(x,y,{count:22,speed:[140,460],shape:'streak',colors:palettes.bolt,life:[.2,.45]});
      },
      death(x,y,r,dir){
        add((ctx,p)=>{
          const grow=ease(clamp(p/.5)),fade=1-clamp((p-.6)/.4),g=ctx.createRadialGradient(x,y,0,x,y,r*1.7*grow+1);
          g.addColorStop(0,'#000');g.addColorStop(.55,palettes.death[2]);g.addColorStop(.8,palettes.death[1]+'88');g.addColorStop(1,'transparent');
          ctx.globalAlpha=.92*fade;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.7*grow+1,0,TAU);ctx.fill();
        },{life:.9,blend:'source-over'});
        // Motes are drawn into the dark before the scythe falls.
        const motes=Array.from({length:26},()=>{const a=rand(0,TAU),d=r*rand(1.6,2.6);return {a,d,wait:rand(0,.25)};});
        add((ctx,p,dt,item)=>{
          for(const m of motes){
            const t=clamp((item.age-m.wait)/.4);if(t<=0||t>=1)continue;
            const d=m.d*(1-t*t);ctx.globalAlpha=t;ctx.fillStyle=palettes.death[1];ctx.beginPath();ctx.arc(x+Math.cos(m.a+t)*d,y+Math.sin(m.a+t)*d,2.6*(1-t)+.8,0,TAU);ctx.fill();
          }
        },{life:.7});
        crescent(x,y,r*1.9,{angle:dir>0?-.9:Math.PI+.9,flip:dir,sweep:2.8,thick:.3,colors:palettes.death,delay:.42,life:.42});
        star(x,y,r*1.4,palettes.death,{rays:8,delay:.5});
        particles(x,y,{count:30,speed:[90,360],colors:palettes.death,life:[.5,1.1],delay:.52,gravity:-60});
      }
    };
    function strike(kind,at,dir,options){
      const r=at.w/2;
      if(drawSheet(kind,at.x,at.y,r,dir)){star(at.x,at.y,r*.9,palettes[kind]||palettes.slash,{rays:6,life:.22});return;}
      (strikes[kind]||strikes.slash)(at.x,at.y,r,dir,options);
    }
    // Light gathers on the card that is about to strike.
    function charge(at,kind,seconds=.3){
      const colors=palettes[kind]||palettes.slash,r=at.w/2;
      const motes=Array.from({length:20},()=>({a:rand(0,TAU),d:r*rand(1.5,2.3),wait:rand(0,seconds*.5)}));
      add((ctx,p,dt,item)=>{
        for(const m of motes){
          const t=clamp((item.age-m.wait)/(seconds*.6));if(t<=0||t>=1)continue;
          const d=m.d*(1-ease(t))+r*.5;ctx.globalAlpha=t;ctx.fillStyle=colors[t>.6?0:1];
          ctx.beginPath();ctx.arc(at.x+Math.cos(m.a)*d,at.y+Math.sin(m.a)*d*1.15,2.2+t*1.4,0,TAU);ctx.fill();
        }
        const g=ctx.createRadialGradient(at.x,at.y,r*.4,at.x,at.y,r*1.9);g.addColorStop(0,colors[1]);g.addColorStop(1,'transparent');
        ctx.globalAlpha=.55*Math.sin(Math.PI*p);ctx.fillStyle=g;ctx.beginPath();ctx.arc(at.x,at.y,r*1.9,0,TAU);ctx.fill();
      },{life:seconds,front:false});
      ring(at.x,at.y,r*1.7,colors[1],{life:seconds,front:false,width:3,from:1.25,squash:1.2});
    }
    // Streaks left behind a card as it rushes at its opponent.
    function rush(from,to,kind){
      const colors=palettes[kind]||palettes.slash,dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);
      const lines=Array.from({length:9},()=>({off:rand(-from.h*.45,from.h*.45),start:rand(0,.3),size:rand(.35,.8),wide:rand(1,3)}));
      add((ctx,p)=>{
        ctx.translate(from.x,from.y);ctx.rotate(a);
        for(const l of lines){
          const head=len*clamp(p*1.5+l.start*.3),tail=Math.max(0,head-len*l.size);
          const g=ctx.createLinearGradient(tail,0,head,0);g.addColorStop(0,'transparent');g.addColorStop(1,colors[1]);
          ctx.globalAlpha=(1-p)*.8;ctx.fillStyle=g;ctx.fillRect(tail,l.off,head-tail,l.wide);
        }
      },{life:.3,front:false});
    }
    // A shot that flies from one card to the other and leaves a trail.
    function shot(from,to,kind,seconds=.26){
      const colors=palettes[kind]||palettes.magic,trail=[];
      add((ctx,p)=>{
        const t=p*p,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t-Math.sin(Math.PI*p)*from.h*.12;
        trail.push([x,y]);if(trail.length>12)trail.shift();
        trail.forEach(([tx,ty],i)=>{const k=(i+1)/trail.length;ctx.globalAlpha=k*.7;ctx.fillStyle=colors[k>.7?0:1];ctx.beginPath();ctx.arc(tx,ty,from.w*.07*k+1,0,TAU);ctx.fill();});
        const g=ctx.createRadialGradient(x,y,0,x,y,from.w*.22);g.addColorStop(0,colors[0]);g.addColorStop(.4,colors[1]);g.addColorStop(1,'transparent');
        ctx.globalAlpha=1;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,from.w*.22,0,TAU);ctx.fill();
      },{life:seconds});
      particles(from.x,from.y,{count:8,speed:[40,160],colors,life:[.2,.4]});
    }
    // A wall of light plates that stops the blow.
    function ward(at,kind='ward'){
      const colors=palettes[kind]||palettes.ward,r=at.w*.34,cells=[[0,0],[1,0],[-1,0],[.5,.87],[-.5,.87],[.5,-.87],[-.5,-.87]];
      add((ctx,p)=>{
        const show=ease(clamp(p/.2)),fade=1-clamp((p-.5)/.5);
        ctx.translate(at.x,at.y);
        cells.forEach(([cx,cy],i)=>{
          const flick=.55+.45*Math.sin(p*40+i*1.7);
          ctx.globalAlpha=fade*show*(i?flick*.75:1);ctx.strokeStyle=colors[0];ctx.fillStyle=colors[1]+'55';ctx.lineWidth=2;
          ctx.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU+Math.PI/6;ctx.lineTo(cx*r*1.74+Math.cos(a)*r*show,cy*r*1.74+Math.sin(a)*r*show);}
          ctx.closePath();ctx.fill();ctx.stroke();
        });
      },{life:.7});
      ring(at.x,at.y,at.w*.95,colors[0],{life:.5,width:5});ring(at.x,at.y,at.w*1.3,colors[1],{life:.6,width:3,delay:.08});
      particles(at.x,at.y,{count:14,speed:[120,340],shape:'streak',colors,life:[.2,.45]});
    }
    // The blow is thrown back along its own path.
    function reflect(at,back){
      ward(at,'reflect');
      add((ctx,p)=>{
        const head=ease(clamp(p/.5)),fade=1-clamp((p-.5)/.5),x=at.x+(back.x-at.x)*head,y=at.y+(back.y-at.y)*head;
        for(const [w,color,alpha] of [[14,palettes.reflect[2],.4],[7,palettes.reflect[1],.8],[2.5,palettes.reflect[0],1]]){
          ctx.globalAlpha=alpha*fade;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(x,y);ctx.stroke();
        }
      },{life:.5,delay:.12});
      star(back.x,back.y,back.w*.6,palettes.reflect,{rays:8,delay:.36});
    }
    function mend(at,kind='heal'){
      const colors=palettes[kind]||palettes.heal;
      ring(at.x,at.y+at.h*.3,at.w*.8,colors[1],{squash:.35,life:.7,width:4,front:false});
      particles(at.x,at.y+at.h*.3,{count:16,speed:[40,130],angle:[Math.PI*1.3,Math.PI*1.7],gravity:-90,drag:.6,shape:kind==='heal'?'plus':'ring',colors,life:[.6,1.1],size:[3,6],spread:at.w*.35});
    }
    // Sparks and splinters thrown out when a blow lands; heavier blows throw more.
    function impact(at,kind,weight=1){
      const colors=palettes[kind]||palettes.slash,r=at.w/2;
      star(at.x,at.y,r*(.9+weight*.5),colors,{rays:weight>1.4?12:8,life:.26+weight*.05});
      particles(at.x,at.y,{count:Math.round(10+weight*10),speed:[120,300+weight*160],colors,shape:'streak',life:[.25,.55]});
      if(weight>1.2)ring(at.x,at.y,r*2.2,colors[1],{width:6,life:.45});
    }
    function critical(at){
      const r=at.w/2;
      star(at.x,at.y,r*2.6,palettes.gold,{rays:16,life:.5});ring(at.x,at.y,r*3,palettes.gold[1],{width:9,life:.6});ring(at.x,at.y,r*2,palettes.gold[0],{width:4,life:.45,delay:.06});
      particles(at.x,at.y,{count:34,speed:[200,640],colors:palettes.gold,shape:'streak',life:[.3,.75],size:[1.5,3.4]});
    }
    // The card breaks: shards, embers and a ring where it stood.
    function shatter(at,colors=palettes.ash){
      const r=at.w/2;
      glow(at.x,at.y,r*2.6,'#ffffff',{life:.32,alpha:.9});ring(at.x,at.y,r*2.6,'#fff2d0',{width:7,life:.55});
      particles(at.x,at.y,{count:36,speed:[90,460],gravity:760,size:[2.5,7],colors:[...colors,'#ffffff'],shape:'shard',life:[.6,1.2],spread:r*.6,blend:'source-over'});
      particles(at.x,at.y,{count:26,speed:[40,220],gravity:-140,drag:1.2,colors:palettes.ember,life:[.7,1.4],size:[1,2.6],spread:r*.7,delay:.1});
    }
    // Slow rays behind the winner until the stage is left.
    function triumph(at,color='#ffd45c'){
      const r=Math.max(at.w,at.h),rays=12;
      const light=add((ctx,p,dt,item)=>{
        const fadeIn=clamp(item.age/.5);
        ctx.translate(at.x,at.y);ctx.rotate(item.age*.35);
        for(let i=0;i<rays;i++){
          const a=i/rays*TAU,wide=.11+.04*(i%2),g=ctx.createLinearGradient(0,0,Math.cos(a)*r*1.3,Math.sin(a)*r*1.3);
          g.addColorStop(0,color+'aa');g.addColorStop(1,'transparent');
          ctx.globalAlpha=fadeIn*(.5+.2*Math.sin(item.age*2+i));ctx.fillStyle=g;
          ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r*1.3,a-wide,a+wide);ctx.fill();
        }
      },{life:Infinity,front:false});
      light.keep=true;
      particles(at.x,at.y,{count:40,speed:[60,380],colors:palettes.gold,life:[.6,1.4],gravity:160,shape:'plus',size:[2,5]});
      // Sparkles keep drifting up around the winner.
      let wait=0;
      const drift=add((ctx,p,dt)=>{wait-=dt;if(wait<=0){wait=.22;particles(at.x+rand(-at.w*.6,at.w*.6),at.y+at.h*.5,{count:2,speed:[30,80],angle:[Math.PI*1.4,Math.PI*1.6],gravity:-40,drag:.4,colors:palettes.gold,life:[.9,1.6],shape:'plus',size:[2,4],front:false});}},{life:Infinity,front:false});
      drift.keep=true;
    }
    // Motes of the land drift across the stage for as long as it is shown.
    function ambient(terrain){
      const kind=terrainMotes[terrain]||{colors:['#fff4d0','#d8d0c0'],rise:-10,sway:10,size:[1,2.4]};
      const motes=Array.from({length:26},()=>({x:rand(0,1),y:rand(0,1),r:rand(kind.size[0],kind.size[1]),phase:rand(0,TAU),speed:rand(.5,1.5),color:pick(kind.colors)}));
      const item=add((ctx,p,dt,it)=>{
        for(const m of motes){
          m.y+=kind.rise*m.speed*dt/Math.max(1,height);m.x+=(kind.streak?70*m.speed:Math.sin(it.age*1.3+m.phase)*kind.sway)*dt/Math.max(1,width);
          if(m.y<-.05)m.y=1.05;if(m.y>1.05)m.y=-.05;if(m.x>1.05)m.x=-.05;if(m.x<-.05)m.x=1.05;
          const x=m.x*width,y=m.y*height,pulse=.45+.4*Math.sin(it.age*2.2+m.phase);
          ctx.globalAlpha=pulse*.8;ctx.fillStyle=m.color;ctx.strokeStyle=m.color;
          if(kind.streak){ctx.fillRect(x,y,18*m.speed,1.2);}
          else if(kind.leaf){ctx.save();ctx.translate(x,y);ctx.rotate(it.age*m.speed+m.phase);ctx.beginPath();ctx.ellipse(0,0,m.r*1.6,m.r*.6,0,0,TAU);ctx.fill();ctx.restore();}
          else if(kind.ring){ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,m.r,0,TAU);ctx.stroke();}
          else{ctx.beginPath();ctx.arc(x,y,m.r,0,TAU);ctx.fill();}
        }
      },{life:Infinity,front:false,blend:kind.leaf?'source-over':'lighter'});
      item.keep=true;
      return item;
    }
    return {layers:layers.map(l=>l.canvas),fit,stop,clear,spot,add,particles,glow,ring,star,crescent,lightning,strike,charge,rush,shot,ward,reflect,mend,impact,critical,shatter,triumph,ambient};
  }
  return {mount,palettes,preload};
})();
