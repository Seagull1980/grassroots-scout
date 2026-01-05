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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Leaflet image module declarations
declare module 'leaflet/dist/images/marker-icon.png' {
  const value: string;
  export default value;
}

declare module 'leaflet/dist/images/marker-shadow.png' {
  const value: string;
  export default value;
}

// Google Maps types
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: any);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      getZoom(): number;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latLng: LatLng | LatLngLiteral): void;
      setAnimation(animation: Animation | null): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    class Polygon {
      constructor(opts?: PolygonOptions);
      setMap(map: Map | null): void;
      getPath(): MVCArray<LatLng>;
      setPath(path: LatLng[] | LatLngLiteral[]): void;
    }

    class Polyline {
      constructor(opts?: PolylineOptions);
      setMap(map: Map | null): void;
      getPath(): MVCArray<LatLng>;
    }

    class Circle {
      constructor(opts?: CircleOptions);
      setMap(map: Map | null): void;
      setCenter(center: LatLng | LatLngLiteral): void;
      setRadius(radius: number): void;
    }

    class MVCArray<T> {
      getAt(i: number): T;
      getLength(): number;
      push(elem: T): number;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map, anchor?: Marker): void;
      close(): void;
      setContent(content: string | Element): void;
      setPosition(position: LatLng | LatLngLiteral): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      contains(latLng: LatLng | LatLngLiteral): boolean;
    }

    class Geocoder {
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
    }

    namespace event {
      function addListener(instance: any, eventName: string, handler: Function): MapsEventListener;
      function removeListener(listener: MapsEventListener): void;
    }

    namespace geometry {
      namespace spherical {
        function computeDistanceBetween(from: LatLng, to: LatLng): number;
      }
    }

    namespace drawing {
      class DrawingManager {
        constructor(options?: any);
        setMap(map: Map | null): void;
      }
    }

    namespace marker {
      class AdvancedMarkerElement {
        constructor(options?: any);
        position: LatLng | LatLngLiteral;
        map: Map | null;
      }
      
      enum CollisionBehavior {
        REQUIRED = 'REQUIRED',
        REQUIRED_AND_HIDES_OPTIONAL = 'REQUIRED_AND_HIDES_OPTIONAL',
        OPTIONAL_AND_HIDES_LOWER_PRIORITY = 'OPTIONAL_AND_HIDES_LOWER_PRIORITY'
      }
    }

    interface MapMouseEvent {
      latLng: LatLng;
      stop(): void;
    }

    interface PolygonOptions {
      paths?: LatLng[] | LatLngLiteral[];
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
      editable?: boolean;
      draggable?: boolean;
    }

    interface PolylineOptions {
      path?: LatLng[] | LatLngLiteral[];
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      map?: Map;
    }

    interface CircleOptions {
      center?: LatLng | LatLngLiteral;
      radius?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
    }

    namespace places {
      class Autocomplete {
        constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: Function): MapsEventListener;
        getPlace(): PlaceResult;
        setBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
      }

      class PlacesService {
        constructor(attrContainer: HTMLDivElement | Map);
        getDetails(request: PlaceDetailsRequest, callback: (result: PlaceResult, status: PlacesServiceStatus) => void): void;
      }

      class PlaceAutocompleteElement extends HTMLElement {
        constructor();
      }

      interface PlaceResult {
        formatted_address?: string;
        geometry?: {
          location: LatLng;
          viewport: LatLngBounds;
        };
        place_id?: string;
        name?: string;
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
      }

      interface AutocompleteOptions {
        types?: string[];
        componentRestrictions?: { country: string | string[] };
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        fields?: string[];
      }

      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        INVALID_REQUEST = 'INVALID_REQUEST',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR'
      }
    }

    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      animation?: Animation;
      icon?: string | Icon | Symbol;
    }

    interface InfoWindowOptions {
      content?: string | Element;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }

    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      placeId?: string;
    }

    interface GeocoderResult {
      formatted_address: string;
      geometry: {
        location: LatLng;
        location_type: string;
        viewport: LatLngBounds;
      };
      place_id: string;
      types: string[];
    }

    interface Icon {
      url: string;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
    }

    interface Symbol {
      path: string | SymbolPath;
      fillColor?: string;
      fillOpacity?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
    }

    class Point {
      constructor(x: number, y: number);
    }

    interface MapsEventListener {
      remove(): void;
    }

    enum Animation {
      BOUNCE = 1,
      DROP = 2
    }

    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4
    }

    enum GeocoderStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }
  }
}

interface Window {
  google: typeof google;
}

