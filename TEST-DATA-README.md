# Test Data Management Scripts

These scripts help you create and delete test player and team data for development and testing purposes.

## Player Availability Adverts

### Create Test Player Adverts

Creates 8 test player availability adverts across the Midlands region:
- **Age Groups**: U9 and U14 (4 adverts each)
- **Locations**: Birmingham, Coventry, Leicester, Nottingham, Derby, Wolverhampton
- **Leagues**: Uses the first 3 active leagues in the database
- **Positions**: Random mix of positions (Goalkeeper, Midfielder, Striker, etc.)

```bash
node create-test-player-adverts.cjs
```

#### Output Example
```
✅ Created: U9 Left Wing/Right Wing Available - Birmingham (ID: 2)
✅ Created: U9 Goalkeeper Available - Coventry (ID: 3)
...
📊 Summary:
   - Age Groups: U9, U14
   - Locations: Birmingham, Coventry, Leicester, Nottingham
   - IDs: 2, 3, 4, 5, 6, 7, 8, 9
```

### Delete Test Player Adverts

Removes test player adverts by their IDs:

```bash
node delete-test-player-adverts.cjs <comma-separated-ids>
```

#### Example
```bash
# Delete specific adverts
node delete-test-player-adverts.cjs 2,3,4,5,6,7,8,9

# Or copy the command from the create script output
```

## Team Vacancies

### Create Test Team Vacancies

Creates 8 test team vacancies across the Midlands region:
- **Age Groups**: U9, U11, U14, U16 (2 vacancies each)
- **Locations**: Birmingham, Coventry, Leicester, Nottingham, Derby, Wolverhampton
- **Leagues**: Uses the first 3 active leagues in the database
- **Positions**: Random individual positions (Goalkeeper, Striker, Centre-back, etc.)
- **Features**: Random selection of match recording and pathway to senior team

```bash
node create-test-team-vacancies.cjs
```

#### Output Example
```
✅ Created: Birmingham United FC - U9 Striker Wanted (ID: 10)
✅ Created: Coventry City FC - U9 Goalkeeper Wanted (ID: 11)
...
📊 Summary:
   - Age Groups: U9, U11, U14, U16
   - Locations: Birmingham, Coventry, Leicester, Nottingham
   - Positions: Striker, Goalkeeper, Centre-back, Midfielder
   - IDs: 10, 11, 12, 13, 14, 15, 16, 17
```

### Delete Test Team Vacancies

Removes test team vacancies by their IDs:

```bash
node delete-test-team-vacancies.cjs <comma-separated-ids>
```

#### Example
```bash
# Delete specific vacancies
node delete-test-team-vacancies.cjs 10,11,12,13,14,15,16,17

# Or copy the command from the create script output
```

## Notes

### Common Features

- All test data is posted by user ID 1 (admin)
- Contact info is set to: `test@grassrootshub.com`
- Status is set to `active`
- All entries have realistic location data with lat/lng coordinates
- Data is randomly distributed across available leagues

### Player Adverts Specifics

- Players can have multiple positions listed
- Positions are stored as JSON arrays
- Each advert includes player name and description
- Adverts are linked to 1-2 preferred leagues

### Team Vacancies Specifics

- Each vacancy is for a single position
- Random features include:
  - Match recording capability (~50% of teams)
  - Pathway to senior team (~40% of teams)
- Descriptions include team name and training details

## Script Files

### Player Scripts
- `create-test-player-adverts.cjs` - Creates test player adverts
- `delete-test-player-adverts.cjs` - Deletes test player adverts by ID

### Team Scripts
- `create-test-team-vacancies.cjs` - Creates test team vacancies
- `delete-test-team-vacancies.cjs` - Deletes test team vacancies by ID

## Development Workflow

### Via Admin Panel (Recommended for quick testing)

1. **Access Admin Panel**: Login as admin and go to `/admin`

2. **Navigate to Testing Tab**: Click on "User Testing (Impersonation)" tab

3. **Create Test Data**: Scroll to "Test Data Management" section
   - Click **"Create Test Players"** to add 20 player availability records
   - Click **"Create Test Team Vacancies"** to add 8 team vacancy records  

4. **Test Features**: Use the test data to develop and test search, filtering, and matching features

5. **Clean Up**: In the same section:
   - Click **"Delete Test Players"** to remove all test player records
   - Click **"Delete Test Team Vacancies"** to remove all test team records

### Via Command Line Scripts

1. **Setup Test Data**: Run both create scripts to populate your database with test data
   ```bash
   node create-test-player-adverts.cjs
   node create-test-team-vacancies.cjs
   ```

2. **Test Features**: Use the test data to develop and test search, filtering, and matching features

3. **Clean Up**: Use the delete scripts with the IDs provided by the create scripts
   ```bash
   node delete-test-player-adverts.cjs 2,3,4,5,6,7,8,9
   node delete-test-team-vacancies.cjs 10,11,12,13,14,15,16,17
   ```

4. **Repeat**: Create fresh test data as needed during development

## Database Tables

- **player_availability**: Player looking for team adverts
- **team_vacancies**: Team looking for player vacancies
- **leagues**: Active leagues used for filtering
- **users**: User ID 1 (admin) is used as the poster

## Tips

- Keep the IDs from the create script output for easy deletion
- Test data uses consistent Midlands locations for geographic filtering tests
- Age groups span different youth categories for comprehensive testing
- Random features help test conditional UI elements
