/* ============ schedule: pro football ============ */
/* The league's rotation formula. Every team plays 17 games:
     6  home and away against its three division rivals
     4  against one division in its own conference (3-year rotation)
     4  against one division in the other conference (4-year rotation)
     2  against the same-place teams of the other two own-conference divisions
     1  against a same-place team of an other-conference division (the 17th)
   "Same place" uses the ratings coming into the season as the finishing
   order. Weeks are assigned as an edge colouring, 18 weeks with one bye each,
   repaired with Kempe-chain swaps; byes are then pushed into weeks 5-14. */
function nflPairings(R,year){
  const side=LEAGUE.conf.sides, A=side.AFC, N=side.NFC;
  const members=d=>NAMES.filter(t=>CONF[t]===d).sort((x,y)=>R[y]-R[x]);   // by place
  const M={}; A.concat(N).forEach(d=>M[d]=members(d));
  const g=[];                                   // [away, home, divisionGame]
  const flip=year%2;
  // division: home and away
  A.concat(N).forEach(d=>{const m=M[d];
    for(let i=0;i<m.length;i++)for(let j=i+1;j<m.length;j++){g.push([m[i],m[j],true]);g.push([m[j],m[i],true])}});
  // four against a whole division: A[j] hosts B[j], B[j+1]; visits B[j+2], B[j+3]
  const fourVsFour=(da,db,swap)=>{const a=M[da],b=M[db];
    for(let j=0;j<4;j++)for(let k=0;k<4;k++){
      const off=(k-j+4)%4, aHome=(off<2)!==swap;
      g.push(aHome?[b[k],a[j],false]:[a[j],b[k],false]);
    }};
  const intra=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]][year%3];
  [A,N].forEach(S=>intra.forEach(([x,y])=>fourVsFour(S[x],S[y],!!flip)));
  const k4=year%4;
  for(let i=0;i<4;i++)fourVsFour(A[i],N[(i+k4)%4],!!((i+year)%2));
  // same place, own conference: the two divisions not in this year's
  // pairing. Those four cross pairs form a cycle; walking it gives every
  // division one home and one away.
  [A,N].forEach(S=>{
    const [[p0,p1],[q0,q1]]=intra;                 // cycle p0 - q0 - p1 - q1 - p0
    const cyc=[[p0,q0],[q0,p1],[p1,q1],[q1,p0]];
    for(let p=0;p<4;p++)cyc.forEach(([i,j])=>{
      const a=M[S[i]][p], b=M[S[j]][p], aHome=((p+year)%2)===0;
      g.push(aHome?[b,a,false]:[a,b,false]);
    });
  });
  // the 17th: same place against the other conference, one division over
  for(let i=0;i<4;i++){
    const nd=N[(i+k4+2)%4];
    for(let p=0;p<4;p++){
      const a=M[A[i]][p], b=M[nd][p];
      g.push(flip?[b,a,false]:[a,b,false]);           // AFC hosts in odd years
    }
  }
  return g;
}

function buildSchedule(rng,R,year){
  // the real 2026 season (30_schedule2026.js); the formula for every season after
  if(year===2026&&typeof REAL_NFL2026!=="undefined")
    return REAL_NFL2026.map(([w,a,h,n])=>({week:w,away:a,home:h,conf:CONF[a]===CONF[h],neutral:!!n,real:true,site:null}));
  const W=LEAGUE.weeks, games=nflPairings(R,year);
  for(let attempt=0;attempt<40;attempt++){
    const at={}; NAMES.forEach(t=>at[t]=new Array(W).fill(-1));   // week -> game index
    const wk=new Array(games.length).fill(-1);
    const free=(t,w)=>at[t][w]<0;
    const put=(gi,w)=>{const [a,h]=games[gi];wk[gi]=w;at[a][w]=gi;at[h][w]=gi};
    const lift=gi=>{const [a,h]=games[gi],w=wk[gi];at[a][w]=-1;at[h][w]=-1;wk[gi]=-1};
    const other=(gi,t)=>games[gi][0]===t?games[gi][1]:games[gi][0];
    // Kempe chain: alternate weeks c1/c2 starting from t's c1 game; swap them
    const kempe=(t,c1,c2,avoid)=>{
      const path=[]; let x=t, c=c1, guard=0;
      while(at[x][c]>=0&&guard++<80){const gi=at[x][c]; path.push(gi); x=other(gi,x);
        if(x===avoid)return false; c=(c===c1)?c2:c1;}
      const tgt=path.map(gi=>wk[gi]===c1?c2:c1);
      path.forEach(lift); path.forEach((gi,i)=>put(gi,tgt[i])); return true;
    };
    const order=rng.shuffle(games.map((_,i)=>i));
    // division games prefer the back of the season, like the real thing
    let ok=true;
    for(const gi of order){
      const [a,h]=games[gi];
      const ws=rng.shuffle([...Array(W).keys()]);
      let w=ws.find(w=>free(a,w)&&free(h,w));
      if(w!==undefined){put(gi,w);continue}
      // a free week for each side, then swap a chain to line them up
      const fa=ws.filter(w=>free(a,w)), fh=ws.filter(w=>free(h,w));
      let placed=false;
      for(const c1 of fa){for(const c2 of fh){
        if(c1===c2)continue;
        if(kempe(h,c1,c2,a)&&free(a,c1)&&free(h,c1)){put(gi,c1);placed=true;break}
      } if(placed)break}
      if(!placed){ok=false;break}
    }
    if(!ok)continue;
    // every team now has exactly one empty week: its bye. Push byes into
    // weeks 5-14, at most six teams off in any week.
    const byeOf=t=>at[t].findIndex(x=>x<0);
    const cost=()=>{const cnt=new Array(W).fill(0); let c=0;
      NAMES.forEach(t=>{const b=byeOf(t); cnt[b]++; if(b<4||b>13)c+=10});
      cnt.forEach(n=>{if(n>6)c+=n-6; if(n%2)c+=1}); return c};
    let cur=cost();
    for(let it=0;it<4000&&cur>0;it++){
      const t=rng.pick(NAMES), b=byeOf(t), w=4+rng.int(10);
      if(w===b)continue;
      const snap=wk.slice();
      if(!kempe(t,w,b,null))continue;
      const nc=cost();
      if(nc<=cur){cur=nc;continue}
      NAMES.forEach(x=>at[x].fill(-1)); snap.forEach((w2,i)=>{wk[i]=-1;if(w2>=0)put(i,w2)});
    }
    if(cur>0)continue;                            // try a fresh assignment
    return games.map(([a,h,div],i)=>({week:wk[i],away:a,home:h,conf:div,neutral:false,real:false,site:null}));
  }
  throw new Error("schedule: no valid week assignment found");
}
LEAGUE.buildSchedule=buildSchedule;
