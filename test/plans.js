/* The weekly gameplan must be a real choice: at even strength the three
   plans win about equally often; an underdog does best taking risks and
   worst playing safe; a favourite the reverse. Measured the way a user's
   game is decided (the plan's edge on your rating, then the drive engine in
   that mode), against a balanced opponent with no home field.
     node test/plans.js [file.html] [games=5000]   last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const args=process.argv.slice(2);
const file=args.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','football-coach.html');
const n=+(args.find(a=>/^\d+$/.test(a))||5000);
let js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0].replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/,'');
global.setTimeout=()=>0;global.window={storage:{get:async()=>null,set:async()=>({})},addEventListener(){},matchMedia:()=>({matches:false})};
const nd=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){}});
global.document={getElementById:nd,querySelector:nd,querySelectorAll:()=>[],createElement:nd,body:{classList:{toggle(){}}},addEventListener(){}};
const G=new Function(js+'return {playGame,RNG,PLANS,LEAGUE};')();
const gaps=G.LEAGUE.id==='nfl'?[-120,-60,0,60,120]:[-300,-150,0,150,300];
const T={};
// the even-strength column decides the most delicate check, so it gets 4x the games
const games=gap=>gap===0?4*n:n;
['safe','balanced','aggressive'].forEach(p=>{T[p]=gaps.map((gap,i)=>{const rng=new G.RNG(4242+i);let w=0, m=games(gap);
  for(let k=0;k<m;k++){const r=G.playGame(rng,1700+gap+G.PLANS[p].edge,1700,p,'balanced',{});if(r.h>r.a)w++}return 100*w/m})});
console.log(`${path.basename(file)} — your win % by plan; columns = your rating minus theirs (${n} games each)`);
console.log('            '+gaps.map(x=>String(x).padStart(7)).join(''));
Object.keys(T).forEach(p=>console.log('  '+p.padEnd(10)+T[p].map(v=>v.toFixed(1).padStart(7)).join('')));
// three standard errors of the difference between two plans' win rates
const [s,b,a]=[T.safe,T.balanced,T.aggressive], tol=3*100*Math.sqrt(2*0.25/(4*n));
let bad=0; const ok=(c,m)=>{if(!c){bad++;console.log('  FAIL '+m)}};
ok(Math.abs(s[2]-b[2])<=tol&&Math.abs(a[2]-b[2])<=tol, `even strength: safe ${s[2].toFixed(1)}, balanced ${b[2].toFixed(1)}, risks ${a[2].toFixed(1)} should be within ${tol.toFixed(1)}`);
ok(a[0]>b[0]+2&&b[0]>s[0]+1, 'big underdog: risks > balanced > safe');
ok(a[1]>b[1]&&b[1]>s[1], 'underdog: risks > balanced > safe');
ok(s[4]>b[4]+2&&b[4]>a[4]+2, 'big favourite: safe > balanced > risks');
ok(s[3]>b[3]&&b[3]>a[3], 'favourite: safe > balanced > risks');
console.log(bad?`MISMATCH ${bad} check(s) failed`:'MATCH the plan is a real choice');
process.exit(bad?1:0);
