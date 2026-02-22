# Location Autocomplete Integration - Profile Page Update

## Summary of Changes

I've successfully integrated Google Maps autocomplete functionality into the Profile Page. Now users can easily search for and select locations with autocomplete suggestions.

## What Was Changed

### 1. **Location Fields Updated** (3 fields total)
   - **Main Location** (Basic Information tab) - For users' primary location
   - **Training Location** (Team Details tab) - For coaches' training facility location
   - **Home Match Location** (Team Details tab) - For coaches' match stadium location

### 2. **Components Added/Modified**

#### New Hook: `useGoogleMapsScript.ts`
- **Location:** `src/hooks/useGoogleMapsScript.ts`
- **Purpose:** Loads the Google Maps API script globally for the Profile Page
- **Features:**
  - Checks if Google Maps is already loaded to avoid duplicate scripts
  - Automatically loads the script with the Places API library
  - Returns a boolean indicating when the script is ready

#### ProfilePage.tsx Updates
- **Imported** the `LocationAutocomplete` component
- **Imported** the `useGoogleMapsScript` hook
- **Replaced** three TextField components with `LocationAutocomplete` components:
  1. Location field
  2. Training Location field
  3. Home Match Location field
- **Added** location state management to track coordinates and address

### 3. **How It Works**

When a user views their profile:

1. The `useGoogleMapsScript` hook automatically loads the Google Maps JavaScript API
2. The LocationAutocomplete component becomes active with autocomplete suggestions
3. Users can:
   - Type a location name (e.g., "Manchester", "Wembley Stadium")
   - See suggestions from Google Maps Places API
   - Click on a suggestion to select it
   - Have coordinates (lat/lng) automatically captured for future use

### 4. **Features of LocationAutocomplete**

- ✅ **UK-Restricted:** Only shows UK locations (configurable)
- ✅ **Coordinates:** Captures latitude and longitude when a location is selected
- ✅ **Fallback Support:** Uses legacy Google Maps API if the new PlaceAutocompleteElement is not available
- ✅ **Graceful Degradation:** Falls back to regular text input if Google Maps is unavailable
- ✅ **Material UI Integration:** Styled to match the rest of the application

## Files Changed

1. `src/pages/ProfilePage.tsx`
   - Added import for LocationAutocomplete
   - Added import for useGoogleMapsScript hook
   - Replaced 3 TextField components with LocationAutocomplete
   - Added locationCoordinates state management

2. `src/hooks/useGoogleMapsScript.ts` (NEW)
   - Created custom hook to load Google Maps API globally

## Configuration Required

✅ **Already Configured** - The `.env` file already contains:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCPOJ5YQDzy8pLMZGsqCxhQb_6VGd9Nxwk
```

The Google Maps API key with the following enabled APIs:
- Maps JavaScript API
- Places API
- Geocoding API
- Geometry API

## Testing Instructions

1. Navigate to `/profile` while logged in
2. Go to the "Basic Information" tab
3. Click on the "Location" field
4. Start typing a location (e.g., "London")
5. Wait for autocomplete suggestions to appear
6. Click on a suggestion to select it
7. The coordinates will be captured automatically

For coaches, test the same with:
- Team Details tab → Training Location field
- Team Details tab → Home Match Location field

## Browser Console Check

If you don't see autocomplete suggestions:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Check for any errors related to Google Maps
4. Verify `window.google.maps.places` is available

## What Map Integration Enables

With location coordinates captured, future enhancements could include:
- Displaying user locations on an interactive map
- Calculating distances between players and teams
- Location-based search and filtering
- Route optimization for training sessions
- Geographic team clustering

## Performance Note

- The Google Maps script is loaded only once (singleton pattern)
- The script is loaded asynchronously to not block page rendering
- The hook efficiently detects already-loaded scripts to prevent duplicates
