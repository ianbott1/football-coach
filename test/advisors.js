/* The three advisors, measured: full live games in which every call is
   answered the way one advisor recommends, each game replayed from the same
   start for each advisor. Situations: even match, big underdog, and games
   where a leading-late or trailing-late call came up.
     node test/advisors.js <file.html> [games=3000]   a report */
const fs=require('fs'),path=require('path');
const args=process.argv.slice(2);
const file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const N=+(args.find(a=>/^\d+$/.test(a))||3000);
let js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0].replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/,'');
global.setTimeout=()=>0;global.window={storage:{get:async()=>null,set:async()=>({})},addEventListener(){},matchMedia:()=>({matches:false})};
const nd=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){}});
global.document={getElementById:nd,querySelector:nd,querySelectorAll:()=>[],createElement:nd,body:{classList:{toggle(){}}},addEventListener(){}};
const G=new Function(js+'return {makeLiveGame,RNG,LEAGUE,staffTake};')();
const WHO=['bears','pearl','capy'], NAME={bears:'Two Bears',pearl:'Pearl',capy:'Capybara'};
const big=G.LEAGUE.id==='nfl'?-100:-250;
function play(seed,gap,who){
  const e=G.makeLiveGame(new G.RNG(seed),1700+gap,1700,'balanced','balanced',true);
  const seen={}; let guard=0;
  while(guard++<400){const r=e.next(); if(r.done)return {win:r.h>r.a,seen};
    if(r.ask){seen[r.ask.k]=true; const R=G.staffTake(r.ask,{mine:r.mine,theirs:r.theirs,q:r.q});
      const pick=(R.find(x=>x.who===who)||{}).pick||r.ask.opts[0][0]; e.reply(pick)}}
  return {win:false,seen};
}
const T={}; WHO.forEach(w=>T[w]={even:[0,0],under:[0,0],lead:[0,0],trail:[0,0]});
for(let s=1;s<=N;s++){
  [[0,'even'],[big,'under']].forEach(([gap,col])=>{
    const base=play(s,gap,'pearl').seen;              // which calls come up doesn't depend on earlier answers until they're made
    WHO.forEach(w=>{const r=play(s,gap,w); T[w][col][1]++; if(r.win)T[w][col][0]++;
      if(gap===0){ if(r.seen.protect){T[w].lead[1]++; if(r.win)T[w].lead[0]++}
                   if(r.seen.chase){T[w].trail[1]++; if(r.win)T[w].trail[0]++} }});
  });
}
const pct=([w,n])=>n?(100*w/n).toFixed(1).padStart(6):'     -';
console.log(`${path.basename(file)} — win % when every call follows one advisor (${N} games per situation)`);
console.log('                even match  big underdog  leading late  trailing late');
WHO.forEach(w=>console.log('  '+NAME[w].padEnd(12)+pct(T[w].even).padStart(8)+pct(T[w].under).padStart(12)+pct(T[w].lead).padStart(14)+pct(T[w].trail).padStart(14)));
const best=col=>WHO.slice().sort((a,b)=>T[b][col][0]/T[b][col][1]-T[a][col][0]/T[a][col][1])[0];
console.log('  best:        '+['even','under','lead','trail'].map(c=>NAME[best(c)]).join(' | '));
