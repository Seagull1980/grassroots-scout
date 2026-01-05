const Database = require('../db/database.js');
require('dotenv').config({ path: '../.env' });

const db = new Database();

// Real leagues data extracted from https://fulltime.thefa.com/home/mostVisitedLeagues.html
const realLeagues = [
  {
    name: "Sheffield & District Junior Sunday League",
    url: "https://fulltime.thefa.com/index.html?league=5484799",
    description: "One of the most popular junior Sunday leagues in Sheffield with over 51,000 visits.",
    region: "Yorkshire",
    category: "Youth"
  },
  {
    name: "Norfolk Combined Youth Football League",
    url: "https://fulltime.thefa.com/index.html?league=303322696",
    description: "Major youth football league covering Norfolk with extensive youth participation.",
    region: "East of England",
    category: "Youth"
  },
  {
    name: "East Manchester Junior Football League (Charter Standard League)",
    url: "https://fulltime.thefa.com/index.html?league=8335132",
    description: "Charter Standard accredited junior league serving East Manchester area.",
    region: "North West",
    category: "Youth"
  },
  {
    name: "Stourbridge & District Youth Football League",
    url: "https://fulltime.thefa.com/index.html?league=381565593",
    description: "Youth football league covering Stourbridge and surrounding districts.",
    region: "West Midlands",
    category: "Youth"
  },
  {
    name: "GCE Hire Fleet United Counties Football League",
    url: "https://fulltime.thefa.com/index.html?league=1625657",
    description: "Senior football league covering multiple counties with professional sponsorship.",
    region: "East Midlands",
    category: "Senior"
  },
  {
    name: "The FA Women's National League",
    url: "https://fulltime.thefa.com/index.html?league=872938",
    description: "Premier women's football competition in England below the top tier.",
    region: "National",
    category: "Women's"
  },
  {
    name: "Thurlow Nunn League",
    url: "https://fulltime.thefa.com/index.html?league=958158630",
    description: "Regional football league covering East Anglia and surrounding areas.",
    region: "East of England",
    category: "Senior"
  },
  {
    name: "Northumberland Football League",
    url: "https://fulltime.thefa.com/index.html?league=136980506",
    description: "County football league covering Northumberland and surrounding areas.",
    region: "North East",
    category: "Senior"
  },
  {
    name: "Fosters Solicitors Anglian Combination",
    url: "https://fulltime.thefa.com/index.html?league=4780817",
    description: "Established league with legal firm sponsorship covering the Anglian region.",
    region: "East of England",
    category: "Senior"
  },
  {
    name: "Hellenic League - Proudly Sponsored by uhlsport",
    url: "https://fulltime.thefa.com/index.html?league=646734134",
    description: "Historic football league with major sportswear sponsorship.",
    region: "South West",
    category: "Senior"
  },
  {
    name: "Spartan South Midlands Football League",
    url: "https://fulltime.thefa.com/index.html?league=522238936",
    description: "Regional league covering South Midlands with strong grassroots participation.",
    region: "South East",
    category: "Senior"
  },
  {
    name: "Cambridgeshire County League",
    url: "https://fulltime.thefa.com/index.html?league=7984801",
    description: "County-wide league serving Cambridgeshire football clubs.",
    region: "East of England",
    category: "Senior"
  },
  {
    name: "GCE Hire Fleet Peterborough & District Football League",
    url: "https://fulltime.thefa.com/index.html?league=6486466",
    description: "Local league serving Peterborough and surrounding district areas.",
    region: "East of England",
    category: "Senior"
  },
  {
    name: "Southern Combination Football League",
    url: "https://fulltime.thefa.com/index.html?league=840602727",
    description: "Regional combination league covering southern England.",
    region: "South East",
    category: "Senior"
  },
  {
    name: "Abacus Lighting Central Midlands Alliance League",
    url: "https://fulltime.thefa.com/index.html?league=1854955",
    description: "Central Midlands league with lighting company sponsorship.",
    region: "East Midlands",
    category: "Senior"
  },
  {
    name: "The Cheshire Football League",
    url: "https://fulltime.thefa.com/index.html?league=833498",
    description: "Historic county league serving Cheshire football clubs.",
    region: "North West",
    category: "Senior"
  },
  {
    name: "Central Warwickshire Youth Football League",
    url: "https://fulltime.thefa.com/index.html?league=4385806",
    description: "Youth football league covering central Warwickshire area.",
    region: "West Midlands",
    category: "Youth"
  },
  {
    name: "Teesside Junior Football Alliance League",
    url: "https://fulltime.thefa.com/index.html?league=8739365",
    description: "Junior football alliance serving the Teesside region.",
    region: "North East",
    category: "Youth"
  },
  {
    name: "Cherry Red Records Combined Counties Football League",
    url: "https://fulltime.thefa.com/index.html?league=3956158",
    description: "Multi-county league with music industry sponsorship.",
    region: "South East",
    category: "Senior"
  },
  {
    name: "Kernow Stone St Piran League",
    url: "https://fulltime.thefa.com/index.html?league=656725252",
    description: "Cornwall-based league with local stone company sponsorship.",
    region: "South West",
    category: "Senior"
  },
  {
    name: "Eastern Junior Alliance",
    url: "https://fulltime.thefa.com/index.html?league=257944965",
    description: "Junior football alliance covering eastern England regions.",
    region: "East of England",
    category: "Youth"
  },
  {
    name: "Manchester Football League Limited",
    url: "https://fulltime.thefa.com/index.html?league=4856192",
    description: "Established Manchester-based football league organization.",
    region: "North West",
    category: "Senior"
  },
  {
    name: "YEL East Midlands SATURDAY",
    url: "https://fulltime.thefa.com/index.html?league=5628447",
    description: "Saturday fixture league covering East Midlands region.",
    region: "East Midlands",
    category: "Senior"
  },
  {
    name: "Midland Football League",
    url: "https://fulltime.thefa.com/index.html?league=6125369",
    description: "Regional league covering the Midlands area of England.",
    region: "West Midlands",
    category: "Senior"
  },
  {
    name: "Yorkshire Amateur Association Football League",
    url: "https://fulltime.thefa.com/index.html?league=7058382",
    description: "Amateur football association league covering Yorkshire.",
    region: "Yorkshire",
    category: "Senior"
  },
  {
    name: "Cambridge & District Colts League",
    url: "https://fulltime.thefa.com/index.html?league=7615527",
    description: "Youth colts league serving Cambridge and surrounding districts.",
    region: "East of England",
    category: "Youth"
  },
  {
    name: "Devon Junior & Minor league",
    url: "https://fulltime.thefa.com/index.html?league=1548711",
    description: "Junior and minor football league covering Devon county.",
    region: "South West",
    category: "Youth"
  },
  {
    name: "Midland Junior Premier League",
    url: "https://fulltime.thefa.com/index.html?league=1182044",
    description: "Premier junior league covering Midlands region.",
    region: "West Midlands",
    category: "Youth"
  },
  {
    name: "Echo Junior Football League",
    url: "https://fulltime.thefa.com/index.html?league=387606494",
    description: "Junior football league with media partnership sponsorship.",
    region: "South East",
    category: "Youth"
  },
  {
    name: "Mid Sussex Youth Football League",
    url: "https://fulltime.thefa.com/index.html?league=1375655",
    description: "Youth football league covering Mid Sussex area.",
    region: "South East",
    category: "Youth"
  }
];

async function importRealLeagues() {
  try {
    console.log('🏈 Starting real leagues import...');
    
    // First, let's backup current leagues (in case we need to restore)
    console.log('📦 Creating backup of current leagues...');
    const currentLeagues = await db.query('SELECT * FROM leagues ORDER BY id');
    console.log(`📦 Backed up ${currentLeagues.rows.length} existing leagues`);
    
    // Clear current leagues (mark as inactive instead of deleting for safety)
    console.log('🗑️ Marking current test leagues as inactive...');
    await db.query('UPDATE leagues SET isActive = 0 WHERE name LIKE "%Test%" OR description LIKE "%Test%"');
    
    // Insert real leagues
    console.log('🏆 Inserting real leagues...');
    let insertedCount = 0;
    
    for (const league of realLeagues) {
      try {
        // Check if league already exists
        const existing = await db.query('SELECT id FROM leagues WHERE name = ?', [league.name]);
        
        if (existing.rows.length === 0) {
          await db.query(
            'INSERT INTO leagues (name, description, region, category, websiteUrl, isActive, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, 1, 1, ?)',
            [
              league.name,
              league.description,
              league.region,
              league.category,
              league.url,
              new Date().toISOString()
            ]
          );
          insertedCount++;
          console.log(`✅ Added: ${league.name}`);
        } else {
          // Update existing league to mark as active and add URL
          await db.query(
            'UPDATE leagues SET description = ?, region = ?, category = ?, websiteUrl = ?, isActive = 1 WHERE name = ?',
            [league.description, league.region, league.category, league.url, league.name]
          );
          console.log(`🔄 Updated: ${league.name}`);
        }
      } catch (error) {
        console.error(`❌ Error inserting league "${league.name}":`, error.message);
      }
    }
    
    // Get final count
    const finalCount = await db.query('SELECT COUNT(*) as count FROM leagues WHERE isActive = 1');
    const totalActive = finalCount.rows[0].count;
    
    console.log('\n🎉 Real leagues import completed!');
    console.log(`📊 Summary:`);
    console.log(`   - New leagues added: ${insertedCount}`);
    console.log(`   - Total active leagues: ${totalActive}`);
    console.log(`   - Source: https://fulltime.thefa.com/home/mostVisitedLeagues.html`);
    
    // Show sample of imported leagues
    console.log('\n🔍 Sample of imported leagues:');
    const sampleLeagues = await db.query('SELECT name, region, category FROM leagues WHERE isActive = 1 ORDER BY id DESC LIMIT 5');
    sampleLeagues.rows.forEach((league, index) => {
      console.log(`   ${index + 1}. ${league.name} (${league.region} - ${league.category})`);
    });
    
  } catch (error) {
    console.error('❌ Error during leagues import:', error);
  }
}

// Run the import
if (require.main === module) {
  importRealLeagues()
    .then(() => {
      console.log('\n✨ Import process finished. You can now test the application with real league data!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importRealLeagues, realLeagues };
