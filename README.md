# Soundmark — Global Listening Room & Live TV

Boutique hi-fi music discovery, full-length global artist streaming, a 5-band parametric equalizer, Rwanda artists directory, and live international HLS television streaming.

## Features

- **Discover & Curated Sessions**: Trending full-length tracks, vinyl/studio sessions, live world radio relays, and Spotify embed resolution.
- **Rwanda Music Hub**: Searchable directory of 270+ verified Rwandan artists across Afropop & R&B, Hip-Hop & Kinyatrap, Gakondo & Classics, Gospel & Choirs, and DJs & Producers, paired with playable category mixes and live Kigali FM radio.
- **Global Live TV Theatre**: 14 live television categories (`General`, `News`, `Religious`, `Entertainment`, `Music`, `Movies`, `Series`, `Sports`, `Kids`, `Legislative`, `Education`, `Culture`, `Documentary`, `Comedy`) with adaptive HLS playback, CORS relay fallback, and a dockable Mini TV screen.
- **Studio Console & 5-Band EQ**: Dual-deck equal-power queue crossfade, Web Audio FFT spectrum visualizer, 5-band parametric equalizer presets, playback rate control, and synced lyrics/liner notes.
- **Resilient Error Handling**: Typed HTTP/network/timeout error normalization (`src/utils/errors.ts`), reusable `ErrorNotice` recovery UI, and React `ErrorBoundary` isolation.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `hls.js`, `lucide-react`
- **Backend**: Express (`server.ts`) with Vite dev middleware and HLS/audio proxy endpoints

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` if setting optional runtime environment variables (never commit `.env`):
   ```bash
   cp .env.example .env
   ```
3. Start the full-stack development server (port `3000`):
   ```bash
   npm run dev
   ```

## Verification Scripts

```bash
npm run typecheck   # Strict TypeScript check
npm run lint        # Project tsconfig check
npm run build       # Production Vite bundle
npm start           # Production server (dist/ + Express)
```
