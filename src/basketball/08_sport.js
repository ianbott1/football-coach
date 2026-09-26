/* ============ sport: basketball ============ */
const SPORT={
  id:"basketball",
  staff:{
    oc:{short:"OFF", long:"offensive assistant"},
    dc:{short:"DEF", long:"defensive assistant"},
    any:"assistant"
  },
  /* a game worth a headline, or null */
  starLine(P,L){
    if(!L)return null;
    const dd=[L.pts>=10,L.reb>=10,L.ast>=10].filter(Boolean).length;
    let v=0,txt="";
    if(dd>=3){v=150+L.pts;txt=`a triple-double: ${L.pts} points, ${L.reb} rebounds, ${L.ast} assists`}
    else if(L.pts>=30){v=L.pts*3+L.reb;txt=`${L.pts} points${L.tpm>=5?", "+L.tpm+" of them from three":""}`}
    else if(L.reb>=15){v=L.reb*5+L.pts;txt=`${L.pts} points and ${L.reb} rebounds`}
    else if(L.ast>=10){v=L.ast*7+L.pts;txt=`${L.pts} points and ${L.ast} assists`}
    else if(L.blk>=5){v=L.blk*14+L.pts;txt=`${L.blk} blocks`}
    return v?{v:v,txt:txt}:null;
  },
  riser:{l:"Rising assistant",
    d:"The hottest assistant in the country. Could be the next great one, could be a lifer on someone else's bench."}
};
