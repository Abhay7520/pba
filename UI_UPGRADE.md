# CivicLink UI upgrade

## Run locally

Open a terminal in `civic/civic-connect-go`, then run:

```sh
npm install --legacy-peer-deps
npm run dev
```

Open the address printed by Vite (normally http://localhost:8080).
The legacy peer dependency option accommodates the original project's React 18 / React Leaflet 5 dependency combination. Dependencies were not changed in this upgrade. Reinstall dependencies rather than reusing the original Windows node_modules folder.

## What's improved

- Shared teal and green design, rounded cards, softer shadows and responsive typography.
- Home hero, feature cards and impact section refreshed.
- Active navigation indicators, keyboard-accessible mobile menu, mobile profile link and theme toggle.
- Dashboard, analytics, authentication, profile, map and 404 page styling.
- Entrance animations, scrolling reveals, button feedback and feature icon hover effects.
- Dark theme styles for the report form and shared pages.
- Reduced-motion support, visible keyboard focus and skip-to-content link.

## Preserved

All routes (`/`, `/auth`, `/map`, `/profile`, `/report`, `/analytics`, `/admin`, `*`), route protection, authentication context, Firebase code, data structures and AI model URL/loading/classification are preserved. The existing report page's application code is byte-for-byte unchanged. Map and profile storage behavior is unchanged. Two existing TypeScript typing issues were corrected without altering runtime logic.

## Verification

Production Vite build, TypeScript application check, stylesheet compilation and lint checks for the new animation component and navigation pass. Original routes and model/authentication modules were compared against the uploaded ZIP. Browser visual verification was unavailable because the browser download failed. Live Firebase, Google sign-in, model downloads, geolocation and map tile services require verification in your browser with the existing configuration.

The ZIP includes source, assets, configuration and this guide. Generated dependencies, Git history and build output are excluded; no application routes or model code are excluded.
