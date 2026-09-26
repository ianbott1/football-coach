/* ============ sport: football ============ */
/* What the core needs to know about the sport itself, as words: the two
   assistants every staff has (one for each side of the ball), and the kind
   of up-and-comer a program hires as head coach. A second sport defines
   its own SPORT. */
const SPORT={
  id:"football",
  staff:{
    oc:{short:"OC", long:"offensive coordinator"},
    dc:{short:"DC", long:"defensive coordinator"},
    any:"coordinator"
  },
  /* a game worth a headline, or null: {v: how big, txt: "300 yards and 3 touchdowns"} */
  starLine(P,L){
    let v=0,txt="";
    if(P==="QB"&&L.pyd>=300){v=L.pyd+L.ptd*45;txt=`${L.pyd} yards and ${L.ptd} touchdown${L.ptd===1?"":"s"}`}
    else if(P==="RB"&&L.ryd>=150){v=L.ryd*1.5+L.rtd*45;txt=`${L.ryd} rushing yards and ${L.rtd} score${L.rtd===1?"":"s"}`}
    else if((P==="WR"||P==="WR2")&&L.cyd>=140){v=L.cyd*1.6+L.ctd*45;
      txt=`${L.rec} catch${L.rec===1?"":"es"} for ${L.cyd} yards`}
    else if(P==="EDGE"&&L.sck>=2){v=L.sck*90;txt=`${L.sck} sack${L.sck===1?"":"s"}`}
    else if((P==="CB"||P==="S")&&L.ints>=2){v=L.ints*95;txt=`${L.ints} interception${L.ints===1?"":"s"}`}
    return v?{v:v,txt:txt}:null;
  },
  riser:{l:"Rising coordinator",
    d:"Hottest name on the market. Could be the next great one, could be a coordinator forever."}
};
