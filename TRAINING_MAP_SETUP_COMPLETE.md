# Training Map Feature - Setup Complete ✅

## What's Been Implemented

### 1. **Backend API Endpoints** (Already done)
- ✅ Updated database schema with location fields
- ✅ POST `/api/calendar/training-schedule` - Create recurring training with location
- ✅ POST `/api/calendar/events` - Create single events with location
- ✅ GET `/api/calendar/training-locations` - Find nearby training sessions

### 2. **Frontend Components** (Just completed)
- ✅ **TrainingMapView** component with interactive map
- ✅ **Geocoding utilities** for address-to-coordinate conversion
- ✅ **CalendarPage** updated with new "Training Map" tab
- ✅ Custom map styling and marker icons

## How to Use

### For Players (Finding Local Teams)

1. **Navigate to Calendar Page**
   - Go to Calendar & Events from the main menu
   - Click on the "Training Map" tab

2. **Set Your Location**
   - Option 1: Click the location icon to use your current GPS location
   - Option 2: Enter your postcode in the search box (e.g., "SW1A 1AA")

3. **Adjust Search Filters**
   - Use the slider to set search radius (1-50km)
   - Toggle "Show only teams with vacancies" to filter results
   - Teams with open positions show **green markers** 🟢
   - Teams without vacancies show **gray markers** ⚪

4. **Explore Training Locations**
   - Click any marker to see a popup with basic info
   - Click "View Details" for full information including:
     - Distance from you
     - Training day and time
     - Location address and postcode
     - Available facilities
     - Coach contact details
   - Click "Contact Coach" to send an email

5. **Find Your Perfect Match**
   - Results are sorted by distance (nearest first)
   - See exactly how far each training ground is from you
   - View facility information before making contact

### For Coaches (Adding Training Locations)

#### Method 1: Set Up Recurring Training Schedule

Use this when creating your team's regular training schedule:

```javascript
// Example API call
POST /api/calendar/training-schedule
{
  "teamName": "West London Eagles",
  "dayOfWeek": "Wednesday",
  "startTime": "18:00",
  "endTime": "19:30",
  "location": "Hyde Park Sports Ground, London",
  "weeksAhead": 8,
  "description": "Regular Wednesday training",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "locationData": {
    "address": "Hyde Park Sports Ground, London",
    "postcode": "W2 2UH",
    "facilities": ["Floodlit pitch", "Changing rooms", "Free parking"]
  },
  "hasVacancies": true
}
```

This creates 8 weeks of training events automatically.

#### Method 2: Create Single Training Event

For one-off sessions or special training:

```javascript
POST /api/calendar/events
{
  "title": "Extra Training Session",
  "description": "Skills and drills focus",
  "eventType": "training",
  "date": "2025-02-15",
  "startTime": "19:00",
  "endTime": "20:30",
  "location": "Finsbury Park, London",
  "latitude": 51.5642,
  "longitude": -0.1062,
  "locationData": {
    "address": "Finsbury Park, Seven Sisters Rd, London",
    "postcode": "N4 2NQ",
    "facilities": ["5-a-side pitch"]
  },
  "teamName": "North London Tigers",
  "hasVacancies": true
}
```

#### Getting Coordinates for Your Location

**Option 1: Use Google Maps**
1. Find your training ground on Google Maps
2. Right-click on the location → Click coordinates
3. Copy the latitude and longitude

**Option 2: Use the Geocoding Utility (Frontend)**
```typescript
import { geocodeAddress } from '../utils/geocoding';

const coords = await geocodeAddress("Hyde Park Sports Ground, London");
// Returns: { latitude: 51.5074, longitude: -0.1278, ... }
```

**Option 3: Use Coordinate Parser**
```typescript
import { parseCoordinates } from '../utils/geocoding';

// From coordinates string
const coords = parseCoordinates("51.5074, -0.1278");

// From Google Maps URL
const coords = parseCoordinates("https://maps.google.com/?q=51.5074,-0.1278");
```

## Key Features

### 🗺️ Interactive Map
- Built with React Leaflet (OpenStreetMap)
- Zoom, pan, and explore training locations
- Color-coded markers for vacancy status
- Responsive on mobile and desktop

### 📍 Smart Search
- GPS-based location detection
- Postcode search (UK format)
- Adjustable search radius (1-50km)
- Distance calculation using Haversine formula

### 🎯 Filtering Options
- Filter by vacancy status
- Filter by distance
- View only future training sessions
- Sort by proximity

### 📊 Rich Location Data
- Full address and postcode
- Facility information
- Training times and dates
- Current participant count
- Direct coach contact

### 🔍 Geocoding Support
- Automatic address-to-coordinate conversion
- UK postcode validation
- Reverse geocoding (coordinates to address)
- Batch geocoding for multiple locations
- Rate-limited to respect API usage policies

## Technical Details

### Map Library: React Leaflet
- Free and open-source
- No API key required
- Uses OpenStreetMap tiles
- Lightweight and performant

### Geocoding: Nominatim (OpenStreetMap)
- Free geocoding service
- No API key required
- Rate limit: 1 request per second
- Includes User-Agent header for compliance

### Distance Calculation: Haversine Formula
```javascript
const distance = calculateDistance(
  userLat, userLon,
  trainingLat, trainingLon
);
// Returns distance in kilometers (rounded to 1 decimal)
```

## Files Created/Modified

### New Files
1. **src/components/TrainingMapView.tsx** - Main map component
2. **src/utils/geocoding.ts** - Geocoding utilities
3. **src/styles/map.css** - Custom map styling

### Modified Files
1. **src/pages/CalendarPage.tsx** - Added Training Map tab
2. **backend/server-simple.js** - Updated calendar endpoints
3. **backend/db/database.js** - Added location columns

### Dependencies Installed
```json
{
  "react-leaflet": "^4.x",
  "leaflet": "^1.x",
  "@types/leaflet": "^1.x"
}
```

## Browser Permissions

The map feature requests the following permissions:

1. **Geolocation** (Optional)
   - Used to center map on user's location
   - Can be declined - users can search by postcode instead
   - Only used for search, not stored

## Testing Checklist

- [x] Backend endpoints accept location data
- [x] Database stores coordinates correctly
- [x] Map displays with correct tiles
- [x] Markers show for training locations
- [x] Clicking markers opens popups
- [x] Distance calculation is accurate
- [x] Search by postcode works
- [x] GPS location detection works
- [x] Filters apply correctly
- [x] Contact coach button works
- [x] Responsive on mobile devices
- [x] No TypeScript errors

## Next Steps (Optional Enhancements)

### 1. Google Maps Integration (Alternative)
If you prefer Google Maps over OpenStreetMap:
- Get Google Maps API key
- Replace react-leaflet with @googlemaps/react-wrapper
- Enable Places API for better location search

### 2. Marker Clustering
For areas with many training locations:
```bash
npm install react-leaflet-cluster
```

### 3. Route Planning
Add "Get Directions" button:
- Link to Google Maps directions
- Show estimated travel time
- Display public transport options

### 4. Save Favorite Locations
Let players save frequently viewed teams:
- Add to database
- Quick access from dashboard
- Get notifications when sessions scheduled

### 5. Team Coverage Heat Map
Show geographic coverage of teams:
- Heat map overlay
- Identify underserved areas
- Help new teams choose locations

### 6. Advanced Filtering
Additional filter options:
- Age group
- Skill level
- Training days
- Specific positions needed

## Troubleshooting

### Map Not Displaying
- Check that Leaflet CSS is imported
- Verify map container has a height set
- Check browser console for errors
- Ensure coordinates are valid numbers

### Markers Not Showing
- Verify training events have latitude/longitude
- Check that dates are in the future
- Confirm hasVacancies filter isn't too restrictive
- Check API response in network tab

### Geocoding Not Working
- Check internet connection
- Verify postcode format (UK: "SW1A 1AA")
- Wait 1 second between requests (rate limit)
- Check Nominatim service status

### Distance Calculation Wrong
- Ensure coordinates are in correct format (not reversed)
- Check that latitude is between -90 and 90
- Check that longitude is between -180 and 180
- Verify Haversine formula implementation

## Support & Documentation

- **API Documentation**: See TRAINING_MAP_INTEGRATION.md
- **Backend Endpoints**: See server-simple.js lines 2490-2900
- **Component Props**: See TrainingMapView.tsx interface definitions
- **Geocoding Utils**: See src/utils/geocoding.ts for all functions

## Summary

You now have a complete training location map system that allows:
- ✅ Players to discover nearby teams with open positions
- ✅ Coaches to advertise their training locations and vacancies
- ✅ Visual map display with distance calculations
- ✅ Smart filtering and search capabilities
- ✅ Direct coach contact from map interface

The feature is production-ready and requires no API keys or paid services!
