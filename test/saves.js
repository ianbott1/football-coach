/* The three games share one website, so one browser storage. Each must keep
   to its own save slots. Recreates the published situation: a college
   football save in slot 1, and a pro and a basketball save written by older
   builds into the old shared slots 2 and 3 (no record of which game made
   them). Opens each game in turn and checks: each lists only its own saves;
   the others are moved, intact, into their own game's slots; the college
   save is untouched; a game never opens another game's save.
     node test/saves.js      last line: MATCH or MISMATCH */
const fs=require('fs'),path=require('path');
const D=f=>path.join(__dirname,'..','dist',f);
const GAMES={cfb:D('football-coach.html'),nfl:D('football-coach-pro.html'),ncaab:D('basketball-coach.html'),nba:D('basketball-coach-pro.html')};
const src=fs.readFileSync(path.join(__dirname,'storage.js'),'utf8');
let bad=0; const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m); if(!c)bad++};
function boot(file,LS){
  let js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0].replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);\s*$/,'');
  global.setTimeout=()=>0; global.clearTimeout=()=>{};
  const ls={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)},removeItem:k=>{delete LS[k]},key:i=>Object.keys(LS)[i],get length(){return Object.keys(LS).length}};
  global.localStorage=ls; global.window={addEventListener(){},innerWidth:390,matchMedia:()=>({matches:false}),localStorage:ls,scrollTo(){}};
  const mk=()=>({innerHTML:'',dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},onclick:null});
  global.document={getElementById:()=>mk(),querySelector:()=>mk(),querySelectorAll:()=>[],createElement:mk,body:{classList:{toggle(){}}},addEventListener(){}};
  global.confirm=()=>true;
  return new Function(js+`return {newDynasty,doAdvance,liveTick,answerLive,allSlots,loadSlot,setSlot(n){slot=n},save,
    get S(){return S}, get live(){return live}, KEYFOR, lzwPack, lzwUnpack};`)();
}
const tick=()=>new Promise(r=>setImmediate(r));
async function makeSave(lg,team,LS){           // a career a few games in, saved by its game
  const A=boot(GAMES[lg],LS); A.setSlot(1); A.newDynasty(team,5,'Coach '+lg);
  for(let i=0;i<3;i++){A.doAdvance();let n=0;while(A.live&&!A.live.done&&n++<800){A.live.ask?A.answerLive(A.live.ask.dp.opts[0][0]):A.liveTick()}}
  await A.save(); await tick(); return A;
}
(async()=>{
  // three careers, each saved by its own game, then arranged as older builds left them
  const scratch={};
  const cf=await makeSave('cfb','Alabama',scratch);  const cfbSave=scratch['fbcoach-v2-slot1'];
  const pr=await makeSave('nfl','Houston',scratch);  const nflSave=scratch['fbcoach-pro-v2-slot1'];
  const bb=await makeSave('ncaab','Duke',scratch);   const bbSave=scratch['bbcoach-v1-slot1'];
  const pb=await makeSave('nba','Boston',scratch);  const nbaSave=scratch['bbcoach-pro-v1-slot1'];
  ok(!!cfbSave&&!!nflSave&&!!bbSave&&!!nbaSave, 'each game saves to its own slots (pro basketball too)');
  ok(scratch['fbcoach-v2-slot1']===cfbSave, "pro basketball didn't write into college football's slot");
  const strip=(A,v)=>{const d=JSON.parse(A.lzwUnpack(v)); delete d.league; return A.lzwPack(JSON.stringify(d))};   // as an older build wrote it
  const LS={'fbcoach-v2-slot1':cfbSave,'fbcoach-v2-slot2':strip(pr,nflSave),'fbcoach-v2-slot3':strip(bb,bbSave)};
  // open the basketball game first, as on the site
  const B=boot(GAMES.ncaab,LS); const sb=await B.allSlots();
  ok(sb.filter(x=>!x.empty).map(x=>x.team).join()==='Duke', `basketball lists only its own save (${sb.filter(x=>!x.empty).map(x=>x.team).join(', ')})`);
  ok(!('fbcoach-v2-slot3' in LS)&&!!LS['bbcoach-v1-slot3'], 'the basketball save moved out of the shared slots into basketball\'s slot 3');
  ok(!!LS['fbcoach-pro-v2-slot2']&&!('fbcoach-v2-slot2' in LS), 'the pro save moved into the pro game\'s slot 2, even though basketball was opened');
  ok(LS['fbcoach-v2-slot1']===cfbSave, 'the college football save is untouched');
  const P=boot(GAMES.nfl,LS); const sp=await P.allSlots(); const dp=await P.loadSlot(2);
  ok(sp.filter(x=>!x.empty).map(x=>x.team).join()==='Houston'&&dp&&dp.myTeam==='Houston'&&dp.career&&dp.career.w+dp.career.l>=0,
     `pro lists and opens its own save (${sp.filter(x=>!x.empty).map(x=>x.team).join(', ')})`);
  const C=boot(GAMES.cfb,LS); const sc=await C.allSlots();
  ok(sc.filter(x=>!x.empty).map(x=>x.team).join()==='Alabama', `college football lists only its own save (${sc.filter(x=>!x.empty).map(x=>x.team).join(', ')})`);
  // a game never opens another's save, even if one is put in its slot
  LS['fbcoach-v2-slot2']=bbSave; const C2=boot(GAMES.cfb,LS);
  ok(!(await C2.loadSlot(2)), 'college football won\'t open a basketball save placed in its slot');
  console.log(bad?`MISMATCH ${bad} check(s) failed`:'MATCH each game keeps to its own saves');
  process.exit(bad?1:0);
})().catch(e=>{console.log('MISMATCH crashed: '+e.message);process.exit(1)});

