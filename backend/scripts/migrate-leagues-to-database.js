const Database = require('../db/database.js');
require('dotenv').config({ path: '../.env' });

const db = new Database();

// FA leagues data - this will be migrated to the database
const faLeagues = [
  { 
    name: 'Sheffield & District Junior Sunday League', 
    region: 'Yorkshire', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=5484799',
    hits: 51890,
    description: 'One of the most popular junior Sunday leagues in Sheffield'
  },
  { 
    name: 'Norfolk Combined Youth Football League', 
    region: 'Eastern', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=303322696',
    hits: 84310,
    description: 'Major youth football league covering Norfolk'
  },
  { 
    name: 'East Manchester Junior Football League ( Charter Standard League )', 
    region: 'North West', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=8335132',
    hits: 49762,
    description: 'Charter Standard accredited junior league serving East Manchester'
  },
  { 
    name: 'Central Warwickshire Youth Football League', 
    region: 'Midlands', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=9051745',
    hits: 47841,
    description: 'Youth football league covering Central Warwickshire'
  },
  { 
    name: 'Warrington Junior Football League', 
    region: 'North West', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=8730154',
    hits: 46280,
    description: 'Junior football league serving Warrington area'
  },
  { 
    name: 'Teesside Junior Football Alliance League', 
    region: 'North East', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=8642138',
    hits: 44950,
    description: 'Junior football alliance covering Teesside region'
  },
  { 
    name: 'Eastern Junior Alliance', 
    region: 'Eastern', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=9062847',
    hits: 44627,
    description: 'Junior football alliance covering Eastern England'
  },
  { 
    name: 'Garforth Junior Football League', 
    region: 'Yorkshire', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=8965430',
    hits: 44210,
    description: 'Junior football league based in Garforth, Yorkshire'
  },
  { 
    name: 'Northumberland Football League', 
    region: 'North East', 
    ageGroup: 'Senior',
    url: 'https://fulltime.thefa.com/index.html?league=7259438',
    hits: 43950,
    description: 'Senior football league covering Northumberland'
  },
  { 
    name: 'Midland Junior Premier League', 
    region: 'Midlands', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=1182044',
    hits: 80725,
    description: 'Premier junior league covering Midlands region'
  },
  { 
    name: 'HUDDERSFIELD FOX ENGRAVERS JUNIOR FOOTBALL LEAGUE', 
    region: 'Yorkshire', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=8747035',
    hits: 78690,
    description: 'Junior football league with sponsorship in Huddersfield'
  },
  { 
    name: 'BCFA Youth League', 
    region: 'Midlands', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=671683416',
    hits: 76263,
    description: 'BCFA affiliated youth league in Midlands'
  },
  { 
    name: 'Stourbridge & District Youth Football League', 
    region: 'Midlands', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=381565593',
    hits: 75263,
    description: 'Youth football league covering Stourbridge district'
  },
  { 
    name: 'Russell Foster Tyne & Wear Football League', 
    region: 'North East', 
    ageGroup: 'Senior',
    url: 'https://fulltime.thefa.com/index.html?league=400742710',
    hits: 70627,
    description: 'Senior football league covering Tyne & Wear'
  },
  { 
    name: 'YEL East Midlands SATURDAY', 
    region: 'Midlands', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=5628447',
    hits: 70528,
    description: 'Saturday youth league in East Midlands'
  },
  { 
    name: 'Mid Sussex Youth Football League', 
    region: 'South East', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=1375655',
    hits: 70050,
    description: 'Youth football league covering Mid Sussex'
  },
  { 
    name: 'West Herts Youth League', 
    region: 'South East', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=945817950',
    hits: 69417,
    description: 'Youth league covering West Hertfordshire'
  },
  { 
    name: 'Echo Junior Football League', 
    region: 'South West', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=387606494',
    hits: 68330,
    description: 'Junior football league with media sponsorship'
  },
  { 
    name: 'Bolton, Bury and District Football League', 
    region: 'North West', 
    ageGroup: 'Senior',
    url: 'https://fulltime.thefa.com/index.html?league=760017',
    hits: 67945,
    description: 'Senior league covering Bolton and Bury districts'
  },
  { 
    name: 'The FA Women\'s National League', 
    region: 'National', 
    ageGroup: 'Women\'s',
    url: 'https://fulltime.thefa.com/index.html?league=872938',
    hits: 58615,
    description: 'Premier women\'s football competition in England'
  },
  { 
    name: 'Southern Combination Football League', 
    region: 'South East', 
    ageGroup: 'Senior',
    url: 'https://fulltime.thefa.com/index.html?league=840602727',
    hits: 49762,
    description: 'Senior football league in Southern England'
  },
  { 
    name: 'Kent Youth League', 
    region: 'South East', 
    ageGroup: 'Youth',
    url: 'https://fulltime.thefa.com/index.html?league=286758524',
    hits: 47219,
    description: 'Youth football league covering Kent'
  },
  { 
    name: 'Liverpool Premier League', 
    region: 'North West', 
    ageGroup: 'Senior',
    url: 'https://fulltime.thefa.com/index.html?league=4075038',
    hits: 43702,
    description: 'Premier senior league in Liverpool'
  },
  { 
    name: 'Yorkshire Amateur Association Football League', 
    region: 'Yorkshire', 
    ageGroup: 'Amateur',
    url: 'https://fulltime.thefa.com/index.html?league=7058382',
    hits: 42853,
    description: 'Amateur football league covering Yorkshire'
  },
  { 
    name: 'Tamworth Junior Football League', 
    region: 'Midlands', 
    ageGroup: 'Junior',
    url: 'https://fulltime.thefa.com/index.html?league=tamworth',
    hits: 25000,
    description: 'Junior football league serving Tamworth and surrounding areas'
  }
];

async function migrateLeaguesToDatabase() {
  try {
    console.log('🚀 Starting league migration to database...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const league of faLeagues) {
      try {
        // Check if league already exists
        const existing = await db.query(
          'SELECT id FROM leagues WHERE name = ?',
          [league.name]
        );

        if (existing.rows && existing.rows.length > 0) {
          // Update existing league with additional fields
          await db.query(
            `UPDATE leagues SET 
             region = ?, 
             ageGroup = ?, 
             url = ?, 
             hits = ?, 
             description = COALESCE(description, ?)
             WHERE name = ?`,
            [league.region, league.ageGroup, league.url, league.hits, league.description, league.name]
          );
          updatedCount++;
          console.log(`✅ Updated: ${league.name}`);
        } else {
          // Insert new league
          await db.query(
            `INSERT INTO leagues (name, region, ageGroup, url, hits, description, isActive, createdBy) 
             VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
            [league.name, league.region, league.ageGroup, league.url, league.hits, league.description]
          );
          insertedCount++;
          console.log(`✅ Inserted: ${league.name}`);
        }
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          skippedCount++;
          console.log(`⚠️  Skipped (duplicate): ${league.name}`);
        } else {
          console.error(`❌ Error processing ${league.name}:`, error.message);
        }
      }
    }

    // Verify the migration
    const result = await db.query('SELECT COUNT(*) as total FROM leagues WHERE isActive = 1');
    const totalLeagues = result.rows[0].total;

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Inserted: ${insertedCount} leagues`);
    console.log(`🔄 Updated: ${updatedCount} leagues`);
    console.log(`⚠️  Skipped: ${skippedCount} leagues`);
    console.log(`📈 Total active leagues in database: ${totalLeagues}`);
    
    console.log('\n🎉 League migration completed successfully!');
    
    // Display sample of migrated leagues
    const sampleLeagues = await db.query(
      'SELECT name, region, ageGroup, hits FROM leagues WHERE isActive = 1 ORDER BY hits DESC LIMIT 5'
    );
    
    console.log('\n🏆 Top 5 leagues by popularity:');
    sampleLeagues.rows.forEach((league, index) => {
      console.log(`${index + 1}. ${league.name} (${league.region}, ${league.ageGroup}) - ${league.hits} hits`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateLeaguesToDatabase()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateLeaguesToDatabase, faLeagues };