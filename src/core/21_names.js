/* Player surnames, wider (round 49). Each sport drew from 55 to 61 surnames, so six rosters in ten shared one, college
   football's nearly all, often three deep ("Pettigrew x3"). playerName still draws a first name and a surname from its
   own list, the same two draws as before, so every result is unchanged; the surname is then read through this wider
   list by a hash of the pair: the same draws, more names. */
const WIDE_LAST=["Abernathy","Achterberg","Adebayo","Agbaje","Aguilar","Ahlgren","Akintola","Alcorn","Aldana","Alvarado",
"Amadi","Ambrose","Ancheta","Arceneaux","Archuleta","Arnaud","Arrington","Ashby","Atwater","Ayodele","Babineaux","Bachman",
"Baek","Balogun","Bancroft","Barbosa","Barksdale","Battaglia","Beaumont","Becerra","Belanger","Benavides","Bergeron",
"Bertrand","Bjornstad","Blackwood","Blanchard","Bolden","Bonilla","Bouchard","Boudreaux","Brannigan","Brathwaite",
"Breckenridge","Brisbane","Brockman","Bustamante","Cabrera","Calloway","Camacho","Carrasco","Castile","Cervantes",
"Chukwu","Cisneros","Claiborne","Coleridge","Contreras","Corriveau","Covington","Crenshaw","Cuthbert","Dabney","Dalby",
"Dandridge","Dearborn","Desrosiers","Dimitrov","Dorsett","Draper","Dubois","Dumont","Duquette","Eberhardt","Egwu",
"Ellington","Emenike","Escobar","Espinoza","Etheridge","Ezeh","Fairbanks","Falcone","Farrow","Faulkner","Fennell",
"Figueroa","Fitzgerald","Fontenot","Forsberg","Fullerton","Gaines","Galloway","Garnett","Gauthier","Gentry","Giordano",
"Goodwin","Granger","Greaves","Grigsby","Guidry","Gustafson","Haddad","Halvorsen","Hammond","Harlan","Hartsfield",
"Hatcher","Haverford","Hebert","Hendrix","Hinojosa","Holloway","Huckaby","Ibekwe","Ingram","Iwobi","Jaramillo","Jessup",
"Juarez","Kaminski","Karlsson","Keane","Kettering","Kimbrough","Kingsley","Kirkwood","Kofi","Krueger","Lachance",
"Lafleur","Landry","Langston","Laroche","Ledbetter","Lemieux","Lindqvist","Lockhart","Lombardi","Lundgren","Maddox",
"Malone","Mancini","Marchand","Marlowe","Mbeki","McCullough","Medeiros","Mendoza","Merriweather","Mitchum","Moncrief",
"Montague","Moreau","Moynihan","Munoz","Nakamura","Navarro","Ndiaye","Nesbitt","Nordstrom","Nunez","Obi","Ochoa",
"Odom","Ogbonna","Olsen","Onyeka","Orozco","Ouellette","Pacheco","Padilla","Pankratz","Paquette","Pemberton","Penick",
"Peralta","Perrault","Pinckney","Plummer","Poirier","Prioleau","Quarles","Quintero","Radcliffe","Ramsey","Rasmussen",
"Redmond","Rigsby","Rinaldi","Rochester","Rousseau","Rutherford","Saavedra","Sakamoto","Salinger","Santana","Saucier",
"Schaefer","Seabrook","Sepulveda","Shackleford","Silvestri","Simmonds","Slocum","Soto","Spearman","Stanhope",
"Steadman","Strickland","Sundqvist","Swann","Tafoya","Takahashi","Talbert","Tanaka","Teague","Thornbury","Toussaint",
"Trujillo","Tubman","Underhill","Uzoma","Valdez","Valentin","Vanterpool","Varga","Villanueva","Waddell","Wakefield",
"Walcott","Watanabe","Wexler","Whitlock","Wilder","Winslow","Woodard","Wyatt","Yancey","Yeboah","Ybarra","Zamora",
"Zeller","Zielinski","Zimmerman"];
function wideLast(f,l,base){ const pool=wideLast.pool||(wideLast.pool=Array.from(new Set(base.concat(WIDE_LAST))));
  return pool[strHash(f+"/"+l)%pool.length] }
/* a new roster (a league's first day): no surname twice, a repeat re-read by hash, so no draw moves. Rosters later
   fill from drafts, classes and transfers, where a shared surname can still come (real rosters have them too), and
   commentary then adds the initial (surnameIn). */
function distinctSurnames(r){ const pool=wideLast.pool||[], seen=new Set(), last=n=>n.slice(n.indexOf(" ")+1);
  r.forEach((p,i)=>{ if(!p||!p.n||!pool.length)return; let l=last(p.n);
    if(seen.has(l)){ const h=strHash(p.n+"|"+i); for(let k=0;k<pool.length&&seen.has(l);k++)l=pool[(h+k)%pool.length]; p.n=p.n.slice(0,p.n.indexOf(" ")+1)+l }
    seen.add(l) });
  return r }
