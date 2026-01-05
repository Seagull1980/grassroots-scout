# Test Data for Maps Functionality

The maps section now includes test data to demonstrate the functionality while you're setting up your real data.

## What You'll See

When you navigate to the **Maps** page (`/maps`), you'll see:

### Test Team Vacancies (Red Markers)
1. **Arsenal Youth FC** - Striker position (North London)
2. **Chelsea Youth** - Midfielder position (West London) 
3. **Tottenham Youth FC** - Goalkeeper position (North London)

### Test Available Players (Blue Markers)
1. **Alex Thompson** - Midfielder (East London)
2. **Emma Davis** - Defender (South London)

## How to Use the Maps

1. **Click anywhere** on the map to search that area
2. **Adjust the radius** using the slider (1-100km)
3. **Draw custom areas** using the "Draw Area" button
4. **Filter results** by league and age group
5. **View details** by clicking on any result card

## Features Demonstrated

- ✅ **Interactive Map** with London-focused view
- ✅ **Distance-based Search** with customizable radius
- ✅ **Custom Area Drawing** - click to draw polygons
- ✅ **Multiple Search Types** - vacancies, players, or both
- ✅ **Real-time Filtering** by league and age group
- ✅ **Mobile-responsive** with touch support
- ✅ **Save Search Regions** for future use

## Adding Real Data

To replace this test data with real listings:

1. Users post **Team Vacancies** through "Post Advert" 
2. Players create **Availability** posts through their dashboards
3. Ensure location data includes proper coordinates
4. The maps will automatically show real data when available

## Test Data Note

You'll see a success message: *"Showing X test results. Add real data through the dashboard to see actual listings."*

This indicates the system is working correctly and will seamlessly transition to real data once it's available.

## Technical Details

- **Coordinates**: All test data uses realistic London area coordinates
- **Fallback System**: Test data only appears when no real data is found
- **Type Safety**: All test data conforms to proper TypeScript interfaces
- **Filtering**: Test data responds to all filter options (league, age group, search type)

The maps functionality is fully operational and ready for real-world use!