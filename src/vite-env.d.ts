/// <reference types="vite/client" />
/// <reference types="node" />
/// <reference types="@types/google.maps" />

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

// Google Analytics gtag function
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    google?: typeof google;
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
