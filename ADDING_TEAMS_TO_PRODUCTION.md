# Adding Teams to Production Map

The map shows "3 test results" because the teams were added to your local SQLite database, but production uses PostgreSQL.

## Quick Fix - Use the Dashboard

The easiest way is to add teams through the web interface:

1. **Login as a Coach** on https://your-render-url.onrender.com
2. **Go to "Post Vacancy"** in the navigation
3. **Fill in the form** with team details
4. **Important**: When selecting location, use the Google Maps autocomplete
5. **Submit** - the team will appear on the map immediately

## Alternative - Seed Script (Requires Auth Token)

If you want to add multiple teams at once:

```bash
# 1. Get your auth token
# - Login to the app in browser
# - Open DevTools > Application > Local Storage
# - Copy the value of 'grassroots-hub-token'

# 2. Run the seed script
SEED_AUTH_TOKEN=your_token_here node backend/seed-production-teams.js
```

## Why This Happened

- Local database: SQLite (in `backend/database.sqlite`)
- Production database: PostgreSQL (on Render)
- Running `add-england-map-test-data.js` only updated the local SQLite
- The production database still only has the original 3 test teams

## Current Teams on Production

Right now, your production map only shows:
1. Arsenal Youth FC (North London)
2. Chelsea Youth (West London)  
3. Tottenham Youth FC (North London)

These are hardcoded test teams in the MapSearch component.

## To See Real Teams

You need to either:
1. **Use the dashboard UI** (recommended - easiest)
2. **Use the seed script** with a valid auth token
3. **Manually add via API** calls with Postman/curl
4. **Update the production database directly** (requires database access)

## Next Steps

The recommended approach is to login as a coach and use the "Post Vacancy" feature to add a few teams with proper Google Maps locations. This ensures the `locationData` is properly formatted and the teams will appear on the map immediately.
