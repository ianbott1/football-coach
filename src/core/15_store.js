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
