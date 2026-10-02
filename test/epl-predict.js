/* Soccer Coach: in every division, starting strength predicts the final table
   about as well as in real leagues (rank correlation 0.55+), and a top-three
   club almost never finishes in the bottom six.   node test/epl-predict.js */
const fs=require('fs');const src=fs.readFileSync(require('path').join(__dirname,'golden.js'),'utf8');const m={exports:{}};new Function('require','module',src.slice(0,src.indexOf('const args'))+'\nmodule.exports={load};')(require,m);
const path=require('path');const api=m.exports.load(process.argv.find(a=>a.endsWith('.html'))||path.join(__dirname,'..','dist','soccer-coach.html'));
const rho=(a,b)=>{const n=a.length,ma=a.reduce((x,y)=>x+y)/n,mb=b.reduce((x,y)=>x+y)/n;let c=0,da=0,db=0;for(let i=0;i<n;i++){c+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2}return c/Math.sqrt(da*db)};
const out={}; let topRel=0,topN=0;
for(let seed=1;seed<=4;seed++){ api.newDynasty('Arsenal',seed,'T'); const E=api.SEA; const st={};api.NAMES.forEach(t=>st[t]=E.talent.base[t]);
  let g=0; while(E.phase==='week'&&g++<60)E.advance();
  ['PL','CH','L1','L2','NL','NN','NS'].forEach(d=>{const T=api.NAMES.filter(t=>api.CONF[t]===d), S=T.slice().sort((a,b)=>st[b]-st[a]), F=E.table(d);
    const rs=T.map(t=>S.indexOf(t)+1), rf=T.map(t=>F.indexOf(t)+1); (out[d]=out[d]||[]).push(rho(rs,rf));
    S.slice(0,3).forEach(t=>{topN++; if(F.indexOf(t)>=F.length-6)topRel++}) }) }
console.log('rank correlation, starting strength v final table (1 = perfect):',Object.entries(out).map(([d,v])=>d+' '+(v.reduce((a,b)=>a+b)/v.length).toFixed(2)).join(', '),'(real leagues roughly 0.6-0.8)');
console.log('a top-three-by-strength club finishing in the bottom six:',topRel,'of',topN);
const lowest=Math.min(...Object.values(out).map(v=>v.reduce((a,b)=>a+b)/v.length));
const pass=lowest>=0.55&&topRel<=4;
console.log(pass?'MATCH strength predicts every table':'MISMATCH strength barely predicts a table (lowest '+lowest.toFixed(2)+')'); process.exit(pass?0:1);
