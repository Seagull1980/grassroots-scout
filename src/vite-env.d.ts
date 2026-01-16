/// <reference types="vite/client" />
/// <reference types="node" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_ROSTER_API_URL?: string;
  readonly VITE_WEATHER_API_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_OUTLOOK_CLIENT_ID?: string;
  readonly DEV?: boolean;
  readonly MODE?: string;
  readonly PROD?: boolean;
  readonly SSR?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Analytics gtag function and Google Maps types
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    google?: typeof google;
  }

  namespace google {
    namespace maps {
      class Map {
        constructor(mapDiv: HTMLElement, opts?: MapOptions);
        setCenter(latlng: LatLng | LatLngLiteral): void;
        setZoom(zoom: number): void;
        fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
        panTo(latlng: LatLng | LatLngLiteral): void;
        getCenter(): LatLng;
        getZoom(): number;
        addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      }

      class Marker {
        constructor(opts?: MarkerOptions);
        setMap(map: Map | null): void;
        setPosition(latlng: LatLng | LatLngLiteral): void;
        setAnimation(animation: Animation | null): void;
        addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
        setIcon(icon: Icon | Symbol | string): void;
        setTitle(title: string): void;
      }

      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }

      interface LatLngLiteral {
        lat: number;
        lng: number;
      }

      class LatLngBounds {
        constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
        extend(point: LatLng | LatLngLiteral): LatLngBounds;
        getCenter(): LatLng;
        getNorthEast(): LatLng;
        getSouthWest(): LatLng;
      }

      interface LatLngBoundsLiteral {
        east: number;
        north: number;
        south: number;
        west: number;
      }

      class PlacesService {
        constructor(attrContainer: HTMLElement);
        nearbySearch(request: PlaceSearchRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus) => void): void;
        textSearch(request: TextSearchRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus) => void): void;
      }

      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
        getPlace(): PlaceResult;
      }

      class Geocoder {
        geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
      }

      interface GeocoderResult {
        geometry: {
          location: LatLng;
          viewport: LatLngBounds;
        };
        formatted_address: string;
        place_id: string;
      }

      interface PlaceResult {
        geometry: {
          location: LatLng;
          viewport: LatLngBounds;
        };
        name: string;
        place_id: string;
        formatted_address: string;
      }

      interface MapsEventListener {
        remove(): void;
      }

      enum Animation {
        BOUNCE = 1,
        DROP = 2
      }

      interface MapOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        mapTypeId?: MapTypeId;
      }

      interface MarkerOptions {
        position?: LatLng | LatLngLiteral;
        map?: Map;
        title?: string;
        icon?: Icon | Symbol | string;
        animation?: Animation;
      }

      interface Icon {
        url: string;
        size?: Size;
        scaledSize?: Size;
        anchor?: Point;
      }

      interface Symbol {
        path: SymbolPath | string;
        fillColor?: string;
        fillOpacity?: number;
        scale?: number;
        strokeColor?: string;
        strokeOpacity?: number;
        strokeWeight?: number;
      }

      enum SymbolPath {
        CIRCLE = 0,
        FORWARD_CLOSED_ARROW = 1,
        FORWARD_OPEN_ARROW = 2,
        BACKWARD_CLOSED_ARROW = 3,
        BACKWARD_OPEN_ARROW = 4
      }

      class Size {
        constructor(width: number, height: number);
        width: number;
        height: number;
      }

      class Point {
        constructor(x: number, y: number);
        x: number;
        y: number;
      }

      enum MapTypeId {
        ROADMAP = 'roadmap',
        SATELLITE = 'satellite',
        HYBRID = 'hybrid',
        TERRAIN = 'terrain'
      }

      interface PlaceSearchRequest {
        location?: LatLng | LatLngLiteral;
        radius?: number;
        keyword?: string;
        type?: string;
      }

      interface TextSearchRequest {
        query: string;
        location?: LatLng | LatLngLiteral;
        radius?: number;
      }

      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        INVALID_REQUEST = 'INVALID_REQUEST'
      }

      interface AutocompleteOptions {
        types?: string[];
        componentRestrictions?: {
          country: string | string[];
        };
      }

      interface GeocoderRequest {
        address?: string;
        location?: LatLng | LatLngLiteral;
        placeId?: string;
      }

      enum GeocoderStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        INVALID_REQUEST = 'INVALID_REQUEST'
      }

      // Event types
      interface MapMouseEvent {
        latLng: LatLng;
        domEvent: MouseEvent;
      }

      // Drawing types
      class Circle {
        constructor(opts?: CircleOptions);
        setMap(map: Map | null): void;
        setCenter(center: LatLng | LatLngLiteral): void;
        setRadius(radius: number): void;
      }

      interface CircleOptions {
        center?: LatLng | LatLngLiteral;
        radius?: number;
        map?: Map;
      }

      class Polygon {
        constructor(opts?: PolygonOptions);
        setMap(map: Map | null): void;
        setPaths(paths: (LatLng | LatLngLiteral)[][] | LatLngBounds): void;
      }

      interface PolygonOptions {
        paths?: (LatLng | LatLngLiteral)[][] | LatLngBounds;
        map?: Map;
      }

      class Polyline {
        constructor(opts?: PolylineOptions);
        setMap(map: Map | null): void;
        setPath(path: (LatLng | LatLngLiteral)[]): void;
      }

      interface PolylineOptions {
        path?: (LatLng | LatLngLiteral)[];
        map?: Map;
      }

      // Utility types
      interface event {
        addListener(instance: any, eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      }
    }
  }
}

export {};

// Leaflet image module declarations
declare module 'leaflet/dist/images/marker-icon.png' {
  const value: string;
  export default value;
}

declare module 'leaflet/dist/images/marker-shadow.png' {
  const value: string;
  export default value;
}
