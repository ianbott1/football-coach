/* ============ storage ============ */
/* Where saves live. Inside Claude's artifact viewer that is window.storage;
   anywhere else (the published site, a file opened locally) it is the
   browser's localStorage. The shared league table needs window.storage and
   is simply unavailable elsewhere. Every call resolves; failures resolve to
   null rather than throwing. */
const store=(function(){
  const claude=()=>{try{return (window.storage&&typeof window.storage.get==="function")?window.storage:null}catch(e){return null}};
  const local=()=>{try{const L=window.localStorage||localStorage, t="__fc_probe";
    L.setItem(t,"1"); L.removeItem(t); return L}catch(e){return null}};
  return {
    kind(){ return claude()?"claude":local()?"browser":"none" },
    async get(k,shared){
      const W=claude(); if(W){try{return await W.get(k,shared)}catch(e){return null}}
      const L=!shared&&local(); if(!L)return null;
      const v=L.getItem(k); return v===null?null:{key:k,value:v};
    },
    async set(k,v,shared){
      const W=claude(); if(W){try{return await W.set(k,v,shared)}catch(e){return null}}
      const L=!shared&&local(); if(!L)return null;
      try{L.setItem(k,v); return {key:k,value:v}}catch(e){return null}      // full, or blocked
    },
    async delete(k,shared){
      const W=claude(); if(W){try{return await W.delete(k,shared)}catch(e){return null}}
      const L=!shared&&local(); if(!L)return null;
      L.removeItem(k); return {key:k,deleted:true};
    },
    async list(prefix,shared){
      const W=claude(); if(W){try{return await W.list(prefix,shared)}catch(e){return null}}
      const L=!shared&&local(); if(!L)return null;
      const keys=[]; for(let i=0;i<L.length;i++){const k=L.key(i); if(!prefix||k.indexOf(prefix)===0)keys.push(k)}
      return {keys:keys,prefix:prefix};
    }
  };
})();

/* Saves are compressed with LZW: the JSON is turned into UTF-8 bytes, the
   byte string is LZW-coded (codes 0-255 bytes, 256 end of data, dictionary
   from 257, up to 15 bits), and the bits are packed 15 to a UTF-16 character
   (offset past the control range, never a surrogate), a string any store
   accepts. Old saves, plain JSON, still load. */
const SAVE_TAG="LZW1:";
function lzwPack(str){
  const bytes=unescape(encodeURIComponent(str));
  const END=256, dict=new Map(); let next=257, bits=9, w="", acc=0, nacc=0; const out=[];
  const emit=code=>{ for(let b=bits-1;b>=0;b--){ acc=(acc<<1)|((code>>b)&1); if(++nacc===15){out.push(String.fromCharCode(acc+32)); acc=0; nacc=0} } };
  for(let i=0;i<bytes.length;i++){
    const wc=w+bytes[i];
    if(wc.length===1||dict.has(wc)){w=wc;continue}
    emit(w.length===1?w.charCodeAt(0):dict.get(w));
    if(next<32767){dict.set(wc,next++); if(next>(1<<bits)&&bits<15)bits++}
    w=bytes[i];
  }
  if(w)emit(w.length===1?w.charCodeAt(0):dict.get(w));
  emit(END);
  if(nacc>0)out.push(String.fromCharCode((acc<<(15-nacc))+32));
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
