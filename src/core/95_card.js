/* ============ the season card ============ */
/* A single square image you can actually send to someone. Drawn as plain SVG
   so it rasterises to PNG without any library, and with fonts that exist
   everywhere rather than the webfont, which wouldn't survive the export. */

const CARD_W = 1080, CARD_H = 1080;

function cardFit(text, max, size){
  const est = String(text).length * size * 0.52;
  return est > max ? Math.floor(size * max / est) : size;
}

function seasonCardSVG(h, team){
  const c = h.card || {};
  const ink   = teamColor(team);
  const ink2  = teamInk ? teamInk(team) : ink;
  const rec   = h.rec || "";
  const big   = h.champion===team ? "NATIONAL CHAMPIONS"
              : c.confChampLine ? c.confChampLine
              : (h.confChamp ? (c.conf||"Conference").toUpperCase()+" CHAMPIONS"
              : (h.rank ? "FINISHED No. "+h.rank : (h.result||"")));
  const teamSize = cardFit(team, 880, 132);
  const bigSize  = cardFit(big, 940, 52);

  const stat=(x,label,value,vs)=>`
    <text x="${x}" y="740" text-anchor="middle" fill="#E9E5DA" font-size="${vs||86}"
      font-family="Impact,'Arial Black','Helvetica Neue',sans-serif">${esc(value)}</text>
    <text x="${x}" y="786" text-anchor="middle" fill="#7C879C" font-size="24"
      font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="3">${esc(label)}</text>`;

  const bw = c.bestWin;
  const bwLine = bw
    ? `Beat ${bw.rank?"No. "+bw.rank+" ":""}${bw.opp}, ${bw.score}`
    : (h.result||"");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}"
      width="${CARD_W}" height="${CARD_H}">
    <rect width="${CARD_W}" height="${CARD_H}" fill="#10131C"/>
    <rect x="0" y="0" width="${CARD_W}" height="14" fill="${ink}"/>
    <rect x="0" y="196" width="${CARD_W}" height="3" fill="#2A3145"/>

    <text x="64" y="112" fill="#7C879C" font-size="30"
      font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="7">SEASON ${esc(h.year)}</text>
    <text x="${CARD_W-64}" y="112" text-anchor="end" fill="#7C879C" font-size="30"
      font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="3">${esc(c.coach||"")}</text>
    <text x="64" y="160" fill="#7C879C" font-size="26"
      font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="3">${esc(c.conf||"")}</text>

    <text x="${CARD_W/2}" y="330" text-anchor="middle" fill="${ink2}" font-size="${teamSize}"
      font-family="Impact,'Arial Black','Helvetica Neue',sans-serif"
      letter-spacing="2">${esc(String(team).toUpperCase())}</text>

    <text x="${CARD_W/2}" y="512" text-anchor="middle" fill="#E9E5DA" font-size="172"
      font-family="Impact,'Arial Black','Helvetica Neue',sans-serif">${esc(rec)}</text>

    <rect x="${CARD_W/2-470}" y="560" width="940" height="82" fill="${ink}" opacity="0.16"/>
    <rect x="${CARD_W/2-470}" y="560" width="6" height="82" fill="${ink}"/>
    <text x="${CARD_W/2}" y="616" text-anchor="middle" fill="#E9E5DA" font-size="${bigSize}"
      font-family="Impact,'Arial Black','Helvetica Neue',sans-serif"
      letter-spacing="3">${esc(big)}</text>

    ${stat(210,"CONFERENCE",c.confRec||"—")}
    ${stat(540,"POLL", h.rank?("#"+h.rank):"NR")}
    ${stat(870,"TITLES", String(c.titles||0))}

    <rect x="64" y="838" width="${CARD_W-128}" height="3" fill="#2A3145"/>
    <text x="${CARD_W/2}" y="896" text-anchor="middle" fill="#B4BCCB" font-size="34"
      font-family="'Helvetica Neue',Helvetica,Arial,sans-serif">${esc(bwLine)}</text>

    <svg x="60" y="936" width="86" height="86" viewBox="0 0 72 72"
      preserveAspectRatio="xMidYMid meet">${owlSVG("cardowl",false)}</svg>
    <text x="166" y="986" fill="#F4A63A" font-size="44"
      font-family="Impact,'Arial Black','Helvetica Neue',sans-serif"
      letter-spacing="2">FOOTBALL COACH</text>
    <text x="166" y="1020" fill="#7C879C" font-size="23"
      font-family="ui-monospace,Menlo,Consolas,monospace"
      letter-spacing="2">ianbott1.github.io/football-coach</text>
  </svg>`;
}

/* The same season as a line of text, for anywhere an image won't go. */
function seasonCardText(h, team){
  const c=h.card||{};
  const bits=[`${team} ${h.rec} (${c.confRec} ${c.conf})`];
  if(h.champion===team)bits.push("NATIONAL CHAMPIONS");
  else if(h.confChamp)bits.push(`${c.conf} champions`);
  else if(h.rank)bits.push(`finished No. ${h.rank}`);
  if(c.bestWin)bits.push(`beat ${c.bestWin.rank?"No. "+c.bestWin.rank+" ":""}${c.bestWin.opp} ${c.bestWin.score}`);
  return `${c.coach}, ${h.year}. ${bits.join(" \u2014 ")}. Football Coach: ianbott1.github.io/football-coach`;
}

/* Rasterise the SVG to a PNG blob so it can be shared or saved as a real image. */
function cardBlob(svg){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
    img.onload=()=>{
      try{
        const cv=document.createElement("canvas");
        cv.width=CARD_W; cv.height=CARD_H;
        const cx=cv.getContext("2d");
        cx.fillStyle="#10131C"; cx.fillRect(0,0,CARD_W,CARD_H);
        cx.drawImage(img,0,0,CARD_W,CARD_H);
        cv.toBlob(b=>b?resolve(b):reject(new Error("no blob")),"image/png");
      }catch(e){reject(e)}
    };
    img.onerror=()=>reject(new Error("svg load failed"));
    img.src=url;
  });
}

async function shareCard(h, team){
  const svg=seasonCardSVG(h,team);
  const txt=seasonCardText(h,team);
  const name=`${team.replace(/[^A-Za-z]/g,"")}-${h.year}.png`;
  try{
    const blob=await cardBlob(svg);
    const file=new File([blob],name,{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],text:txt});
      return "shared";
    }
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    return "saved";
  }catch(e){
    try{ await navigator.clipboard.writeText(txt); return "copied" }
    catch(_){ return "failed" }
  }
}

