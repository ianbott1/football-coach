/* Clinch marks must never be wrong. Plays many pro seasons, records every
   team's mark after every week, and checks each against how the season
   ended: z = the 1 seed, y = won the division, x = made the playoffs,
   e = missed them. Also reports how early marks arrive.
     node test/clinch.js [file.html] [seasons=300]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const args=process.argv.slice(2);
const file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach-pro.html');
const N=+(args.find(a=>/^\d+$/.test(a))||300);
let js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0].replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/,'');
global.setTimeout=()=>0;global.clearTimeout=()=>{};
global.window={storage:{get:async()=>null,set:async()=>({})},addEventListener(){},matchMedia:()=>({matches:false})};
const nd=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){}});
global.document={getElementById:nd,querySelector:nd,querySelectorAll:()=>[],createElement:nd,body:{classList:{toggle(){}}},addEventListener(){}};
const G=new Function(js+'return {newUniverse,syncConf,Season,NAMES,CONF,LEAGUE};')();
let wrong=0, marks=0; const first={x:[],y:[],z:[],e:[]}, got={x:0,y:0,z:0,e:0}, teams={x:0,y:0,z:0,e:0};
for(let s=1;s<=N;s++){
  const u=G.newUniverse(s*7919+13); G.syncConf(u);
  const E=new G.Season(u,(s*2654435761)>>>0);
  const seen={};                                   // team -> {k: first week}
  while(E.step<G.LEAGUE.weeks){
    E.advance();
    const c=E.clinch();
    G.NAMES.forEach(t=>{const k=c[t]; if(!k)return; marks++;
      seen[t]=seen[t]||{}; if(seen[t][k]===undefined)seen[t][k]=E.step;
      // marks only strengthen: z implies y implies x
      seen[t].prev&&["z","y","x"].indexOf(seen[t].prev)>=0&&k==="e"&&(wrong++,console.log(`  season ${s}: ${t} went from ${seen[t].prev} to e`));
      seen[t].prev=k;});
  }
  E._seed();
  const champ=t=>Object.values(E.champs).indexOf(t)>=0;
  G.NAMES.forEach(t=>{
    const sd=E.seeds[t]||0, truth={z:sd===1,y:champ(t),x:sd>0,e:sd===0};
    ["z","y","x","e"].forEach(k=>{ if(truth[k])teams[k]++; });
    const S=seen[t]||{};
    ["z","y","x","e"].forEach(k=>{
      if(S[k]===undefined)return;
      // a mark claims everything below it: z => y and x; y => x
      const claims=k==="z"?["z","y","x"]:k==="y"?["y","x"]:[k];
      claims.forEach(c=>{if(!truth[c]){wrong++; if(wrong<6)console.log(`  season ${s} week ${S[k]}: ${t} marked ${k} but final seed ${sd||'none'}${c!==k?' (claims '+c+')':''}`)}});
    });
    // how early: the week each true outcome was first marked before the season ended
    const wk={x:[S.x,S.y,S.z].filter(v=>v!==undefined),y:[S.y,S.z].filter(v=>v!==undefined),z:[S.z].filter(v=>v!==undefined),e:[S.e].filter(v=>v!==undefined)};
    ["z","y","x","e"].forEach(k=>{ if(!truth[k]||!wk[k].length)return; const w=Math.min(...wk[k]);
      if(w<G.LEAGUE.weeks){got[k]++; first[k].push(w)} });
  });
}
const avg=a=>a.length?(a.reduce((s,x)=>s+x,0)/a.length).toFixed(1):'-';
console.log(`${N} seasons, ${marks} marks shown`);
[["x","made the playoffs"],["y","won the division"],["z","got the bye"],["e","missed the playoffs"]].forEach(([k,l])=>
  console.log(`  ${k}: of teams that ${l.padEnd(18)} ${(100*got[k]/teams[k]).toFixed(0).padStart(3)}% were marked before week 18's games ended; on average after week ${avg(first[k])}`));
console.log(wrong?`MISMATCH ${wrong} wrong mark(s)`:`MATCH no mark was ever wrong`);
process.exit(wrong?1:0);
