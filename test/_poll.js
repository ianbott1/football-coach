const {load}=require('./harness.js');
let inv=0,pairs=0,ex=[], top12=[], left=[];
for(const seed of [1,2,3,4,5,6,7,8]){ const A=load({file:process.argv[2],expose:['S','SEA','NAMES','newDynasty']}); A.newDynasty('Rice',seed,'T');
  let g=0; while(A.SEA.phase==='week'&&g++<200)A.SEA.advance();
  const ord=A.SEA.poll.order().slice(0,40), R=A.SEA.rec;
  for(let i=0;i<ord.length;i++)for(let j=i+1;j<ord.length;j++){ const a=ord[i],b=ord[j]; pairs++;
    if(R[b][1]<=R[a][1]-2&&R[b][0]>=R[a][0]+2){inv++; if(ex.length<4)ex.push(`#${i+1} ${a} ${R[a].join('-')} above #${j+1} ${b} ${R[b].join('-')}`)} }
  // one-loss and unbeaten teams outside the top 15
  A.NAMES.forEach(t=>{ const r=R[t]; if(r[1]<=1&&r[0]>=10){ const k=A.SEA.poll.order().indexOf(t)+1; if(k>15)left.push(`${t} ${r.join('-')} at #${k}`) } }) }
console.log(`top 40, 8 seasons: ${inv} of ${pairs} pairs ranked against a record 2+ games better`+(ex.length?'\n  '+ex.join('\n  '):''));
console.log(`teams with 10+ wins and 0-1 losses ranked outside the top 15: ${left.length}`+(left.length?': '+left.slice(0,6).join('; '):''));
