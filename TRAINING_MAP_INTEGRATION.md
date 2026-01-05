# Training Location Map Integration

## Overview
The training location map integration allows players to discover nearby teams that are training and looking for players. This feature connects the calendar system with geographic location data, enabling players to find local opportunities.

## Features

### 1. Location Data Storage
Training events now store comprehensive location information:
- **Coordinates**: Latitude and longitude for precise mapping
- **Location Data**: Structured JSON with address, postcode, and facilities
- **Team Name**: Associated team for the training session
- **Vacancy Status**: Boolean flag indicating if the team is looking for players

### 2. Database Schema
The `calendar_events` table now includes:
```sql
locationData TEXT,          -- JSON structure with detailed location info
latitude REAL,              -- Geographic latitude
longitude REAL,             -- Geographic longitude
teamName VARCHAR,           -- Name of the team
hasVacancies BOOLEAN        -- Whether team has open positions
```

### 3. API Endpoints

#### Create Training Schedule with Location
**POST** `/api/calendar/training-schedule`

Creates recurring training events for a team with location data.

**Request Body:**
```json
{
  "teamName": "West London Eagles",
  "dayOfWeek": "Wednesday",
  "startTime": "18:00",
  "endTime": "19:30",
  "location": "Hyde Park Sports Ground, London",
  "weeksAhead": 8,
  "description": "Regular Wednesday training session",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "locationData": {
    "address": "Hyde Park Sports Ground, London",
    "postcode": "W2 2UH",
    "facilities": ["Floodlit pitch", "Changing rooms"]
  },
  "hasVacancies": true
}
```

**Response:**
```json
{
  "message": "Training schedule created successfully",
  "eventsCreated": 8,
  "schedule": {
    "teamName": "West London Eagles",
    "dayOfWeek": "Wednesday",
    "startTime": "18:00",
    "endTime": "19:30",
    "location": "Hyde Park Sports Ground, London"
  }
}
```

#### Create Single Event with Location
**POST** `/api/calendar/events`

Creates a single calendar event with location data.

**Request Body:**
```json
{
  "title": "North London Tigers Training",
  "description": "Open training session - new players welcome",
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
    "facilities": ["5-a-side pitch", "Free parking"]
  },
  "teamName": "North London Tigers",
  "hasVacancies": true
}
```

#### Get Nearby Training Locations
**GET** `/api/calendar/training-locations`

Finds training sessions near a player's location, ordered by distance.

**Query Parameters:**
- `latitude` (optional): Player's latitude
- `longitude` (optional): Player's longitude
- `radius` (optional): Search radius in kilometers (default: 50km)
- `hasVacancies` (optional): Filter to only teams with open positions ('true'/'false')

**Example Request:**
```
GET /api/calendar/training-locations?latitude=51.5155&longitude=-0.1426&radius=10&hasVacancies=true
```

**Response:**
```json
{
  "trainingLocations": [
    {
      "id": 123,
      "title": "West London Eagles Training",
      "teamName": "West London Eagles",
      "date": "2025-02-12",
      "startTime": "18:00",
      "endTime": "19:30",
      "location": "Hyde Park Sports Ground, London",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "hasVacancies": true,
      "distance": 2.3,
      "contactEmail": "coach@westlondoneagles.com",
      "locationData": {
        "address": "Hyde Park Sports Ground, London",
        "postcode": "W2 2UH",
        "facilities": ["Floodlit pitch", "Changing rooms"]
      }
    }
  ],
  "userLocation": {
    "latitude": 51.5155,
    "longitude": -0.1426
  },
  "radius": 10
}
```

## Distance Calculation

The API uses the Haversine formula to calculate distances between the player's location and training venues:

```javascript
// Haversine formula
const R = 6371; // Earth's radius in km
const dLat = (eventLat - userLat) * Math.PI / 180;
const dLon = (eventLon - userLon) * Math.PI / 180;
const a = 
  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  Math.cos(userLat * Math.PI / 180) * Math.cos(eventLat * Math.PI / 180) *
  Math.sin(dLon / 2) * Math.sin(dLon / 2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
const distance = R * c;
```

Results are sorted by distance (nearest first) and rounded to 1 decimal place.

## Use Cases

### For Players
1. **Discover Local Teams**: Find teams training nearby
2. **View Vacancies**: See which teams are actively recruiting
3. **Check Facilities**: Review training venue facilities
4. **Plan Travel**: Calculate distance to training locations
5. **Contact Teams**: Get coach contact information

### For Coaches
1. **Set Training Schedule**: Define regular training times with location
2. **Mark Vacancies**: Indicate when looking for new players
3. **Provide Details**: Share facility information and access details
4. **Attract Local Talent**: Make team visible to nearby players
5. **Update Availability**: Change vacancy status as roster fills

## Frontend Integration

### Map View Component
Create a map component to display training locations:

```typescript
interface TrainingLocation {
  id: number;
  teamName: string;
  location: string;
  latitude: number;
  longitude: number;
  distance: number;
  hasVacancies: boolean;
  date: string;
  startTime: string;
  contactEmail: string;
  locationData: {
    address: string;
    postcode: string;
    facilities: string[];
  };
}

// Fetch nearby locations
const response = await fetch(
  `/api/calendar/training-locations?latitude=${userLat}&longitude=${userLon}&radius=15&hasVacancies=true`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const data = await response.json();

// Display on map with markers for each location
```

### Map Libraries
Recommended map libraries for React:
- **React Leaflet**: Free, open-source, easy to use
- **Google Maps React**: Full-featured, requires API key
- **Mapbox GL**: Modern, customizable

### Example with React Leaflet
```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[userLat, userLon]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {trainingLocations.map(location => (
    <Marker key={location.id} position={[location.latitude, location.longitude]}>
      <Popup>
        <strong>{location.teamName}</strong><br/>
        {location.location}<br/>
        {location.date} at {location.startTime}<br/>
        Distance: {location.distance}km<br/>
        {location.hasVacancies && <span>✅ Has vacancies</span>}
      </Popup>
    </Marker>
  ))}
</MapContainer>
```

## Future Enhancements

### Geocoding Integration
Add automatic geocoding to convert addresses to coordinates:
```javascript
// Use Google Geocoding API or OpenStreetMap Nominatim
const geocodeAddress = async (address) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`
  );
  const data = await response.json();
  if (data.length > 0) {
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    };
  }
  return null;
};
```

### Advanced Filtering
- Filter by age group
- Filter by skill level
- Filter by training days
- Filter by available positions

### Notifications
- Alert players when new teams appear nearby
- Notify coaches when local players show interest
- Send reminders for upcoming training sessions

### Team Profiles on Map
- Link map markers to full team profiles
- Show team statistics and achievements
- Display player testimonials

## Testing

Use the included test script to verify functionality:
```bash
node test-training-locations.js
```

The test script:
1. Logs in as coach and player
2. Creates training schedules with location data
3. Creates single training events
4. Searches for nearby locations
5. Displays results with distances

## Security Considerations

- All endpoints require authentication
- Coaches can only edit their own team's training schedule
- Player locations are not stored, only used for queries
- Contact information is only shared for teams with vacancies

## Migration Notes

Existing calendar events without location data will continue to work but won't appear in map searches. Coaches should update their training schedules to include coordinates.

The database migration is automatic when the server starts. The new columns:
- `locationData`: NULL by default
- `latitude`: NULL by default
- `longitude`: NULL by default
- `teamName`: NULL by default
- `hasVacancies`: FALSE by default

## Summary

The training location map integration provides a powerful way for players to discover local teams. By combining calendar events with geographic data, players can:
- See where teams train
- Find teams with open positions
- Calculate travel distances
- Contact coaches directly

This feature enhances the player discovery process and helps teams fill their rosters with local talent.
