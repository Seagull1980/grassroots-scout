const Database = require('./db/database.js');

async function addDefaultLeagues() {
  try {
    const db = new Database();
    
    console.log('Adding default leagues...');
    
    // Get an admin user to set as creator
    const adminUser = await db.query("SELECT id FROM users WHERE userType = 'admin' LIMIT 1");
    if (!adminUser.rows || adminUser.rows.length === 0) {
      console.error('No admin user found. Using user ID 1.');
      // process.exit(1);
    }
    
    const createdBy = adminUser.rows && adminUser.rows.length > 0 ? adminUser.rows[0].id : 1;
    
    // Check if leagues already exist
    const existingLeagues = await db.query('SELECT COUNT(*) as count FROM leagues WHERE isActive = true');
    console.log('Existing active leagues:', existingLeagues.rows[0].count);
    
    if (existingLeagues.rows[0].count > 0) {
      console.log('Leagues already exist, skipping creation.');
      process.exit(0);
    }
    
    // Default leagues to add
    const defaultLeagues = [
      {
        name: 'County Youth League',
        description: 'Local county-level youth football league for various age groups'
      },
      {
        name: 'Regional Championship',
        description: 'Competitive regional league for skilled youth teams'
      },
      {
        name: 'Local Girls League',
        description: 'Dedicated league for girls\' football teams'
      },
      {
        name: 'Premier Youth League',
        description: 'Top-tier youth football league for elite teams'
      },
      {
        name: 'Community League',
        description: 'Grassroots community-based football league'
      },
      {
        name: 'Sunday League',
        description: 'Casual Sunday football league for all skill levels'
      },
      {
        name: 'Winter League',
        description: 'Indoor and all-weather football league during winter months'
      },
      {
        name: 'Development League',
        description: 'Focused on player development and skill building'
      }
    ];
    
    for (const league of defaultLeagues) {
      await db.query(
        'INSERT INTO leagues (name, description, createdBy, isActive) VALUES (?, ?, ?, true)',
        [league.name, league.description, createdBy]
      );
      console.log(`✅ Added league: ${league.name}`);
    }
    
    // Verify leagues were added
    const leaguesResult = await db.query('SELECT name, description FROM leagues WHERE isActive = true ORDER BY name');
    console.log('\nLeagues in database:');
    console.log(leaguesResult.rows);
    
    console.log('\n🎉 Default leagues added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding default leagues:', error);
    process.exit(1);
  }
}

addDefaultLeagues();
