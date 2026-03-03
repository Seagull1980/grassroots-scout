# Test Player Adverts Scripts

These scripts help you create and delete test player availability adverts for testing purposes.

## Create Test Adverts

Creates 8 test player availability adverts across the Midlands region:
- **Age Groups**: U9 and U14 (4 adverts each)
- **Locations**: Birmingham, Coventry, Leicester, Nottingham, Derby, Wolverhampton
- **Leagues**: Uses the first 3 active leagues in the database
- **Positions**: Random mix of positions (Goalkeeper, Midfielder, Striker, etc.)

```bash
node create-test-player-adverts.cjs
```

### Output Example
```
✅ Created: U9 Left Wing/Right Wing Available - Birmingham (ID: 2)
✅ Created: U9 Goalkeeper Available - Coventry (ID: 3)
...
📊 Summary:
   - Age Groups: U9, U14
   - Locations: Birmingham, Coventry, Leicester, Nottingham
   - IDs: 2, 3, 4, 5, 6, 7, 8, 9
```

## Delete Test Adverts

Removes test adverts by their IDs:

```bash
node delete-test-player-adverts.cjs <comma-separated-ids>
```

### Example
```bash
# Delete specific adverts
node delete-test-player-adverts.cjs 2,3,4,5,6,7,8,9

# Or copy the command from the create script output
```

## Notes

- All test adverts are posted by user ID 1 (admin)
- Contact info is set to: `test@grassrootshub.com`
- Status is set to `active`
- Adverts are randomly distributed across available leagues
- Each advert has realistic location data with lat/lng coordinates

## Script Files

- `create-test-player-adverts.cjs` - Creates test adverts
- `delete-test-player-adverts.cjs` - Deletes test adverts by ID
- `check-db-structure.cjs` - Helper to inspect database structure
