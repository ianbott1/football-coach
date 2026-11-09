/* ============ storage ============ */
/* Where saves live. Inside Claude's artifact viewer that is window.storage;
   anywhere else (the published site, a file opened locally) it is the
   browser's localStorage. The shared league table needs window.storage and
   is simply unavailable elsewhere. Every call resolves; failures resolve to
   null rather than throwing. */
/* Round 46: saves live in IndexedDB. All six games share one origin, and localStorage gave them one allowance of
   about 5 MB between them; a veteran career is 240 KB to 1.7 MB, so a few long careers filled it and every save after
   that silently failed (Muse, round 20). IndexedDB's allowance is a share of the disk. A key not yet in IndexedDB is
   read from localStorage and copied across the first time it's read; the localStorage copy stays as it was (a
   fallback if the browser ever clears the database, and what an older cached page would still see), and is removed
   only when the key is deleted, so an erased career can't come back from it. Where IndexedDB can't open (some
   private windows, the test harness) everything works as before, on localStorage. */
const IDB_ON=true, IDB_NAME="coach-games", IDB_STORE="kv";
const idb=(function(){
  let P=null;
  const open=()=>{ if(P)return P;
    P=new Promise(res=>{ try{
        if(!IDB_ON||typeof indexedDB==="undefined"||!indexedDB){ res(null); return }
        const rq=indexedDB.open(IDB_NAME,1); let done=false; const fin=v=>{ if(!done){ done=true; res(v) } };
        rq.onupgradeneeded=()=>{ try{ rq.result.createObjectStore(IDB_STORE) }catch(e){} };
        rq.onsuccess=()=>{ const db=rq.result; db.onversionchange=()=>{ try{ db.close() }catch(e){} P=null }; fin(db) };
        rq.onerror=()=>fin(null); rq.onblocked=()=>fin(null);
        setTimeout(()=>fin(null),4000);   // a database that never answers is no database
      }catch(e){ res(null) } });
    P.then(db=>{ if(db)try{ if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{}) }catch(e){} });
    return P };
  const req=(db,mode,fn)=>new Promise(res=>{ try{ const tx=db.transaction(IDB_STORE,mode), os=tx.objectStore(IDB_STORE), r=fn(os);
      let val; if(r)r.onsuccess=()=>{ val=r.result };
      tx.oncomplete=()=>res({ok:true,val:val}); tx.onerror=()=>res({ok:false}); tx.onabort=()=>res({ok:false}) }catch(e){ res({ok:false}) } });
  return {
    open:open,
    async get(k){ const db=await open(); if(!db)return {ok:false}; return req(db,"readonly",os=>os.get(k)) },
    async set(k,v){ const db=await open(); if(!db)return {ok:false}; return req(db,"readwrite",os=>os.put(v,k)) },
    async del(k){ const db=await open(); if(!db)return {ok:false}; return req(db,"readwrite",os=>os.delete(k)) },
    async keys(){ const db=await open(); if(!db)return {ok:false}; return req(db,"readonly",os=>os.getAllKeys?os.getAllKeys():null) },
  };
})();
const store=(function(){
  const claude=()=>{try{return (window.storage&&typeof window.storage.get==="function")?window.storage:null}catch(e){return null}};
  // reading needs no test write: with storage full the probe's write failed, every read came back empty, the
  // title screen showed three empty slots over careers still there, and the save check (reading the revision)
  // got nothing and called it "changed in another tab" (Muse, round 42: careers lost after Reload)
  const local=()=>{try{const L=window.localStorage||localStorage; void L.length; return L}catch(e){return null}};
  let usingIdb=null;   // known once the database has opened (or failed to)
  idb.open().then(db=>{ usingIdb=!!db });
  return {
    kind(){ return claude()?"claude":usingIdb?"database":local()?"browser":"none" },
    // can it take a write right now? (full or blocked storage says no; the database is checked on the write itself)
    writable(){ if(claude()||usingIdb)return true; const L=local(); if(!L)return false; try{ L.setItem("__fc_probe","1"); L.removeItem("__fc_probe"); return true }catch(e){ return false } },
    async get(k,shared){
      const W=claude(); if(W){try{return await W.get(k,shared)}catch(e){return null}}
      if(shared)return null;
      const L=local(), D=await idb.get(k);
      if(D.ok&&D.val!==undefined&&D.val!==null)return {key:k,value:D.val};
      const v=L?L.getItem(k):null; if(v===null)return null;
      if(D.ok)await idb.set(k,v);   // copied across on first read; the localStorage copy stays
      return {key:k,value:v};
    },
    async set(k,v,shared){
      const W=claude(); if(W){try{return await W.set(k,v,shared)}catch(e){return null}}
      if(shared)return null;
      const D=await idb.set(k,v); if(D.ok)return {key:k,value:v};
      if(usingIdb)return null;   // the database refused it: a real failure, not a reason to fall back to a full localStorage
      const L=local(); if(!L)return null;
      try{L.setItem(k,v); return {key:k,value:v}}catch(e){return null}      // full, or blocked
    },
    async delete(k,shared){
      const W=claude(); if(W){try{return await W.delete(k,shared)}catch(e){return null}}
      if(shared)return null;
      await idb.del(k); const L=local(); if(L)try{ L.removeItem(k) }catch(e){}
      return {key:k,deleted:true};
    },
    async list(prefix,shared){
      const W=claude(); if(W){try{return await W.list(prefix,shared)}catch(e){return null}}
      if(shared)return null;
      const keys=new Set(), D=await idb.keys(); if(D.ok&&D.val)D.val.forEach(k=>{ if(typeof k==="string"&&(!prefix||k.indexOf(prefix)===0))keys.add(k) });
      const L=local(); if(L)for(let i=0;i<L.length;i++){const k=L.key(i); if(!prefix||k.indexOf(prefix)===0)keys.add(k)}
      return {keys:[...keys],prefix:prefix};
    }
  };
})();

/* Saves are compressed with LZW: the JSON is turned into UTF-8 bytes, the
   byte string is LZW-coded (codes 0-255 bytes, 256 end of data, dictionary
   from 257, up to 15 bits), and the bits are packed 15 to a UTF-16 character
   (offset past the control range, never a surrogate), a string any store
   accepts. Old saves, plain JSON, still load. */
const SAVE_TAG="LZW1:";
/* codes are looked up by number (previous code * 256 + next byte) and written
   whole, 15 bits to a character; same output as the plain bit-by-bit version */
function lzwPack(str){
  const bytes=unescape(encodeURIComponent(str));
  const END=256, dict=new Map(); let next=257, bits=9, w=-1, acc=0, nacc=0; const out=[];
  // append a whole code at once; flush 15 bits at a time (acc never exceeds 30 bits)
  const emit=code=>{ acc=(acc<<bits)|code; nacc+=bits;
    while(nacc>=15){ nacc-=15; out.push(String.fromCharCode(((acc>>>nacc)&0x7fff)+32)); acc&=(1<<nacc)-1 } };
  for(let i=0;i<bytes.length;i++){
    const c=bytes.charCodeAt(i);
    if(w<0){w=c;continue}
    const key=w*256+c, hit=dict.get(key);
    if(hit!==undefined){w=hit;continue}
    emit(w);
    if(next<32767){dict.set(key,next++); if(next>(1<<bits)&&bits<15)bits++}
    w=c;
  }
  if(w>=0)emit(w);
  emit(END);
  if(nacc>0)out.push(String.fromCharCode(((acc<<(15-nacc))&0x7fff)+32));
  return SAVE_TAG+out.join("");
}
function lzwUnpack(s){
  if(s.indexOf(SAVE_TAG)!==0)return s;                 // an old, uncompressed save
  s=s.slice(SAVE_TAG.length);
  const END=256, dict=[]; let next=257, bits=9, pos=0, cur=0, ncur=0; const out=[];
  const read=()=>{let v=0;for(let b=0;b<bits;b++){ if(ncur===0){ if(pos>=s.length)return -1; cur=s.charCodeAt(pos++)-32; ncur=15 }
      v=(v<<1)|((cur>>(--ncur))&1)} return v};
  let prev=null;
  while(true){
    const c=read(); if(c<0||c===END)break;
    let e;
    if(c<256) e=String.fromCharCode(c);
    else if(dict[c]!==undefined) e=dict[c];
    else if(c===next&&prev!==null) e=prev+prev[0];
    else throw new Error("save data is damaged");
    out.push(e);
    if(prev!==null&&next<32767){dict[next++]=prev+e[0]; if(next>=(1<<bits)&&bits<15)bits++}
    prev=e;
  }
  return decodeURIComponent(escape(out.join("")));
}
