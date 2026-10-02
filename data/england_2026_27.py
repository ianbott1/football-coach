"""The English football pyramid, tiers 1-6, for 2026-27 (as Football Manager's
standard game makes playable). Clubs and stadium capacities from Wikipedia's
2026-27 season pages for the EFL League One, League Two and the National
League (National, North, South), fetched 29 Sept 2026; the Premier League and
Championship clubs are in src/leagues/epl/05_league.js already.
RULES: each division's promotion, play-offs and relegation (2026-27):
  Championship: top 2 up, play-offs 3-8 (six-team, new this season), bottom 3 down
  League One:   top 2 up, play-offs 3-6, bottom 4 down
  League Two:   top 3 up, play-offs 4-7, bottom 2 down
  National:     champion up, play-offs 2-7 (six-team), bottom 4 down (to North or South)
  North, South: champion up, play-offs 2-7 (six-team), bottom 4 down (to step 3:
                not in this game, so the bottom of tier 6 is reprieved)
NS: National League clubs' region (N/S), for where a relegated club goes (by location;
    marked from geography, not from a source)."""
L1=[("AFC Wimbledon",9215),("Barnsley",23287),("Blackpool",16500),("Bradford City",24840),("Bromley",6100),
 ("Burton Albion",6912),("Cambridge United",7937),("Doncaster Rovers",15231),("Huddersfield Town",24121),
 ("Leicester City",32259),("Leyton Orient",9271),("Luton Town",12056),("Mansfield Town",10022),
 ("Milton Keynes Dons",30500),("Notts County",19841),("Oxford United",12500),("Peterborough United",13512),
 ("Plymouth Argyle",17900),("Reading",24161),("Sheffield Wednesday",39732),("Stevenage",7318),
 ("Stockport County",10852),("Wigan Athletic",25138),("Wycombe Wanderers",10446)]
L2=[("Accrington Stanley",5450),("Barnet",6500),("Bristol Rovers",12500),("Cheltenham Town",7066),
 ("Chesterfield",10504),("Colchester United",10105),("Crawley Town",5996),("Crewe Alexandra",10153),
 ("Exeter City",8219),("Fleetwood Town",5327),("Gillingham",11582),("Grimsby Town",9052),("Newport County",7850),
 ("Northampton Town",8203),("Oldham Athletic",13513),("Port Vale",16800),("Rochdale",10249),
 ("Rotherham United",12021),("Salford City",5108),("Shrewsbury Town",9875),("Swindon Town",15728),
 ("Tranmere Rovers",16789),("Walsall",11300),("York City",8500)]
NL=[("AFC Fylde",6000,"N"),("Aldershot Town",7100,"S"),("Altrincham",7700,"N"),("Barrow",6500,"N"),
 ("Boreham Wood",4500,"S"),("Boston United",5061,"N"),("Carlisle United",17949,"N"),("Eastleigh",5250,"S"),
 ("FC Halifax Town",10400,"N"),("Forest Green Rovers",5147,"S"),("Gateshead",11800,"N"),("Harrogate Town",5000,"N"),
 ("Hartlepool United",7856,"N"),("Hornchurch",3500,"S"),("Kidderminster Harriers",6444,"N"),
 ("Scunthorpe United",9088,"N"),("Solihull Moors",5500,"N"),("Southend United",12392,"S"),("Sutton United",5013,"S"),
 ("Tamworth",4565,"N"),("Wealdstone",4085,"S"),("Woking",6036,"S"),("Worthing",4000,"S"),("Yeovil Town",9566,"S")]
NLN=[("AFC Telford United",6300),("Bedford Town",3000),("Brackley Town",3500),("Buxton",5200),("Chester",5400),
 ("Chorley",4100),("Darlington",3300),("Harborough Town",2400),("Hebburn Town",3000),("Hednesford Town",6039),
 ("Hereford",5250),("King's Lynn Town",8200),("Macclesfield",5300),("Marine",3000),("Merthyr Town",4000),
 ("Morecambe",6476),("Oxford City",3500),("Radcliffe",3500),("Scarborough Athletic",3251),("South Shields",4000),
 ("Southport",6008),("Spalding United",2700),("Spennymoor Town",4300),("Worksop Town",3400)]
NLS=[("AFC Totton",3000),("Billericay Town",3500),("Braintree Town",4222),("Chelmsford City",3502),
 ("Chesham United",5000),("Dagenham & Redbridge",6078),("Dorking Wanderers",4250),("Dover Athletic",6500),
 ("Ebbsfleet United",4800),("Farnborough",7000),("Farnham Town",2200),("Folkestone Invicta",4000),
 ("Hampton & Richmond Borough",3500),("Hemel Hempstead Town",3152),("Horsham",3000),("Maidenhead United",4000),
 ("Maidstone United",4200),("Salisbury",5000),("Slough Town",3000),("Tonbridge Angels",3000),("Torquay United",6500),
 ("Truro City",3600),("Walton & Hersham",2097),("Weston-super-Mare",3500)]
if __name__=="__main__":
    for n,l in [("League One",L1),("League Two",L2),("National League",NL),("North",NLN),("South",NLS)]:
        assert len(l)==24,(n,len(l)); print(n,len(l))
    names=[x[0] for x in L1+L2+NL+NLN+NLS]; assert len(set(names))==len(names); print("all distinct:",len(names))
