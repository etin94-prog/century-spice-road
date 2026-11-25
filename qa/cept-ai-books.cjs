const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../dist/cept-engine'),archive=require('../dist/cept-archive-data'),adapt=require('../dist/cept-books');
const rows=archive.books.filter(b=>b.group==='AI');
const byPath=new Map(C.cards.map(c=>[c.catalog?.path,c]));
const key=id=>C.combo.key(C.cards[id]);
const missing=new Map(),details=[],stats=[];
let kept=0,complete=0,wins=0,matches=0;
for(const [i,row] of rows.entries()){
 const book=adapt(C,row);
 const recorded=Object.values(row.cards).reduce((a,b)=>a+b,0);
 assert.ok(C.validBook(book.deck),row.name);
 kept+=book.kept;if(book.kept===50&&recorded===50)complete++;
 const swaps=new Map();
 for(const [from,to] of book.replacements){
   if(from&&byPath.get(from).catalogOnly)missing.set(from,(missing.get(from)||0)+1);
   const label=(from?byPath.get(from).catalog.name:'보충')+' → '+(to?byPath.get(to).catalog.name:'50장 한도 제외');
   swaps.set(label,(swaps.get(label)||0)+1);
 }
 const names=Object.entries(row.cards).flatMap(([p,n])=>Array(n).fill(C.combo.key(byPath.get(p))));
 const playable=book.deck.map(key);
 const lost=C.combo.recipes.flatMap((g,j)=>C.combo.matches(g,names)&&!C.combo.matches(g,playable)?[j+1]:[]);
 const uses=new Map();
 let won=0;
 for(let seed=0;seed<3;seed++)for(let hardSeat=0;hardSeat<2;hardSeat++){
   let state=1408+seed+i*911;
   Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
   const s=C.start(2,0,5000,'ps2-1',book.deck,book.deck,1);
   for(let j=0;j<12000&&s.winner<0;j++){
     s.aiLevel=C.actor(s)===hardSeat?2:1;
     const a=C.ai(s);
     if(['cast','invade','equip'].includes(a[0])){
       const card=C.cards[s.players[C.actor(s)].hand[a[1]]];
       const event=({cast:'주문',invade:'침략',equip:'장비'})[a[0]]+' · '+(card.catalog?.name||card.name);
       uses.set(event,(uses.get(event)||0)+1);
     }
     assert.ok(C.play(s,a),row.name+' '+s.phase);
   }
   assert.ok(s.winner>=0,row.name+' 미완주');won+=Number(s.winner===hardSeat);matches++;
 }
 wins+=won;stats.push('| '+row.name+' | '+recorded+' | '+book.kept+'/50 | '+(lost.join(', ')||'—')+' | '+won+'/6 |');
 const ranked=Object.entries(row.cards).filter(([key])=>byPath.get(key).catalogOnly).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const observed=[...uses].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([act,n])=>act+' '+n+'회').join(', ');
 details.push('### '+row.name,'','[참고 북 목록]('+row.url+') · 자료에 기록된 수량 '+recorded+'장','','6판에서 자주 선택한 행동 · '+observed,'',
 ...(ranked.length?['원본에서 채택 수가 높은 미지원 카드','',...ranked.map(([path,n])=>'- '+byPath.get(path).catalog.name+' ×'+n+' · '+byPath.get(path).catalog.ability),'']:[]),swaps.size?[...swaps].map(([pair,n])=>pair+' ×'+n).join(', '):'원본 50장 전부 사용 가능.','');
}
const summary=rows.length+'개 북, 원본 카드 '+kept+'/'+(50*rows.length)+'장, 완전 원본 북 '+complete+'개. 동일 북 대전 '+matches+'판 완주, Hard '+wins+'승.';
console.log(summary);
if(process.argv.includes('--report')){
 const report=['# PS2 원작 AI 북 검증','',summary,'',
 '듀난에서 목표 5,000G로 중간 AI와 Hard AI가 같은 북을 사용했다. 북마다 세 개의 난수 시드로 두 좌석을 교대했다. 북당 6판은 행동 회귀 검사 표본이며 사람 승률이나 PS2 CPU의 승률을 추정하는 자료로 쓰기 어렵다.','',
 '콤보 번호는 게임 자료실의 1~108번 순서다. 누락 번호는 원본 구성으로 성립하지만 대전용 북으로 바꾸면서 구성 조건이 깨진 경우다. 이 검사는 각 콤보의 실전 발동 여부와 별개다.','',
 '| 원작 AI 북 | 기록 수량 | 원본 유지 | 누락 콤보 번호 | Hard 승리 |','|---|---:|---:|---|---:|',...stats,'','## 남은 카드 우선순위','','42개 AI 북에서 대체된 총 장수 순으로 상위 15개를 집계했다.','',
 ...[...missing].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,n])=>'- '+byPath.get(k).catalog.name+' · '+n+'장'),'','## 실제 대체 내역','',...details];
 fs.writeFileSync(path.join(__dirname,'../PS2-AI-BOOKS.md'),report.join('\n')+'\n');
}
