const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),{legacyRoom,snapshot}=require('./previous-release.cjs');
const base='http://127.0.0.1:8088/',namespace='demo-century-default-rtdb';
async function run(){
  const browser=await chromium.launch(process.env.QA_CHANNEL?{channel:process.env.QA_CHANNEL}:{});
  try{
    const pages=[],uids=[];
    for(const width of [740,844]){
      const p=await browser.newPage({viewport:{width,height:360},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
      await p.goto(base+'splendor.html?emulator=1');pages.push(p);
      uids.push(await p.evaluate(async()=>(await firebaseService()).uid));
    }
    for(const mode of [1,2,3,12,13,123,4]){
      const {seed,moves,states}=legacyRoom(mode),end=moves.length;
      const edition=mode===12?2:mode>10?3:mode;
      for(const n of [0,Math.floor(end/2),end-1]){
        const uuid=randomUUID().replaceAll('-','');
        const prefix=mode===1?'':'ce00000'+edition+(mode>10?'c'+String(mode).padStart(3,'0')+'e':'');
        const id=prefix+uuid.slice(prefix.length);
        const record={host:uids[0],seats:{1:uids[1]},format:2,seed,config:{total:2,humans:2,substitutes:['Medium','Medium']},
          moves:Object.fromEntries(moves.slice(0,n).map(row=>['t'+row.n,row]))};
        const res=await fetch('http://127.0.0.1:9000/tables/'+id+'.json?ns='+namespace,{method:'PUT',headers:{Authorization:'Bearer owner'},body:JSON.stringify(record)});
        assert(res.ok,await res.text());
        await Promise.all(pages.map(p=>p.goto(base+'?emulator=1&table='+id)));
        async function verify(at){
          await Promise.all(pages.map(async(p,i)=>{
            await p.waitForFunction(({at,i})=>online?.count===at&&online.ready&&online.connected&&mySeat()===i,{at,i});
            const [board,ranks]=await p.evaluate(()=>[g,g.edition===4?rankings(g):g.edition?expRanks(g):standings(g)]);
            assert.deepEqual(snapshot(board,ranks),states[at],mode+' / '+at+' / '+i);
          }));
        }
        await verify(n);
        if(n===end-1){
          const actor=await pages[0].evaluate(()=>g.turn);
          await pages[actor].evaluate(a=>submitOnline(a),JSON.parse(moves[n].action));await verify(end);
          await Promise.all(pages.map(p=>p.reload()));await verify(end);
        }
      }
      console.log('Previous release rejoined at start, middle, final turn and settlement:',mode,end);
    }
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
