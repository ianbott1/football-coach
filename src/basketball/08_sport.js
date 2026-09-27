/* ============ sport: basketball ============ */
const SPORT={
  id:"basketball",
  word:"Basketball",
  /* what the owl perches on in the logo: the rim, with the backboard behind
     and the net below (the rim sits where football's crossbar does) */
  perch:`<g fill="none" stroke="var(--sodium)" stroke-width="3.2" stroke-linejoin="round">
      <rect x="12" y="7" width="48" height="34" rx="2"/><rect x="28" y="26" width="16" height="12"/>
    </g>
    <path d="M36 41 V47" stroke="var(--sodium)" stroke-width="3" fill="none"/>
    <g fill="none" stroke="var(--bone)" stroke-width="1.3" opacity=".75">
      <path d="M21 51 L25 62 L29 52 L33 63 L36 52 L39 63 L43 52 L47 62 L51 51"/>
      <path d="M24 57 H48"/>
    </g>
    <path d="M19 50 H53" stroke="#E4572E" stroke-width="4.4" stroke-linecap="round"/>
    <ellipse cx="36" cy="67" rx="11.5" ry="2.6" fill="none" stroke="var(--line)" stroke-width="2.2"/>`,
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
