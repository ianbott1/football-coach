# Generates src/leagues/ncaab/04_teams.js from data/ncaab_2026_27.py.
import re, json, sys, colorsys
sys.path.insert(0,'data')
from ncaab_2026_27 import CONF, TRANSITIONING
# conference level, Elo relative to an average Division I team (a starting
# prior, tuned by calibration against real tournament results)
LEVEL={"SEC":210,"Big Ten":200,"Big 12":205,"ACC":160,"Big East":175,"Pac-12":110,"Mountain West":75,
 "Atlantic 10":70,"West Coast":45,"American":60,"Missouri Valley":35,"Conference USA":15,"Sun Belt":0,
 "MAC":5,"Big West":5,"CAA":0,"Horizon League":-10,"Ivy League":0,"Southern":-10,"Summit League":-25,
 "Big Sky":-35,"Ohio Valley":-50,"Metro":-40,"UAC":-45,"Southland":-60,"America East":-55,"Patriot League":-45,
 "Big South":-45,"ASUN":-40,"NEC":-95,"MEAC":-130,"SWAC":-140}
# colours from the football league where the school is also there (its names differ a little)
cfb=open('src/leagues/cfb/05_league.js',encoding='utf-8').read()
m=re.search(r'colors:(\{.*?\}),\n',cfb); CFB=json.loads(m.group(1))
ALIAS={"San Diego State":"San Diego St","Washington State":"Washington St","Appalachian State":"App State",
 "Coastal Carolina":"Coastal Car","Georgia State":"Ga State","Georgia Southern":"Georgia South","Northern Illinois":"Northern Ill",
 "Central Michigan":"Central Mich","Eastern Michigan":"Eastern Mich","Western Michigan":"Western Mich","Florida Atlantic":"FAU",
 "Jacksonville State":"Jacksonville St","Middle Tennessee":"Middle Tenn","New Mexico State":"New Mexico St","Western Kentucky":"Western Ky"}
# primary colours for basketball schools not in the football league (as known)
KNOWN={"Gonzaga":"#041E42","Villanova":"#00205B","Creighton":"#005CA9","Xavier":"#0C2340","Marquette":"#003366",
 "Butler":"#13294B","Providence":"#000000","St. John's":"#BA0C2F","Seton Hall":"#004488","Georgetown":"#041E42",
 "DePaul":"#005EB8","UConn":"#000E2F","Dayton":"#CE1141","VCU":"#F8B800","Saint Louis":"#003DA5","Davidson":"#AC1A2F",
 "Richmond":"#990000","Saint Mary's":"#06315B","San Francisco":"#00543C","Santa Clara":"#862633","Loyola Chicago":"#8A2432",
 "Wichita State":"#FFCD00","Drake":"#004477","Bradley":"#A50000","Belmont":"#002469","Murray State":"#002144",
 "Grand Canyon":"#522398","Vermont":"#154734","UMBC":"#000000","Princeton":"#E77500","Penn":"#011F5B","Yale":"#00356B",
 "Harvard":"#A51C30","Iona":"#6F2C3F","Saint Peter's":"#0072CE","Siena":"#006B54","Oral Roberts":"#002D72",
 "South Dakota State":"#0033A0","North Dakota State":"#0A5640","Colgate":"#821019","Bucknell":"#E87722","Lehigh":"#653600",
 "Furman":"#582C83","Chattanooga":"#00386B","Wofford":"#886E4C","UNC Greensboro":"#0F2044","Samford":"#002D72",
 "Charleston":"#800000","UNC Wilmington":"#006666","Hofstra":"#003591","Northeastern":"#C8102E","Drexel":"#07294D",
 "Oakland":"#B59A57","Northern Kentucky":"#FFC72C","Wright State":"#006341","Cleveland State":"#006A4D","Milwaukee":"#FFBD00",
 "Montana":"#70182B","Montana State":"#003875","Weber State":"#492365","Eastern Washington":"#A10022","Idaho":"#B3A369",
 "High Point":"#330072","Winthrop":"#872434","UNC Asheville":"#003DA5","Long Beach State":"#000000","UC Irvine":"#0064A4",
 "UC Santa Barbara":"#003660","Cal State Fullerton":"#00274C","UC San Diego":"#182B49","McNeese":"#00529B",
 "Stephen F. Austin":"#5F259F","Texas A&M-Corpus Christi":"#0067C5","Howard":"#003A63","Norfolk State":"#007A53",
 "Texas Southern":"#850000","Grambling State":"#000000","Southern":"#0033A0","Jackson State":"#002147",
 "Lipscomb":"#34235F","Florida Gulf Coast":"#00885A","Stetson":"#006747","Queens":"#002D72","Bellarmine":"#BE0F34",
 "Fairleigh Dickinson":"#72293C","Wagner":"#00483A","LIU":"#69B3E7","Morehead State":"#005EB8","SIU Edwardsville":"#E03A3E",
 "Tennessee State":"#00539F","Southeast Missouri":"#C8102E","Abilene Christian":"#4F2D7F","Austin Peay":"#C41E3A",
 "Little Rock":"#6F263D","Eastern Kentucky":"#861F41","American":"#C4122F","Boston University":"#CC0000",
 "Holy Cross":"#602D89","Duquesne":"#041E42","Rhode Island":"#75B2DD","George Mason":"#006633","George Washington":"#002856",
 "St. Bonaventure":"#54261A","Saint Joseph's":"#9E1B32","La Salle":"#003057","Fordham":"#860038","Pepperdine":"#00205C",
 "Loyola Marymount":"#8A0020","Portland":"#512C7F","Pacific":"#F47920","San Diego":"#003B70","Seattle U":"#AA0000",
 "Denver":"#8B2332","Utah Valley":"#275D38","Cal Baptist":"#002554","Northern Iowa":"#4B116F","Indiana State":"#0033A0",
 "Illinois State":"#CE1126","Southern Illinois":"#720000","Evansville":"#4F2683","Valparaiso":"#613318","UIC":"#001E62",
 "ETSU":"#041E42","Mercer":"#F76800","Hampton":"#0033A0","Towson":"#FFBB00","William & Mary":"#115740","Elon":"#73000A",
 "Campbell":"#F58025","Monmouth":"#002245","Stony Brook":"#990000","North Carolina A&T":"#004684","Detroit Mercy":"#A6192E",
 "Robert Morris":"#14234B","Green Bay":"#046A38","Purdue Fort Wayne":"#0B2341","Youngstown State":"#CE1141","IU Indy":"#990000"}
def fallback(name,conf,i):
    # a readable colour from the conference's own hue, varied by school
    h=(sum(map(ord,conf))%360)/360.0; h=(h+i*0.137)%1.0
    r,g,b=colorsys.hls_to_rgb(h,0.34,0.55)
    return '#%02X%02X%02X'%(int(r*255),int(g*255),int(b*255))
teams=[]; unknown=0
for conf,lst in CONF.items():
    for i,(n,nick,apps,ff,titles,yrs) in enumerate(lst):
        recent=len([y for y in yrs.split() if int(y)>=21]); older=len([y for y in yrs.split() if int(y)<21])
        pedigree=recent*24+older*9+min(apps,40)*1.6+ff*5+titles*7
        col=CFB.get(ALIAS.get(n,n)) or CFB.get(n) or KNOWN.get(n)
        if not col: unknown+=1; col=fallback(n,conf,i)
        teams.append({"n":n,"nick":nick,"conf":conf,"lvl":LEVEL[conf],"ped":round(pedigree),"c":col,
                      "apps":apps,"ff":ff,"titles":titles,"yrs":yrs,"trans":n in TRANSITIONING})
out='''/* ============ college basketball: the schools ============ */
/* Generated by data/build_ncaab.py from data/ncaab_2026_27.py: every
   Division I school in its 2026-27 conference (365, in 32 conferences),
   with its NCAA tournament history. lvl: the conference's level, ped: the
   program's pedigree (recent tournament appearances count most), both in
   Elo, a starting prior. c: primary colour. trans: transitioning from
   Division II, not eligible for the NCAA tournament. */
const NCAAB_TEAMS='''+json.dumps(teams,separators=(',',':'))+''';
const NCAAB_CONFS='''+json.dumps(list(CONF.keys()))+''';
'''
open('src/leagues/ncaab/04_teams.js','w',encoding='utf-8').write(out)
print(len(teams),"teams;",unknown,"with a fallback colour")
top=sorted(teams,key=lambda t:-(t["lvl"]+t["ped"]))[:12]
print("strongest priors:",", ".join(f'{t["n"]} {t["lvl"]+t["ped"]}' for t in top))
bot=sorted(teams,key=lambda t:(t["lvl"]+t["ped"]))[:5]
print("weakest priors:",", ".join(f'{t["n"]} {t["lvl"]+t["ped"]}' for t in bot))
