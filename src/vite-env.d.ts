/// <reference types="vite/client" />

// Leaflet is loaded by the map page using its existing CDN script.
interface Window {
  L: typeof import("leaflet");
}
