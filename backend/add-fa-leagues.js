const fs = require('fs');
const path = require('path');

// Raw data from FA Full-Time most visited leagues page
const rawData = `
1	Central Warwickshire Youth Football League	https://fulltime.thefa.com/index.html?league=4385806
2	Eastern Junior Alliance	https://fulltime.thefa.com/index.html?league=257944965
3	Northumberland Football League	https://fulltime.thefa.com/index.html?league=136980506
4	East Manchester Junior Football League ( Charter Standard League )	https://fulltime.thefa.com/index.html?league=8335132
5	Surrey Youth League (SYL)	https://fulltime.thefa.com/index.html?league=863411662
6	Teesside Junior Football Alliance League	https://fulltime.thefa.com/index.html?league=8739365
7	Sheffield & District Junior Sunday League	https://fulltime.thefa.com/index.html?league=5484799
8	YEL East Midlands SATURDAY	https://fulltime.thefa.com/index.html?league=5628447
9	BCFA Youth League	https://fulltime.thefa.com/index.html?league=671683416
10	Norfolk Combined Youth Football League	https://fulltime.thefa.com/index.html?league=303322696
11	Garforth Junior Football League	https://fulltime.thefa.com/index.html?league=13588
12	Midland Junior Premier League	https://fulltime.thefa.com/index.html?league=1182044
13	Cambridgeshire County League	https://fulltime.thefa.com/index.html?league=7984801
14	Warrington Junior Football League	https://fulltime.thefa.com/index.html?league=70836961
15	HUDDERSFIELD FOX ENGRAVERS JUNIOR FOOTBALL LEAGUE	https://fulltime.thefa.com/index.html?league=8747035
16	The FA Women's National League	https://fulltime.thefa.com/index.html?league=872938
17	Kernow Stone St Piran League	https://fulltime.thefa.com/index.html?league=656725252
18	Avon Youth League	https://fulltime.thefa.com/index.html?league=3323170
19	Doncaster & District Youth Football League Sponsored by Doncaster Rovers FC	https://fulltime.thefa.com/index.html?league=8057112
20	Southern Combination Football League	https://fulltime.thefa.com/index.html?league=840602727
21	YEL East Midlands SUNDAY	https://fulltime.thefa.com/index.html?league=515215211
22	Fosters Solicitors Anglian Combination	https://fulltime.thefa.com/index.html?league=4780817
23	GCE Hire Fleet United Counties Football League	https://fulltime.thefa.com/index.html?league=1625657
24	Epsom & Ewell Youth Football League	https://fulltime.thefa.com/index.html?league=6662406
25	Oxfordshire Youth Football League	https://fulltime.thefa.com/index.html?league=6306575
26	Echo Junior Football League	https://fulltime.thefa.com/index.html?league=387606494
27	GCE Hire Fleet Peterborough & District Football League	https://fulltime.thefa.com/index.html?league=6486466
28	Bolton, Bury and District Football League	https://fulltime.thefa.com/index.html?league=760017
29	North East Hampshire Youth League - NEHYL	https://fulltime.thefa.com/index.html?league=9268728
30	Stourbridge & District Youth Football League	https://fulltime.thefa.com/index.html?league=381565593
31	The Milton Keynes & District Development League	https://fulltime.thefa.com/index.html?league=96486
32	Thurlow Nunn League	https://fulltime.thefa.com/index.html?league=958158630
33	Northampton and District Youth Alliance League	https://fulltime.thefa.com/index.html?league=377117096
34	Mid Sussex Youth Football League	https://fulltime.thefa.com/index.html?league=1375655
35	Walsall Junior Youth Football League	https://fulltime.thefa.com/index.html?league=835095895
36	Devon Junior & Minor league	https://fulltime.thefa.com/index.html?league=1548711
37	West Herts Youth League	https://fulltime.thefa.com/index.html?league=945817950
38	Yorkshire Amateur Association Football League	https://fulltime.thefa.com/index.html?league=7058382
39	North Wilts Youth Football League	https://fulltime.thefa.com/index.html?league=8577245
40	Russell Foster Tyne & Wear Football League	https://fulltime.thefa.com/index.html?league=400742710
41	Leicester & District Sunday Juniors League	https://fulltime.thefa.com/index.html?league=9293439
42	Spartan South Midlands Football League	https://fulltime.thefa.com/index.html?league=522238936
43	Sheffield & Hallamshire Women & Girls League	https://fulltime.thefa.com/index.html?league=6066158
44	Hellenic League - Proudly Sponsored by uhlsport	https://fulltime.thefa.com/index.html?league=646734134
45	STROUD & DISTRICT FOOTBALL LEAGUE sponsored by BATEMAN'S SPORTS	https://fulltime.thefa.com/index.html?league=1199765
46	Kent Youth League	https://fulltime.thefa.com/index.html?league=286758524
47	LINCOLNSHIRE CO-OP MID LINCS COUNTY YOUTH FOOTBALL LEAGUE	https://fulltime.thefa.com/index.html?league=4961425
48	Liverpool Premier League	https://fulltime.thefa.com/index.html?league=4075038
49	Hertfordshire Girls Football Partnership League	https://fulltime.thefa.com/index.html?league=4062637
50	Watford Friendly League	https://fulltime.thefa.com/index.html?league=861969338
51	Hull & District Youth Football League And Cup	https://fulltime.thefa.com/index.html?league=512250017
52	Suffolk & Ipswich League	https://fulltime.thefa.com/index.html?league=4358069
53	Medway District Youth League	https://fulltime.thefa.com/index.html?league=1763551
54	Uhlsport Somerset County League	https://fulltime.thefa.com/index.html?league=3894227
55	Cambridge & District Colts League	https://fulltime.thefa.com/index.html?league=7615527
56	Suffolk Youth Football League	https://fulltime.thefa.com/index.html?league=8081905
57	York Football League	https://fulltime.thefa.com/index.html?league=4051434
58	Coventry & Warwickshire Youth League	https://fulltime.thefa.com/index.html?league=167247
59	ProKit UK Essex Olympian Football League	https://fulltime.thefa.com/index.html?league=9630638
60	Dorset League	https://fulltime.thefa.com/index.html?league=3520598
61	Notts Youth Football League (Sat)	https://fulltime.thefa.com/index.html?league=959616059
62	The West Riding Girls Football League	https://fulltime.thefa.com/index.html?league=7960921
63	Cherry Red Records Combined Counties Football League	https://fulltime.thefa.com/index.html?league=3956158
64	North Bury Junior Football League	https://fulltime.thefa.com/index.html?league=2323685
65	Southend & District Youth League	https://fulltime.thefa.com/index.html?league=5770629
66	NRG 24HR Gym Kent County Football League	https://fulltime.thefa.com/index.html?league=3130670
67	Eastham & District Junior & Mini Soccer	https://fulltime.thefa.com/index.html?league=1605730
68	Midland Football League	https://fulltime.thefa.com/index.html?league=6125369
69	Euro Soccer Nottinghamshire Senior League	https://fulltime.thefa.com/index.html?league=9365063
70	Colchester & District Youth Football League	https://fulltime.thefa.com/index.html?league=118005812
71	Timperley & District JFL #NoRespectNoGame	https://fulltime.thefa.com/index.html?league=7712931
72	Gray Hooper Holt LLP Mid Sussex Football League	https://fulltime.thefa.com/index.html?league=568629645
73	Weetabix Youth Football League	https://fulltime.thefa.com/index.html?league=4058074
74	Cheltenham Youth Football League	https://fulltime.thefa.com/index.html?league=4333696
75	Surrey Primary League	https://fulltime.thefa.com/index.html?league=1229286
76	Mid Solent Youth Football League	https://fulltime.thefa.com/index.html?league=3504946
77	Essex Veterans League	https://fulltime.thefa.com/index.html?league=2025888
78	Abacus Lighting Central Midlands Alliance League	https://fulltime.thefa.com/index.html?league=1854955
79	Jewson Western Football League	https://fulltime.thefa.com/index.html?league=3355283
80	National Football Youth League	https://fulltime.thefa.com/index.html?league=889263802
81	Portsmouth Youth Football League	https://fulltime.thefa.com/index.html?league=4306619
82	Essex & Suffolk Border League	https://fulltime.thefa.com/index.html?league=392151903
83	Manchester Football League Limited	https://fulltime.thefa.com/index.html?league=4856192
84	Blackwater and Dengie Youth Football League	https://fulltime.thefa.com/index.html?league=625214
85	Southampton & District Tyro Football League	https://fulltime.thefa.com/index.html?league=223592985
86	Saywell International (Arun and Chichester) Youth Football League	https://fulltime.thefa.com/index.html?league=7943450
87	The West Yorkshire Association Football League	https://fulltime.thefa.com/index.html?league=7516712
88	SSFL Sussex Sunday Football League	https://fulltime.thefa.com/index.html?league=579770755
89	Central Warwickshire Girls Football League	https://fulltime.thefa.com/index.html?league=1749697
90	Surrey County Womens & Girls League (SCWGL)	https://fulltime.thefa.com/index.html?league=675262700
91	Oxfordshire Senior League	https://fulltime.thefa.com/index.html?league=5277609
92	Exeter and District Youth League	https://fulltime.thefa.com/index.html?league=341110202
93	Nene Sunday League	https://fulltime.thefa.com/index.html?league=414131
94	Norfolk Women & Girls' Football League	https://fulltime.thefa.com/index.html?league=1961981
95	Hampshire Girls Youth Football League	https://fulltime.thefa.com/index.html?league=928727854
96	The Cheshire Football League	https://fulltime.thefa.com/index.html?league=833498
97	South West Peninsula League	https://fulltime.thefa.com/index.html?league=510118669
98	Wycombe and South Bucks Minor Football League	https://fulltime.thefa.com/index.html?league=882085998
99	Bedfordshire County Football League	https://fulltime.thefa.com/index.html?league=7195521
100	Herts Senior County League	https://fulltime.thefa.com/index.html?league=20290514
101	West Sussex Football League	https://fulltime.thefa.com/index.html?league=8056794
102	Dorset Youth Football League	https://fulltime.thefa.com/index.html?league=761214726
103	North Staffs Junior Youth League	https://fulltime.thefa.com/index.html?league=587428981
104	Horsham & District Youth Football League	https://fulltime.thefa.com/index.html?league=5957712
105	Cornwall Youth Football League	https://fulltime.thefa.com/index.html?league=331135148
106	Rotherham and District Sunday Football League	https://fulltime.thefa.com/index.html?league=943253937
107	Peterborough and District Junior Alliance LTD FA Accredited League	https://fulltime.thefa.com/index.html?league=1137979
108	Severn Valley Youth Football League	https://fulltime.thefa.com/index.html?league=324121206
109	Northants Combination League	https://fulltime.thefa.com/index.html?league=1141733
110	Fylde & Lancashire Youth Football League	https://fulltime.thefa.com/index.html?league=184825
111	Velocity Wessex Football League	https://fulltime.thefa.com/index.html?league=274386
112	Southern Counties East Football League	https://fulltime.thefa.com/index.html?league=9431449
113	Huddersfield and District AFL Sponsored by YOU Financial Solutions	https://fulltime.thefa.com/index.html?league=4656864
114	Leicestershire Womens and Girls Football League	https://fulltime.thefa.com/index.html?league=2409198
115	Mercian Junior Football League	https://fulltime.thefa.com/index.html?league=1184267
116	Notts Youth Football League (Sun)	https://fulltime.thefa.com/index.html?league=866683373
117	National League U19 Alliance	https://fulltime.thefa.com/index.html?league=209426463
118	Right Car East Riding County League	https://fulltime.thefa.com/index.html?league=9889877
119	Southampton Saturday Football League	https://fulltime.thefa.com/index.html?league=1418322
120	Nottinghamshire Girls and Ladies Football League (Charter Standard League)	https://fulltime.thefa.com/index.html?league=7146236
121	Essex County Girls League	https://fulltime.thefa.com/index.html?league=386153096
122	Craven, Aire & Wharfe Junior League	https://fulltime.thefa.com/index.html?league=1575898
123	Derby City Football League (England Football Accredited League)	https://fulltime.thefa.com/index.html?league=4320233
124	Leicester & District Mutual Football League	https://fulltime.thefa.com/index.html?league=5930712
125	Selby & District Junior Football League	https://fulltime.thefa.com/index.html?league=4220393
126	Kent Girls/Ladies Football League	https://fulltime.thefa.com/index.html?league=9972496
127	Go2Day West Cheshire AF League	https://fulltime.thefa.com/index.html?league=9014877
128	Midland Floodlit Youth League	https://fulltime.thefa.com/index.html?league=569951376
129	Crowborough & District Junior Football League	https://fulltime.thefa.com/index.html?league=4344945
130	Alan Boswell Group Cambridgeshire Girls and Women's Football League	https://fulltime.thefa.com/index.html?league=2373903
131	Cambridgeshire Mini Soccer league	https://fulltime.thefa.com/index.html?league=311448
132	Everards Brewery Leicestershire Senior League	https://fulltime.thefa.com/index.html?league=651281
133	Community & Education Football Alliance League	https://fulltime.thefa.com/index.html?league=215118561
134	Corsham Print Wiltshire Senior League	https://fulltime.thefa.com/index.html?league=8864128
135	STAFFORDSHIRE GIRLS AND LADIES LEAGUE sponsored by Water Plus	https://fulltime.thefa.com/index.html?league=728247907
136	Mid Cheshire Youth Football League	https://fulltime.thefa.com/index.html?league=6725292
137	Central Lancashire Junior Football League	https://fulltime.thefa.com/index.html?league=5698791
138	Telford Junior League	https://fulltime.thefa.com/index.html?league=7820950
139	Southern Amateur Football League	https://fulltime.thefa.com/index.html?league=8831068
140	Torbay Clearance Services, South Devon Football League	https://fulltime.thefa.com/index.html?league=316369219
141	Hampshire Combination & Development Football League	https://fulltime.thefa.com/index.html?league=350066
142	Staffordshire County Senior League	https://fulltime.thefa.com/index.html?league=746837610
143	HO Soccer Taunton & District Youth Football League	https://fulltime.thefa.com/index.html?league=616883141
144	Leicestershire Youth League	https://fulltime.thefa.com/index.html?league=8977038
145	Maidstone Invicta Primary League	https://fulltime.thefa.com/index.html?league=942613
146	East Lancashire Football Alliance	https://fulltime.thefa.com/index.html?league=645059383
147	Birmingham & District Football League	https://fulltime.thefa.com/index.html?league=279203780
148	Thames Valley Premier League	https://fulltime.thefa.com/index.html?league=6151604
149	The Pioneer Youth League	https://fulltime.thefa.com/index.html?league=754494054
150	TAMESIDE FOOTBALL LEAGUE	https://fulltime.thefa.com/index.html?league=9327683
151	Bedfordshire FA Girls Football League	https://fulltime.thefa.com/index.html?league=530158839
152	Midland Football League RFL	https://fulltime.thefa.com/index.html?league=607029258
153	Lancashire and Cheshire AFL	https://fulltime.thefa.com/index.html?league=3194634
154	Bristol & Suburban League	https://fulltime.thefa.com/index.html?league=646510641
155	South Manchester Girls Football League	https://fulltime.thefa.com/index.html?league=9024312
156	Stitch2Print Devon & Exeter Football League	https://fulltime.thefa.com/index.html?league=1593293
157	Sussex Sunday Youth League	https://fulltime.thefa.com/index.html?league=1697069
158	Ambassador Evesham Football League	https://fulltime.thefa.com/index.html?league=7987482
159	Norfolk and Suffolk Youth Football League	https://fulltime.thefa.com/index.html?league=309848368
160	NORTH GLOUCESTERSHIRE FOOTBALL LEAGUE - Sponsor: Express Windows (Coleford)	https://fulltime.thefa.com/index.html?league=2269222
161	Bedfordshire Youth Saturday League	https://fulltime.thefa.com/index.html?league=32913
162	Blackpool and District Youth Football League	https://fulltime.thefa.com/index.html?league=9879535
163	Thurlow Nunn Youth Football League	https://fulltime.thefa.com/index.html?league=129274165
164	Eastern Region Women's Football League	https://fulltime.thefa.com/index.html?league=524403811
165	South East Counties Womens Football League	https://fulltime.thefa.com/index.html?league=9319390
166	M&S Water Services Chiltern Youth Football League	https://fulltime.thefa.com/index.html?league=3025105
167	Leicestershire County Football League	https://fulltime.thefa.com/index.html?league=161403434
168	Testway Youth Football League	https://fulltime.thefa.com/index.html?league=915343751
169	Faversham & District Youth Football League	https://fulltime.thefa.com/index.html?league=1682082
170	North Derbyshire Youth Football League	https://fulltime.thefa.com/index.html?league=9481617
171	SDFL - Salford & Districts Football League	https://fulltime.thefa.com/index.html?league=8880379
172	Peter Houseman Youth League	https://fulltime.thefa.com/index.html?league=7096650
173	Mid Warwickshire U7-U11 Saturday Football League	https://fulltime.thefa.com/index.html?league=479565033
174	Mid Lancashire Colts Junior Football League	https://fulltime.thefa.com/index.html?league=524613107
175	Burton & District Sunday Football League	https://fulltime.thefa.com/index.html?league=8878541
176	Cheshire Girls Football League	https://fulltime.thefa.com/index.html?league=6927625
177	Oxfordshire Girls Football League	https://fulltime.thefa.com/index.html?league=7702944
178	West Riding County Womens Football League	https://fulltime.thefa.com/index.html?league=261525
179	Leicestershire Foxes Sunday League.	https://fulltime.thefa.com/index.html?league=3326454
180	East Kent Youth Football League	https://fulltime.thefa.com/index.html?league=9073273
181	Berkshire County Girls Football League	https://fulltime.thefa.com/index.html?league=4681401
182	Cheshire Veterans Football League	https://fulltime.thefa.com/index.html?league=9717329
183	Essex Senior Football League	https://fulltime.thefa.com/index.html?league=2829940
184	Chesterfield and District Sunday Football League	https://fulltime.thefa.com/index.html?league=722614028
185	Manchester Youth Super League	https://fulltime.thefa.com/index.html?league=930125386
186	Sussex County Women & Girls Football League	https://fulltime.thefa.com/index.html?league=5559379
187	Merseyrail Business House Football League	https://fulltime.thefa.com/index.html?league=3807941
188	CHELTENHAM ASSOCIATION FOOTBALL LEAGUE	https://fulltime.thefa.com/index.html?league=516676
189	Stockport District Sunday Football League.	https://fulltime.thefa.com/index.html?league=884255041
190	Steve Gooch Estate Agents Gloucestershire Northern Senior League	https://fulltime.thefa.com/index.html?league=1920903
191	Derbyshire Girls & Ladies League (An England Accredited League)	https://fulltime.thefa.com/index.html?league=7061155
192	East Sussex Football League	https://fulltime.thefa.com/index.html?league=820909560
193	Woolwich and Eltham Sunday Football Alliance	https://fulltime.thefa.com/index.html?league=865173623
194	East Midlands Womens Regional Football League	https://fulltime.thefa.com/index.html?league=7385131
195	Royston Crow Youth Football League	https://fulltime.thefa.com/index.html?league=6310851
196	Sunderland and District Sunderland Mill View Social Club Over 40s League	https://fulltime.thefa.com/index.html?league=1743347
197	Leatherhead and District Sunday Football League	https://fulltime.thefa.com/index.html?league=332046563
198	The Alliance Football League - Sponsored by Industrial Laundry Equipment	https://fulltime.thefa.com/index.html?league=92031743
199	Maidstone Youth Football League	https://fulltime.thefa.com/index.html?league=920415349
200	Uhlsport Bristol and District League	https://fulltime.thefa.com/index.html?league=1832893
`;

// Parse the data and create SQL insert statements
function parseLeagues() {
  const lines = rawData.trim().split('\n').filter(line => line.trim());
  const leagues = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const position = parseInt(parts[0]);
      const name = parts[1].trim();
      const url = parts[2].trim();

      // Extract league ID from URL
      const urlMatch = url.match(/league=(\d+)/);
      if (urlMatch) {
        const leagueId = urlMatch[1];
        leagues.push({
          position,
          name,
          url,
          leagueId
        });
      }
    }
  }

  return leagues;
}

// Generate SQL insert statements
function generateSQL(leagues) {
  const inserts = [];

  for (const league of leagues) {
    // Escape single quotes in names
    const escapedName = league.name.replace(/'/g, "''");

    // Determine age group based on league name patterns
    let ageGroup = 'All Ages'; // Default
    const nameLower = league.name.toLowerCase();

    if (nameLower.includes('youth') || nameLower.includes('junior') || nameLower.includes('colts') ||
        nameLower.includes('mini soccer') || nameLower.includes('u7') || nameLower.includes('u11') ||
        nameLower.includes('primary')) {
      ageGroup = 'Youth (U18)';
    } else if (nameLower.includes('girls') || nameLower.includes('women') || nameLower.includes('ladies') ||
               nameLower.includes('womens')) {
      ageGroup = 'Women/Girls';
    } else if (nameLower.includes('senior') || nameLower.includes('premier') || nameLower.includes('county') ||
               nameLower.includes('combination') || nameLower.includes('alliance')) {
      ageGroup = 'Senior';
    }

    // Determine region based on league name patterns
    let region = 'England'; // Default
    if (nameLower.includes('london') || nameLower.includes('surrey') || nameLower.includes('kent') ||
        nameLower.includes('essex') || nameLower.includes('sussex') || nameLower.includes('hampshire') ||
        nameLower.includes('berkshire') || nameLower.includes('buckinghamshire') ||
        nameLower.includes('oxfordshire') || nameLower.includes('wiltshire')) {
      region = 'South East';
    } else if (nameLower.includes('yorkshire') || nameLower.includes('lincolnshire') ||
               nameLower.includes('nottinghamshire') || nameLower.includes('derbyshire') ||
               nameLower.includes('south yorkshire') || nameLower.includes('west yorkshire') ||
               nameLower.includes('north yorkshire')) {
      region = 'Yorkshire & Humber';
    } else if (nameLower.includes('lancashire') || nameLower.includes('cheshire') ||
               nameLower.includes('merseyside') || nameLower.includes('cumbria') ||
               nameLower.includes('greater manchester')) {
      region = 'North West';
    } else if (nameLower.includes('west midlands') || nameLower.includes('warwickshire') ||
               nameLower.includes('worcestershire') || nameLower.includes('shropshire') ||
               nameLower.includes('staffordshire') || nameLower.includes('birmingham') ||
               nameLower.includes('coventry') || nameLower.includes('walsall')) {
      region = 'West Midlands';
    } else if (nameLower.includes('east midlands') || nameLower.includes('leicestershire') ||
               nameLower.includes('northamptonshire') || nameLower.includes('rutland')) {
      region = 'East Midlands';
    } else if (nameLower.includes('east anglia') || nameLower.includes('norfolk') ||
               nameLower.includes('suffolk') || nameLower.includes('cambridgeshire')) {
      region = 'East Anglia';
    } else if (nameLower.includes('south west') || nameLower.includes('cornwall') ||
               nameLower.includes('devon') || nameLower.includes('dorset') ||
               nameLower.includes('somerset') || nameLower.includes('gloucestershire') ||
               nameLower.includes('wiltshire')) {
      region = 'South West';
    } else if (nameLower.includes('north east') || nameLower.includes('tyne') ||
               nameLower.includes('wear') || nameLower.includes('durham') ||
               nameLower.includes('northumberland')) {
      region = 'North East';
    }

    const insert = `INSERT OR IGNORE INTO leagues (name, region, ageGroup, url, hits, description, isActive, createdBy) VALUES ('${escapedName}', '${region}', '${ageGroup}', '${league.url}', 0, '', 1, 1);`;
    inserts.push(insert);
  }

  return inserts;
}

// Main execution
const leagues = parseLeagues();
console.log(`Parsed ${leagues.length} leagues from FA Full-Time website`);

const sqlStatements = generateSQL(leagues);

// Write to file
const outputPath = path.join(__dirname, 'add-fa-leagues.sql');
fs.writeFileSync(outputPath, sqlStatements.join('\n\n'));

console.log(`Generated SQL file: ${outputPath}`);
console.log(`Contains ${sqlStatements.length} INSERT statements`);

// Also output first few for verification
console.log('\nFirst 5 SQL statements:');
sqlStatements.slice(0, 5).forEach((sql, i) => {
  console.log(`${i + 1}: ${sql}`);
});