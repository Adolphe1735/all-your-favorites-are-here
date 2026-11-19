import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import type {
  ArtistSummary,
  CuratedPlaylist,
  DiscoverCatalog,
  MusicStoreDirectoryItem,
  MusicTrack,
  SpotifyCuratedPlaylist,
  StoreLink,
  TvCategoryOption,
  TvChannel,
  TvCountryOption,
} from './src/types/music.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT =
  Number(process.env.DEFAULT_APP_PORT) ||
  (process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT
    ? 3000
    : Number(process.env.PORT)) ||
  3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Curated generated artwork paths served statically from /src/assets/images
const ARTWORK_ELECTRONIC = '/src/assets/images/cover_electronic_sessions_1794641732983.jpg';
const ARTWORK_ACOUSTIC = '/src/assets/images/cover_acoustic_warmth_1794641733848.jpg';
const ARTWORK_JAZZ = '/src/assets/images/cover_midnight_jazz_1794641734051.jpg';
const ARTWORK_AMBIENT = '/src/assets/images/cover_ambient_horizon_1794641734688.jpg';
const HERO_LISTENING_ROOM = '/src/assets/images/hero_listening_room_1794641735621.jpg';

const AUDIUS_HOSTS = [
  'https://discoveryprovider.audius.co',
  'https://discoveryprovider2.audius.co',
  'https://discoveryprovider3.audius.co',
  'https://api.audius.co',
];

const RADIO_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];

const COUNTRIES = [
  'All Countries',
  'United States',
  'United Kingdom',
  'Japan',
  'Germany',
  'France',
  'Nigeria',
  'Rwanda',
  'Ghana',
  'Kenya',
  'South Africa',
  'Brazil',
  'Iceland',
  'Canada',
  'Australia',
  'Global',
];

const PLATFORMS = [
  'All Platforms',
  'Audius',
  'YouTube Music',
  'Internet Archive',
  'Wikimedia Commons',
  'Global Radio',
];

const GENRES = [
  'All Genres',
  'Electronic',
  'Ambient',
  'Jazz',
  'Acoustic',
  'Hip-Hop',
  'Afrobeats',
  'Classical',
  'Indie',
  'Pop',
  'World',
];

const MUSIC_STORES: MusicStoreDirectoryItem[] = [
  {
    id: 'bandcamp',
    name: 'Bandcamp',
    category: 'Direct-to-Artist Marketplace',
    formats: 'FLAC · WAV · ALAC · MP3 · Vinyl',
    description:
      'Independent artist and label storefront offering DRM-free lossless downloads, physical pressings, and direct artist payouts.',
    url: 'https://bandcamp.com',
    searchTemplate: 'https://bandcamp.com/search?q={q}',
  },
  {
    id: 'qobuz',
    name: 'Qobuz',
    category: 'Hi-Res Audiophile Store',
    formats: '24-Bit / 192kHz FLAC · DSD · ALAC',
    description:
      'Studio-master digital download store and editorial catalog specializing in jazz, classical, electronic, and audiophile pressings.',
    url: 'https://www.qobuz.com',
    searchTemplate: 'https://www.qobuz.com/us-en/search?q={q}',
  },
  {
    id: 'beatport',
    name: 'Beatport',
    category: 'Electronic & DJ Catalog',
    formats: 'AIFF · WAV · MP3 320kbps',
    description:
      'Specialized storefront for club DJs, house, techno, ambient electronic producers, and independent underground labels.',
    url: 'https://www.beatport.com',
    searchTemplate: 'https://www.beatport.com/search?q={q}',
  },
  {
    id: 'itunes',
    name: 'iTunes / Apple Music',
    category: 'Global Digital Catalog',
    formats: '256kbps AAC · Lossless Spatial',
    description:
      'Official global music catalog supporting direct single purchases, album downloads, and universal artist lookup.',
    url: 'https://music.apple.com',
    searchTemplate: 'https://music.apple.com/us/search?term={q}',
  },
  {
    id: '7digital',
    name: '7digital',
    category: 'DRM-Free Lossless Store',
    formats: 'FLAC 16/24-Bit · MP3 320kbps',
    description:
      'High-resolution DRM-free digital storefront serving independent labels, major distributors, and soundtrack releases.',
    url: 'https://us.7digital.com',
    searchTemplate: 'https://us.7digital.com/Search?search={q}',
  },
  {
    id: 'amazon',
    name: 'Amazon Music',
    category: 'Digital & Vinyl Storefront',
    formats: 'MP3 · CD · Vinyl Pressings',
    description:
      'Broad commercial music storefront combining instant MP3 downloads with physical vinyl and CD editions.',
    url: 'https://music.amazon.com',
    searchTemplate: 'https://music.amazon.com/search/{q}',
  },
  {
    id: 'tidal',
    name: 'TIDAL',
    category: 'Lossless & Master Streaming',
    formats: 'FLAC HiRes · Dolby Atmos',
    description:
      'Artist-aligned lossless music catalog with detailed session credits, liner metadata, and hi-fi playback.',
    url: 'https://tidal.com',
    searchTemplate: 'https://listen.tidal.com/search?q={q}',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Streaming & Playlist Ecosystem',
    formats: 'Interactive Embeds · Catalog Sync',
    description:
      'Global streaming catalog integrated with embedded Spotify players and playlist/track URL importing inside Soundmark.',
    url: 'https://open.spotify.com',
    searchTemplate: 'https://open.spotify.com/search/{q}',
  },
];

const SPOTIFY_PLAYLISTS: SpotifyCuratedPlaylist[] = [
  {
    id: 'sp-lofi-studio',
    title: 'Late Night Tape Studies',
    subtitle: 'Warm analog beats, dusty electric pianos, and intimate midnight textures.',
    curator: 'Spotify Editorial',
    coverUrl: ARTWORK_ACOUSTIC,
    spotifyEmbedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXc8kgYqQLMfH',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXc8kgYqQLMfH',
  },
  {
    id: 'sp-jazz-room',
    title: 'Tokyo & London Jazz Bar',
    subtitle: 'Modern spiritual jazz, upright bass solos, and nocturnal brass sessions.',
    curator: 'Spotify Jazz',
    coverUrl: ARTWORK_JAZZ,
    spotifyEmbedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXbITWG1ZJKYt',
  },
  {
    id: 'sp-electronic-pulse',
    title: 'Berlin Modular & House',
    subtitle: 'Deep hypnotic hardware grooves, melodic synth lines, and club cuts.',
    curator: 'Spotify Electronic',
    coverUrl: ARTWORK_ELECTRONIC,
    spotifyEmbedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX6J5NfMJS675',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX6J5NfMJS675',
  },
  {
    id: 'sp-ambient-nordic',
    title: 'Nordic Ambient Horizon',
    subtitle: 'Spatial modular drones, felt piano meditations, and minimalist field recordings.',
    curator: 'Spotify Ambient',
    coverUrl: ARTWORK_AMBIENT,
    spotifyEmbedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX3Ogo9pFvBkY',
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY',
  },
];

function buildStoreLinks(artist: string, title: string, spotifyUrl?: string): StoreLink[] {
  const query = encodeURIComponent(`${artist} ${title}`.trim());
  return [
    {
      id: 'bandcamp',
      name: 'Bandcamp',
      tagline: 'Direct-to-Artist FLAC / WAV / Vinyl',
      url: `https://bandcamp.com/search?q=${query}`,
    },
    {
      id: 'qobuz',
      name: 'Qobuz',
      tagline: '24-Bit Hi-Res Lossless Download',
      url: `https://www.qobuz.com/us-en/search?q=${query}`,
    },
    {
      id: 'beatport',
      name: 'Beatport',
      tagline: 'Lossless Electronic & Club Catalog',
      url: `https://www.beatport.com/search?q=${query}`,
    },
    {
      id: 'itunes',
      name: 'iTunes / Apple Music',
      tagline: 'Official AAC / Lossless Store',
      url: `https://music.apple.com/us/search?term=${query}`,
    },
    {
      id: '7digital',
      name: '7digital',
      tagline: 'DRM-Free MP3 / FLAC Store',
      url: `https://us.7digital.com/Search?search=${query}`,
    },
    {
      id: 'spotify',
      name: 'Spotify',
      tagline: 'Open & Save in Spotify',
      url: spotifyUrl || `https://open.spotify.com/search/${query}`,
    },
  ];
}

function proxyStreamUrl(rawUrl: string): string {
  return `/api/music/stream?url=${encodeURIComponent(rawUrl)}`;
}

function isPrivateOrBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // Cloud metadata & link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // Private RFC1918
  if (a === 192 && b === 168) return true; // Private RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // Multicast & reserved
  return false;
}

function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return false;
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    if (net.isIPv4(host)) {
      return !isPrivateOrBlockedIpv4(host);
    }
    if (net.isIPv6(host)) {
      const norm = host.toLowerCase();
      if (norm === '::' || norm === '::1') return false;
      if (norm.startsWith('fe80:') || norm.startsWith('fc') || norm.startsWith('fd')) return false;
      if (norm.startsWith('::ffff:')) {
        const mapped = norm.slice('::ffff:'.length);
        if (net.isIPv4(mapped)) return !isPrivateOrBlockedIpv4(mapped);
      }
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchWithHandshakeTimeout(
  url: string,
  init: RequestInit,
  req: Request,
  timeoutMs = 15000,
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const onClose = () => controller.abort();
  req.on('close', onClose);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs = 5500,
  extraHeaders?: Record<string, string>,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoundmarkAudioPlatform/1.0',
        Accept: 'application/json',
        ...extraHeaders,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface AudiusUserRaw {
  id: string;
  name?: string;
  handle?: string;
  location?: string;
  bio?: string;
  is_verified?: boolean;
  track_count?: number;
  follower_count?: number;
  profile_picture?: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  };
}

interface AudiusTrackRaw {
  id: string;
  title?: string;
  genre?: string;
  duration?: number;
  is_streamable?: boolean;
  release_date?: string;
  mood?: string;
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  };
  user?: AudiusUserRaw;
}

function mapAudiusTrack(raw: AudiusTrackRaw, host: string): MusicTrack {
  const artistName = raw.user?.name || raw.user?.handle || 'Independent Artist';
  const title = raw.title || 'Untitled Session';
  const coverUrl =
    raw.artwork?.['480x480'] ||
    raw.artwork?.['1000x1000'] ||
    raw.artwork?.['150x150'] ||
    ARTWORK_ELECTRONIC;
  const avatarUrl =
    raw.user?.profile_picture?.['480x480'] || raw.user?.profile_picture?.['150x150'] || coverUrl;
  const rawStream = `${host}/v1/tracks/${encodeURIComponent(raw.id)}/stream?app_name=Soundmark`;
  const country = raw.user?.location?.trim() || 'Global';
  return {
    id: `audius-${raw.id}`,
    title,
    artist: artistName,
    artistId: raw.user?.id ? `audius-user-${raw.user.id}` : undefined,
    artistHandle: raw.user?.handle ? `@${raw.user.handle.replace(/^@/, '')}` : undefined,
    artistLocation: country,
    artistAvatar: avatarUrl,
    artistVerified: Boolean(raw.user?.is_verified),
    album: raw.mood ? `${raw.mood} Sessions` : 'Audius Master',
    genre: raw.genre || 'Electronic',
    country,
    durationSec: Number(raw.duration) || 210,
    audioUrl: proxyStreamUrl(rawStream),
    coverUrl,
    year: raw.release_date ? String(raw.release_date).slice(0, 4) : '2025',
    license: 'Full Stream',
    sourceLabel: 'Audius',
    isPreview: false,
    bitrateLabel: '320 kbps Full',
    storeLinks: buildStoreLinks(artistName, title),
  };
}

async function fetchAudiusTrending(genre?: string, limit = 14): Promise<{ tracks: MusicTrack[]; host: string }> {
  for (const host of AUDIUS_HOSTS) {
    const params = new URLSearchParams({ app_name: 'Soundmark', limit: String(limit) });
    if (genre && genre !== 'All Genres') params.set('genre', genre);
    const json = await fetchJsonWithTimeout<{ data?: AudiusTrackRaw[] }>(
      `${host}/v1/tracks/trending?${params.toString()}`,
      4500,
    );
    if (json?.data && json.data.length > 0) {
      return {
        host,
        tracks: json.data
          .filter(
            (t) =>
              t.id &&
              t.title &&
              t.is_streamable !== false &&
              (!t.duration || Number(t.duration) >= 45),
          )
          .map((t) => mapAudiusTrack(t, host)),
      };
    }
  }
  return { host: AUDIUS_HOSTS[0], tracks: [] };
}

async function searchAudiusTracks(query: string, limit = 16): Promise<MusicTrack[]> {
  for (const host of AUDIUS_HOSTS) {
    const params = new URLSearchParams({
      app_name: 'Soundmark',
      query: query || 'ambient',
      limit: String(limit),
    });
    const json = await fetchJsonWithTimeout<{ data?: AudiusTrackRaw[] }>(
      `${host}/v1/tracks/search?${params.toString()}`,
      4500,
    );
    if (json?.data && json.data.length > 0) {
      return json.data
        .filter(
          (t) =>
            t.id &&
            t.title &&
            t.is_streamable !== false &&
            (!t.duration || Number(t.duration) >= 45),
        )
        .map((t) => mapAudiusTrack(t, host));
    }
  }
  return [];
}

async function searchAudiusArtists(query: string, limit = 16): Promise<ArtistSummary[]> {
  for (const host of AUDIUS_HOSTS) {
    const params = new URLSearchParams({
      app_name: 'Soundmark',
      query: query || 'music',
      limit: String(limit),
    });
    const json = await fetchJsonWithTimeout<{ data?: AudiusUserRaw[] }>(
      `${host}/v1/users/search?${params.toString()}`,
      4500,
    );
    if (json?.data && json.data.length > 0) {
      return json.data.map((u) => ({
        id: `audius-user-${u.id}`,
        name: u.name || u.handle || 'Independent Artist',
        handle: u.handle ? `@${u.handle.replace(/^@/, '')}` : undefined,
        location: u.location?.trim() || 'Global',
        avatarUrl:
          u.profile_picture?.['480x480'] ||
          u.profile_picture?.['150x150'] ||
          ARTWORK_ELECTRONIC,
        verified: Boolean(u.is_verified),
        bio: u.bio || undefined,
        sourceLabel: 'Audius',
        trackCount: u.track_count,
        followerCount: u.follower_count,
        topTracks: [],
      }));
    }
  }
  return [];
}

interface RadioStationRaw {
  stationuuid: string;
  name: string;
  url_resolved?: string;
  url: string;
  favicon?: string;
  tags?: string;
  country?: string;
  bitrate?: number;
  codec?: string;
}

async function fetchRadioStations(
  country?: string,
  query?: string,
  limit = 8,
  tag?: string,
): Promise<MusicTrack[]> {
  for (const host of RADIO_HOSTS) {
    const params = new URLSearchParams({
      limit: String(limit),
      hidebroken: 'true',
      order: 'clickcount',
      reverse: 'true',
      is_https: 'true',
    });
    if (country && country !== 'All Countries' && country !== 'ALL' && country !== 'Global') {
      params.set('country', country);
    }
    if (query) {
      params.set('name', query);
    }
    if (tag && tag !== 'all' && tag !== 'All Radio') {
      params.set('tag', tag);
    }
    const json = await fetchJsonWithTimeout<RadioStationRaw[]>(
      `${host}/json/stations/search?${params.toString()}`,
      4500,
    );
    if (Array.isArray(json) && json.length > 0) {
      return json
        .filter((s) => (s.url_resolved || s.url) && s.name)
        .slice(0, limit)
        .map((s, idx) => {
          const streamUrl = s.url_resolved || s.url;
          const tags = (s.tags || 'World Radio')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          const genre = tags[0] ? tags[0][0].toUpperCase() + tags[0].slice(1) : 'World';
          const fallbackArt = [ARTWORK_JAZZ, ARTWORK_AMBIENT, ARTWORK_ELECTRONIC, ARTWORK_ACOUSTIC][
            idx % 4
          ];
          return {
            id: `radio-${s.stationuuid}`,
            title: s.name.trim(),
            artist: `${s.country || 'International'} Broadcast`,
            artistLocation: s.country || 'Global',
            album: 'Live FM & Web Relay',
            genre,
            country: s.country || 'Global',
            durationSec: 0,
            audioUrl: proxyStreamUrl(streamUrl),
            coverUrl: s.favicon && s.favicon.startsWith('https://') ? s.favicon : fallbackArt,
            license: 'Live Broadcast',
            sourceLabel: 'Global Radio',
            isLive: true,
            bitrateLabel: s.bitrate ? `${s.bitrate} kbps ${s.codec || 'Live'}` : 'Live Stream',
            storeLinks: buildStoreLinks(s.name.trim(), 'Radio'),
          };
        });
    }
  }
  return [];
}

interface ArchiveDocRaw {
  identifier: string;
  title?: string;
  creator?: string | string[];
  year?: string;
  subject?: string | string[];
}

async function searchInternetArchiveTracks(query: string, limit = 6): Promise<MusicTrack[]> {
  const q = query ? `(${query}) AND mediatype:audio` : 'mediatype:audio AND (jazz OR ambient OR acoustic)';
  const params = new URLSearchParams({
    q,
    'fl[]': 'identifier,title,creator,year,subject',
    rows: String(limit),
    page: '1',
    output: 'json',
    'sort[]': 'downloads desc',
  });
  const json = await fetchJsonWithTimeout<{ response?: { docs?: ArchiveDocRaw[] } }>(
    `https://archive.org/advancedsearch.php?${params.toString()}`,
    5000,
  );
  const docs = json?.response?.docs || [];
  const metaList = await Promise.all(
    docs.slice(0, limit).map(async (doc) => {
      const meta = await fetchJsonWithTimeout<{
        files?: Array<{ name: string; format?: string; length?: string }>;
      }>(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`, 3500);
      return { doc, meta };
    }),
  );

  const results: MusicTrack[] = [];
  for (const { doc, meta } of metaList) {
    const mp3File = meta?.files?.find(
      (f) => f.name.toLowerCase().endsWith('.mp3') && !f.name.includes('_64kb'),
    );
    if (!mp3File) continue;

    const artist = Array.isArray(doc.creator)
      ? doc.creator[0]
      : doc.creator || 'Archival Recording';
    const title = doc.title || doc.identifier;
    const rawStream = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(mp3File.name)}`;
    const durationSec = Math.round(Number(mp3File.length)) || 240;
    if (durationSec < 45) continue;

    results.push({
      id: `ia-${doc.identifier}`,
      title,
      artist,
      artistId: `ia-artist-${encodeURIComponent(artist)}`,
      artistLocation: 'Public Archive',
      album: 'Internet Archive Collection',
      genre: 'Classical',
      country: 'Global',
      durationSec,
      audioUrl: proxyStreamUrl(rawStream),
      coverUrl: ARTWORK_ACOUSTIC,
      year: doc.year ? String(doc.year).slice(0, 4) : 'Archive',
      license: 'Open Archive · Full Stream',
      sourceLabel: 'Internet Archive',
      isPreview: false,
      bitrateLabel: 'MP3 Full Archive',
      storeLinks: buildStoreLinks(artist, title),
    });
  }

  return results;
}

// Built-in resilient fallback tracks using verified Wikimedia Commons public domain / CC OGG/MP3 audio
// so even if external APIs are rate-limited, every curated session has real full-length playable audio!
const RESILIENT_FALLBACK_TRACKS: MusicTrack[] = [
  {
    id: 'wm-gymnopedie-1',
    title: 'Gymnopédie No. 1 (Atelier Tape Transfer)',
    artist: 'Erik Satie · Robin Alciatore',
    artistId: 'wm-artist-satie',
    artistLocation: 'France',
    artistAvatar: ARTWORK_ACOUSTIC,
    artistVerified: true,
    album: 'Open Archival Piano',
    genre: 'Classical',
    country: 'France',
    durationSec: 185,
    audioUrl: proxyStreamUrl(
      'https://upload.wikimedia.org/wikipedia/commons/3/35/Gymnopedie_No_1.ogg',
    ),
    coverUrl: ARTWORK_ACOUSTIC,
    year: '1888',
    license: 'Public Domain · Full Stream',
    sourceLabel: 'Wikimedia Commons',
    isPreview: false,
    bitrateLabel: 'Ogg Vorbis Full',
    storeLinks: buildStoreLinks('Erik Satie', 'Gymnopedie No. 1'),
  },
  {
    id: 'wm-clair-de-lune',
    title: 'Clair de Lune (Suite Bergamasque)',
    artist: 'Claude Debussy · Laurens Goedhart',
    artistId: 'wm-artist-debussy',
    artistLocation: 'France',
    artistAvatar: ARTWORK_AMBIENT,
    artistVerified: true,
    album: 'Nocturnes & Impressionism',
    genre: 'Ambient',
    country: 'France',
    durationSec: 304,
    audioUrl: proxyStreamUrl(
      'https://upload.wikimedia.org/wikipedia/commons/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg',
    ),
    coverUrl: ARTWORK_AMBIENT,
    year: '1905',
    license: 'CC BY-SA · Full Stream',
    sourceLabel: 'Wikimedia Commons',
    isPreview: false,
    bitrateLabel: 'Ogg Vorbis Full',
    storeLinks: buildStoreLinks('Claude Debussy', 'Clair de Lune'),
  },
  {
    id: 'wm-bach-cello',
    title: 'Cello Suite No. 1 in G Major, Prelude',
    artist: 'J.S. Bach · John Michel',
    artistId: 'wm-artist-bach',
    artistLocation: 'Germany',
    artistAvatar: ARTWORK_JAZZ,
    artistVerified: true,
    album: 'Solo Acoustic Strings',
    genre: 'Acoustic',
    country: 'Germany',
    durationSec: 162,
    audioUrl: proxyStreamUrl(
      'https://upload.wikimedia.org/wikipedia/commons/5/55/Johann_Sebastian_Bach_-_Cello_Suite_No._1_in_G_Major%2C_BWV_1007_-_I._Prelude.ogg',
    ),
    coverUrl: ARTWORK_JAZZ,
    year: '1720',
    license: 'CC BY · Full Stream',
    sourceLabel: 'Wikimedia Commons',
    isPreview: false,
    bitrateLabel: 'Ogg Vorbis Full',
    storeLinks: buildStoreLinks('Johann Sebastian Bach', 'Cello Suite No 1 Prelude'),
  },
  {
    id: 'wm-chopin-nocturne',
    title: 'Nocturne in E-Flat Major, Op. 9 No. 2',
    artist: 'Frédéric Chopin · Frank Levy',
    artistId: 'wm-artist-chopin',
    artistLocation: 'United States',
    artistAvatar: ARTWORK_ELECTRONIC,
    artistVerified: true,
    album: 'Midnight Salon Recordings',
    genre: 'Classical',
    country: 'United States',
    durationSec: 274,
    audioUrl: proxyStreamUrl(
      'https://upload.wikimedia.org/wikipedia/commons/8/82/Chopin_-_Nocturne_in_E-flat_major%2C_Op._9_No._2.ogg',
    ),
    coverUrl: ARTWORK_ELECTRONIC,
    year: '1832',
    license: 'Public Domain · Full Stream',
    sourceLabel: 'Wikimedia Commons',
    isPreview: false,
    bitrateLabel: 'Ogg Vorbis Full',
    storeLinks: buildStoreLinks('Chopin', 'Nocturne Op 9 No 2'),
  },
];

/* ============================================================================
 * Rwanda Music Catalog ("Abahanzi bose bo mu Rwanda n'indirimbo zabo zose")
 * ============================================================================ */
type RwandaGenreCategory =
  | 'Afropop & R&B'
  | 'Hip-Hop & Kinyatrap'
  | 'Gakondo & Classics'
  | 'Gospel & Choirs'
  | 'DJs & Producers';

interface RwandaArtistSeed {
  name: string;
  genre: RwandaGenreCategory;
  location?: string;
  era?: string;
  label?: string;
  signatureTracks?: string[];
  bio: string;
}

const RWANDA_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  All: 'Complete directory spanning contemporary Kigali Afropop, Kinyatrap, heritage Gakondo & Inanga masters, worship choirs, and club DJs & beatmakers.',
  'Afropop & R&B': 'Kigali pop vocalists, Afro-fusion balladeers, and contemporary R&B hitmakers shaping East African airwaves.',
  'Hip-Hop & Kinyatrap': 'From Ibisumizi & Tuff Gang lyricists to Green Ferry and Trappish Music Kinyatrap and drill pioneers.',
  'Gakondo & Classics': 'Traditional Inanga virtuosos, Amasimbi heritage ensembles, and golden-era Karahanyuze guitar legends.',
  'Gospel & Choirs': 'Polyphonic cathedrals, Seventh-day Adventist & Pentecostal worship collectives, and solo gospel ministers.',
  'DJs & Producers': 'Architects of the Kigali sound—chart-topping beatmakers, sound engineers, and open-format club & festival DJs.',
};

const RWANDA_ARTISTS_SEED: RwandaArtistSeed[] = [
  // Afropop & R&B
  { name: 'Bruce Melodie', genre: 'Afropop & R&B', label: '1:55AM / Igitangaza', signatureTracks: ['Katerina', 'Saa Moya', 'Selebura', 'When She Is Around'], bio: 'Award-winning Rwandan Afropop & R&B vocalist known for Katerina, Saa Moya, Selebura, and When She Is Around.' },
  { name: 'Meddy', genre: 'Afropop & R&B', location: 'Kigali / Texas', label: 'PressOne', signatureTracks: ['Slowly', 'My Vow', 'Adi Top', 'Holy Spirit'], bio: 'Contemporary Rwandan R&B and Afropop star behind Slowly, My Vow, Adi Top, and Holy Spirit.' },
  { name: 'The Ben', genre: 'Afropop & R&B', location: 'Kigali / Chicago', label: 'Rockhill', signatureTracks: ['Habibi', 'Fine Girl', 'Can’t Get Enough', 'Why'], bio: 'Rwandan R&B & Afrobeats pioneer known for Habibi, Fine Girl, Can’t Get Enough, and Why.' },
  { name: 'Knowless Butera', genre: 'Afropop & R&B', label: 'Kina Music', signatureTracks: ['Baramushaka', 'Ko Nashize', 'Nyigisha'], bio: 'Kina Music vocalist and Primus Guma Guma Super Star winner behind Baramushaka, Ko Nashize, and Nyigisha.' },
  { name: 'King James', genre: 'Afropop & R&B', era: '2009–Present', signatureTracks: ['Yaciye Ibintu', 'Pala Pala', 'Nta Kibazo'], bio: 'Veteran Rwandan R&B and Afropop hitmaker behind Yaciye Ibintu, Pala Pala, and Nta Kibazo.' },
  { name: 'Chriss Eazy', genre: 'Afropop & R&B', label: 'Giti Business', signatureTracks: ['Inana', 'Basi Sori', 'Edeni', 'Stop'], bio: 'New-wave Kigali Afropop hitmaker behind Inana, Basi Sori, Edeni, and Stop.' },
  { name: 'Juno Kizigenza', genre: 'Afropop & R&B', signatureTracks: ['Mpa Formula', 'Nazubaye', 'Please Me'], bio: 'Modern Rwandan Afropop singer-songwriter known for Mpa Formula, Nazubaye, and Please Me.' },
  { name: 'Nel Ngabo', genre: 'Afropop & R&B', label: 'Kina Music', signatureTracks: ['Zoli', 'Muzadukumbura', 'Nywe'], bio: 'Kina Music R&B and Afrobeats singer known for Zoli, Muzadukumbura, and Nywe.' },
  { name: 'Kenny Sol', genre: 'Afropop & R&B', signatureTracks: ['Haso', 'Forget', 'Joli'], bio: 'Rwandan Afropop and R&B vocalist behind Haso, Forget, and Joli.' },
  { name: 'Element Eleéeh', genre: 'Afropop & R&B', label: '1:55AM', signatureTracks: ['Kashe', 'Fou de Toi'], bio: 'Chart-topping Rwandan producer & Afropop singer behind Kashe and Fou de Toi.' },
  { name: 'Ariel Wayz', genre: 'Afropop & R&B', era: 'Nyundo Alumni', signatureTracks: ['Away', 'La Vie', 'Chamber'], bio: 'Nyundo-trained Rwandan R&B & soul singer known for Away, La Vie, and Chamber.' },
  { name: 'Yvan Buravan', genre: 'Afropop & R&B', era: 'RFI Prix Découvertes', signatureTracks: ['Malaika', 'Oya', 'Twaje', 'Si Belle'], bio: 'Prix Découvertes RFI laureate celebrated for Malaika, Oya, Twaje, and Si Belle.' },
  { name: 'Christopher Muneza', genre: 'Afropop & R&B', signatureTracks: ['Birahagije', 'Habona', 'Mi Casa'], bio: 'Rwandan R&B ballad specialist behind Birahagije, Habona, and Mi Casa.' },
  { name: 'Tom Close', genre: 'Afropop & R&B', label: 'Kina Music', signatureTracks: ['Komeza Utsinde', 'Ndagukunda'], bio: 'Pioneer of modern Rwandan Afropop and R&B behind Komeza Utsinde and Ndagukunda.' },
  { name: 'Platini P', genre: 'Afropop & R&B', signatureTracks: ['Atansiyo', 'Veronika'], bio: 'Former Dream Boyz vocalist and solo Afrobeats performer behind Atansiyo and Veronika.' },
  { name: 'Dream Boyz', genre: 'Afropop & R&B', signatureTracks: ['Magorwa', 'Uzahahe Uronke', '70'], bio: 'Iconic Rwandan Afropop duo (Platini & TMC) behind Magorwa, Uzahahe Uronke, and 70.' },
  { name: 'Urban Boyz', genre: 'Afropop & R&B', location: 'Huye / Kigali', signatureTracks: ['Till I Die', 'Tayali', 'Yawe'], bio: 'Pioneering Kigali Afrobeats trio behind Till I Die, Tayali, and Yawe.' },
  { name: 'Safi Madiba', genre: 'Afropop & R&B', signatureTracks: ['Got It', 'Kimwe Kimwe', 'Kontwari'], bio: 'Former Urban Boyz lead singer known for Got It, Kimwe Kimwe, and Kontwari.' },
  { name: 'Mike Kayihura', genre: 'Afropop & R&B', signatureTracks: ['Any Time', 'Sabotage', 'Tuza'], bio: 'Kigali neo-soul and R&B singer-songwriter behind Any Time, Sabotage, and Tuza.' },
  { name: 'Andy Bumuntu', genre: 'Afropop & R&B', signatureTracks: ['Mine', 'Valentine', 'On Fire'], bio: 'Blues, acoustic, and R&B singer known for Mine, Valentine, and On Fire.' },
  { name: 'Bwiza', genre: 'Afropop & R&B', label: 'KIKAC Music', signatureTracks: ['Available', 'Ready', 'Carry Me'], bio: 'KIKAC Music Afropop vocalist known for Available, Ready, and Carry Me.' },
  { name: 'Ross Kana', genre: 'Afropop & R&B', label: '1:55AM', signatureTracks: ['Molela', 'Sesa'], bio: '1:55AM vocalist known for Molela and Sesa.' },
  { name: 'Davis D', genre: 'Afropop & R&B', signatureTracks: ['Dede', 'Biryogo', 'Micro'], bio: 'Afrobeats & dancehall performer known for Dede, Biryogo, and Micro.' },
  { name: 'Okkama', genre: 'Afropop & R&B', signatureTracks: ['Iyallah', 'Puculi'], bio: 'Contemporary Rwandan Afropop singer behind Iyallah and Puculi.' },
  { name: 'Kevin Kade', genre: 'Afropop & R&B', signatureTracks: ['Sofia', 'Jugumila', 'Sikosa'], bio: 'Afropop singer-songwriter known for Sofia, Jugumila, and Sikosa.' },
  { name: 'Social Mula', genre: 'Afropop & R&B', signatureTracks: ['Ma Vie', 'Ku Ndunduro', 'Super Star'], bio: 'Rwandan R&B/Afropop vocalist behind Ma Vie, Ku Ndunduro, and Super Star.' },
  { name: 'Mico The Best', genre: 'Afropop & R&B', signatureTracks: ['Igare', 'Circle', 'Akabizu'], bio: 'Afrobeats artist behind Igare, Circle, and Akabizu.' },
  { name: 'Victor Rukotana', genre: 'Afropop & R&B', signatureTracks: ['Promise', 'Mama Cita', 'Sweet Love'], bio: 'R&B and Afropop vocalist known for Promise, Mama Cita, and Sweet Love.' },
  { name: 'Marina Deborah', genre: 'Afropop & R&B', label: 'The Mane', signatureTracks: ['Marina', 'Madede', 'Karibu'], bio: 'Afropop & R&B singer known for Marina, Madede, and Karibu.' },
  { name: 'Queen Cha', genre: 'Afropop & R&B', signatureTracks: ['Winner', 'Umwe Rukumbi', 'Gentleman'], bio: 'Rwandan Afropop vocalist behind Winner, Umwe Rukumbi, and Gentleman.' },
  { name: 'Charly & Nina', genre: 'Afropop & R&B', signatureTracks: ['Indoro', 'Face to Face', 'Owooma'], bio: 'Hit Rwandan female duo behind Indoro, Face to Face, and Owooma.' },
  { name: 'Alyn Sano', genre: 'Afropop & R&B', signatureTracks: ['For Us', 'Boo and Bae', 'Fake Gee'], bio: 'Soulful multilingual Rwandan vocalist known for For Us, Boo and Bae, and Fake Gee.' },
  { name: 'Uncle Austin', genre: 'Afropop & R&B', signatureTracks: ['Everything', 'Nzakwizirikaho', 'Uteye Ubusambo'], bio: 'Radio personality and Afrobeats singer behind Everything, Nzakwizirikaho, and Uteye Ubusambo.' },
  { name: 'Igor Mabano', genre: 'Afropop & R&B', label: 'Kina Music', signatureTracks: ['Back', 'Iyo Utegereza', 'Urakunzwe'], bio: 'Kina Music drummer, producer & singer behind Back, Iyo Utegereza, and Urakunzwe.' },
  { name: 'Papa Cyangwe', genre: 'Afropop & R&B', signatureTracks: ['Kunda Ugukunda', 'Sana'], bio: 'Afropop & street-pop singer known for Kunda Ugukunda and Sana.' },
  { name: 'Niyo Bosco', genre: 'Afropop & R&B', signatureTracks: ['Ubigenza Ute', 'Piyapuresha'], bio: 'Acclaimed guitarist and singer-songwriter behind Ubigenza Ute and Piyapuresha.' },
  { name: 'Active', genre: 'Afropop & R&B', signatureTracks: ['Lift', 'Aisha'], bio: 'Kigali dance-pop trio (Derek, Tizzo, Olivis) known for Lift and Aisha.' },
  { name: 'Kamichi', genre: 'Afropop & R&B', signatureTracks: ['Zoubeda', 'Aho Ruzingiye'], bio: 'Classic Rwandan Afrobeats vocalist behind Zoubeda and Aho Ruzingiye.' },
  { name: 'Kitoko', genre: 'Afropop & R&B', location: 'Kigali / London', signatureTracks: ['Akabuto', 'Urankunda Bikandenga', 'Thank You'], bio: 'Popular Rwandan Afrobeats star behind Akabuto, Urankunda Bikandenga, and Thank You.' },
  { name: 'Rafiki Coga Style', genre: 'Afropop & R&B', signatureTracks: ['Igikosi', 'Bagambe'], bio: 'Founder of Coga Style Rwandan dance music behind Igikosi and Bagambe.' },
  { name: 'Mani Martin', genre: 'Afropop & R&B', signatureTracks: ['Intero y’Amahoro', 'My Destiny'], bio: 'Afro-soul and Gakondo fusion artist behind Intero y’Amahoro and My Destiny.' },
  { name: 'Eric Senderi', genre: 'Afropop & R&B', signatureTracks: ['Jalousie', 'Nsomyaho'], bio: 'Energetic Afropop showman known for Jalousie and Nsomyaho.' },
  { name: 'Sintex', genre: 'Afropop & R&B', signatureTracks: ['Why', 'Byina'], bio: 'Dancehall & Afropop artist behind Why and Byina.' },
  { name: 'Symphony Band', genre: 'Afropop & R&B', era: 'Nyundo Alumni', signatureTracks: ['Iyo Wanze', 'Respect'], bio: 'Nyundo Music School live band behind Iyo Wanze and Respect.' },
  { name: 'Shaffy', genre: 'Afropop & R&B', location: 'Kigali / USA', signatureTracks: ['Akabanga', 'Worth It'], bio: 'US-based Rwandan R&B singer known for Akabanga and Worth It.' },
  { name: 'Kaya Byinshi', genre: 'Afropop & R&B', signatureTracks: ['Ibyo Byose'], bio: 'Alternative Afro-soul & indie Rwandan vocalist behind Ibyo Byose.' },
  { name: 'Rita Ange Kagaju', genre: 'Afropop & R&B', signatureTracks: ['Sweetener', 'Forever'], bio: 'Rwandan indie-pop & soul vocalist behind Sweetener and Forever.' },
  { name: 'Yampano', genre: 'Afropop & R&B', signatureTracks: ['Mahwi', 'Nyihanganira'], bio: 'Rwandan singer-songwriter known for Mahwi and Nyihanganira.' },
  { name: 'Seyn', genre: 'Afropop & R&B', bio: 'Emerging Kigali Afropop & R&B artist.' },
  { name: 'Ben & Chance', genre: 'Afropop & R&B', signatureTracks: ['Amarira', 'Ndagukunda'], bio: 'Rwandan vocal duo known for Amarira and Ndagukunda.' },
  { name: 'Audia Intore', genre: 'Afropop & R&B', bio: 'Traditional-modern Rwandan singer and songwriter.' },
  { name: 'Danny Vumbi', genre: 'Afropop & R&B', signatureTracks: ['Ni Danger', 'Baragowe', 'Abana Babi'], bio: 'Renowned Rwandan songwriter and Afropop artist behind Ni Danger, Baragowe, and Abana Babi.' },
  { name: 'Yverry', genre: 'Afropop & R&B', signatureTracks: ['Mbona Dukundana', 'Umutima'], bio: 'Melodic Rwandan R&B & soul singer behind Mbona Dukundana and Umutima.' },
  { name: 'Peace Jolis', genre: 'Afropop & R&B', signatureTracks: ['Turi Beza', 'Ndiho'], bio: 'Smooth Rwandan R&B and neo-soul vocalist known for Turi Beza and Ndiho.' },
  { name: 'Miss Jojo', genre: 'Afropop & R&B', era: '2006–2013 Pioneer', signatureTracks: ['Mbwira', 'Ndi Inshuti', 'Tukabyine'], bio: 'Pioneering Rwandan female R&B star behind Mbwira, Ndi Inshuti, and Tukabyine.' },
  { name: 'Miss Shanel', genre: 'Afropop & R&B', location: 'Kigali / Paris', signatureTracks: ['Ndarota', 'Ubufasha'], bio: 'Iconic Rwandan singer-actress celebrated for Ndarota and soulful acoustic pop.' },
  { name: 'Liza Kamikazi', genre: 'Afropop & R&B', signatureTracks: ['Rahira', 'Kirezi'], bio: 'Rwandan Afro-soul & pop vocalist behind Rahira and Kirezi.' },
  { name: 'Gabiro Guitar', genre: 'Afropop & R&B', signatureTracks: ['Karolina', 'Igikwe'], bio: 'Rwandan Afropop vocalist & guitarist behind Karolina and Igikwe.' },
  { name: 'Edouce Softman', genre: 'Afropop & R&B', signatureTracks: ['Oxygen', 'My Love'], bio: 'Kigali R&B and Afrobeats singer known for Oxygen and My Love.' },
  { name: 'Umutare Gaby', genre: 'Afropop & R&B', signatureTracks: ['Mesa Kamwe', 'Ntunkangure'], bio: 'Rwandan R&B ballad singer celebrated for Mesa Kamwe and Ntunkangure.' },
  { name: 'Gisa cy’Inganzo', genre: 'Afropop & R&B', signatureTracks: ['Urukombe', 'Inkombe'], bio: 'Soulful Rwandan R&B vocalist celebrated for Urukombe and raw vocal tone.' },
  { name: 'Passy Kizito', genre: 'Afropop & R&B', signatureTracks: ['Ndabizi', 'Ubuzima'], bio: 'Former TNP singer and solo Rwandan Afropop artist.' },
  { name: 'Emmy', genre: 'Afropop & R&B', location: 'Kigali / USA', signatureTracks: ['Nsanzwe Nzi', 'Wabaye Umuntu'], bio: 'US-based Rwandan R&B vocalist behind Nsanzwe Nzi.' },
  { name: 'Asinah', genre: 'Afropop & R&B', signatureTracks: ['Do It', 'Gimmy'], bio: 'Rwandan dancehall & Afropop performer behind Do It and Gimmy.' },
  { name: 'Allioni', genre: 'Afropop & R&B', signatureTracks: ['Umusumari', 'Ni Uwanjye'], bio: 'Kigali Afropop & dancehall singer known for Umusumari and Ni Uwanjye.' },
  { name: 'Aime Bluestone', genre: 'Afropop & R&B', signatureTracks: ['Sintabizi', 'Mbeshya'], bio: 'Rwandan R&B & soul singer behind Sintabizi and Mbeshya.' },
  { name: 'Jack B', genre: 'Afropop & R&B', signatureTracks: ['Diaspora', 'Umwiza'], bio: 'Rwandan R&B & Afropop singer and choreographer.' },
  { name: 'Ben Kayiranga', genre: 'Afropop & R&B', location: 'Kigali / Paris', signatureTracks: ['Freedom', 'Ibihe'], bio: 'Veteran Rwandan-French Afro-fusion and reggae-pop vocalist behind Freedom.' },
  { name: 'Jean Christophe Matata', genre: 'Afropop & R&B', era: 'Classic Pioneer', signatureTracks: ['Ihorere Munyana', 'Nyamaswa'], bio: 'Beloved Rwandan ballad & Afro-jazz legend behind Ihorere Munyana.' },

  // Hip-Hop & Kinyatrap
  { name: 'Riderman', genre: 'Hip-Hop & Kinyatrap', label: 'Ibisumizi', signatureTracks: ['Rutenderi', 'Holo', 'Cugusa'], bio: 'Founding icon of Rwandan hip-hop (Ibisumizi) behind Rutenderi, Holo, and Cugusa.' },
  { name: 'Ish Kevin', genre: 'Hip-Hop & Kinyatrap', label: 'Trappish Music', signatureTracks: ['Amakosi', 'Clout', 'No Cap'], bio: 'Trappish Music leader and Kinyatrap pioneer behind Amakosi, Clout, and No Cap.' },
  { name: 'Kivumbi King', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Saboter', 'Masala', 'Madame'], bio: 'Melodic Kinyatrap & Afrobeats lyricist behind Saboter, Masala, and Madame.' },
  { name: 'Bushali', genre: 'Hip-Hop & Kinyatrap', label: 'Green Ferry Music', signatureTracks: ['Nituebue', 'Kugasima'], bio: 'Green Ferry Music pioneer of Kinyatrap behind Nituebue and Kugasima.' },
  { name: 'Bull Dogg', genre: 'Hip-Hop & Kinyatrap', label: 'Tuff Gang', signatureTracks: ['Cinema', 'Kaza Roho'], bio: 'Tuff Gang old-school hip-hop lyricist behind Cinema and Kaza Roho.' },
  { name: 'Jay Polly', genre: 'Hip-Hop & Kinyatrap', label: 'Tuff Gang', signatureTracks: ['Deux Fois Deux', 'Ndacyariho', 'Ku Musenyi'], bio: 'Beloved Tuff Gang legend behind Deux Fois Deux, Ndacyariho, and Ku Musenyi.' },
  { name: 'Fireman', genre: 'Hip-Hop & Kinyatrap', label: 'Tuff Gang', signatureTracks: ['Ca Inkoni Izamba', 'Muzadukumbura'], bio: 'Tuff Gang rapper known for Ca Inkoni Izamba and Muzadukumbura.' },
  { name: 'Green P', genre: 'Hip-Hop & Kinyatrap', label: 'Tuff Gang', signatureTracks: ['Kandagira Abanzi'], bio: 'Tuff Gang emcee known for Kandagira Abanzi.' },
  { name: 'P Fla', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Akabanga k’Umukobwa'], bio: 'Hardcore Kinyarwanda hip-hop storyteller behind Akabanga k’Umukobwa.' },
  { name: 'Diplomat', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Umucakara w’Ibihe', 'Ideologie'], bio: 'Conscious Rwandan hip-hop lyricist behind Umucakara w’Ibihe and Ideologie.' },
  { name: 'Danny Nanone', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Narya', 'Ikirori'], bio: 'Rwandan hip-hop and Afrobeats rapper behind Narya and Ikirori.' },
  { name: 'Ama G The Black', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Uruhinja', 'Careless'], bio: 'Street-conscious Rwandan hip-hop artist behind Uruhinja and Careless.' },
  { name: 'Oda Paccy', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Miss President', 'Rendezvous'], bio: 'Trailblazing Rwandan female hip-hop pioneer behind Miss President and Rendezvous.' },
  { name: 'Young Grace', genre: 'Hip-Hop & Kinyatrap', location: 'Rubavu / Kigali', signatureTracks: ['Bingo', 'Ataha He'], bio: 'Rwandan female rapper known for Bingo and Ataha He.' },
  { name: 'Ciney', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Nkunda', 'Tuma Bavuga'], bio: 'Female Rwandan hip-hop & Afropop artist behind Nkunda and Tuma Bavuga.' },
  { name: 'Logan Joe', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Whatever', 'Nyaranja'], bio: 'Melodic Kigali drill & trap artist behind Whatever and Nyaranja.' },
  { name: 'Kenny K-Shot', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Intashyo', 'Trap Star'], bio: 'Kigali drill & rap lyricist behind Intashyo and Trap Star.' },
  { name: 'Zeo Trap', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Sinabikora'], bio: 'Emerging Kigali Kinyatrap & drill artist behind Sinabikora.' },
  { name: 'B-Threy', genre: 'Hip-Hop & Kinyatrap', label: 'Green Ferry Music', signatureTracks: ['Nicyo Gituma', '2040'], bio: 'Kinyatrap co-creator behind Nicyo Gituma and 2040.' },
  { name: 'Slum Drip', genre: 'Hip-Hop & Kinyatrap', label: 'Green Ferry Music', bio: 'Kinyatrap rapper and Green Ferry collaborator.' },
  { name: 'Mukadaff', genre: 'Hip-Hop & Kinyatrap', bio: 'Street hip-hop & trap artist from Kigali.' },
  { name: 'Ririmba', genre: 'Hip-Hop & Kinyatrap', label: 'Trappish Music', signatureTracks: ['Amina', 'Twari Broke'], bio: 'Trappish Music artist featured on Amina and Twari Broke.' },
  { name: 'Og2tone', genre: 'Hip-Hop & Kinyatrap', bio: 'Rwandan trap & drill vocalist.' },
  { name: 'Neg G The General', genre: 'Hip-Hop & Kinyatrap', label: 'UTP Soldiers', bio: 'Early Kigali hip-hop pioneer and UTP Soldiers founder.' },
  { name: 'Tuff Gang', genre: 'Hip-Hop & Kinyatrap', era: 'Classic Kigali Rap', bio: 'Legendary Kigali hip-hop crew uniting Jay Polly, Bull Dogg, Fireman, and Green P.' },
  { name: 'K8 Kavuyo', genre: 'Hip-Hop & Kinyatrap', location: 'Kigali / Texas', label: 'PressOne', signatureTracks: ['Alhamdoulillah', 'Nta Kibazo'], bio: 'Early Kigali hip-hop trailblazer and PressOne co-founder.' },
  { name: 'Lil G', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Nimba Umugabo', 'Cyore'], bio: 'Veteran Kigali rapper and Round Music founder behind Nimba Umugabo.' },
  { name: 'Khalfan Govinda', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Power', 'Nta Kuntu'], bio: 'Lyrical Rwandan hip-hop emcee known for Power and Guma Guma performances.' },
  { name: 'Sandra Miraji', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Byakaze', 'Andi Mahirwe'], bio: 'Trailblazing Rwandan female hip-hop MC behind Byakaze.' },
  { name: 'Racine', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Yanga', 'Umukino'], bio: 'Precision Kigali lyricist known for storytelling and punchlines.' },
  { name: 'The Pink', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Ikirori', 'Hold On'], bio: 'Rwandan female gospel and conscious hip-hop emcee.' },
  { name: 'Pacson', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Samehood', 'Anti-Virus'], bio: 'Kigali hip-hop presenter and posse-cut organizer.' },
  { name: 'M-Izzo', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Inama', 'Nta Cyiza'], bio: 'Riderman protégé and Ibisumizi rap artist.' },
  { name: 'MC Mahoniboni', genre: 'Hip-Hop & Kinyatrap', era: '2000s Pioneer', signatureTracks: ['Malayika', 'Kubita'], bio: 'One of Rwanda’s earliest recording hip-hop pioneers.' },
  { name: 'Sean Brizz', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Ntukajyeyo', 'Ghetto'], bio: 'Kigali street-rap and Kinyatrap lyricist.' },
  { name: 'G-Bruce', genre: 'Hip-Hop & Kinyatrap', signatureTracks: ['Kigali', 'Igikona'], bio: 'Rwandan hip-hop and Afro-rap vocalist.' },
  { name: 'Babo', genre: 'Hip-Hop & Kinyatrap', location: 'Kigali / Germany', signatureTracks: ['I Want You Back', 'Ich Liebe Dich'], bio: 'Rwandan-German female rapper and Afrobeats singer.' },

  // Gakondo & Classics
  { name: 'Cécile Kayirebwa', genre: 'Gakondo & Classics', location: 'Kigali / Brussels', signatureTracks: ['Umunezero', 'Tarihinda', 'Ikizungerezi', 'None Twaza'], bio: 'Queen of Rwandan Gakondo music behind Umunezero, Tarihinda, Ikizungerezi, and None Twaza.' },
  { name: 'Kamaliza', genre: 'Gakondo & Classics', era: 'Heritage Icon', signatureTracks: ['Humura Rwanda', 'Naraye Ndose'], bio: 'Revered Rwandan cultural heroine and singer behind Humura Rwanda and Naraye Ndose.' },
  { name: 'Rugamba Cyprien', genre: 'Gakondo & Classics', label: 'Amasimbi n’Amakombe', signatureTracks: ['Nta Kibazo', 'Umuco'], bio: 'Legendary Rwandan poet, composer, and Amasimbi n’Amakombe founder.' },
  { name: 'Masamba Intore', genre: 'Gakondo & Classics', signatureTracks: ['Nyeganyega', 'Inka y’Imana'], bio: 'Master of traditional Rwandan Gakondo & Inanga rhythms.' },
  { name: 'Jules Sentore', genre: 'Gakondo & Classics', signatureTracks: ['Udatsikira', 'Diarabi'], bio: 'Contemporary Gakondo vocalist blending Intore rhythms with modern acoustic strings.' },
  { name: 'Clarisse Karasira', genre: 'Gakondo & Classics', signatureTracks: ['Ntizagushuke', 'Twapfaga Iki'], bio: 'Rwandan folk and Gakondo songwriter behind Ntizagushuke and Twapfaga Iki.' },
  { name: 'Ruti Joel', genre: 'Gakondo & Classics', signatureTracks: ['Igikobwa', 'Cunda'], bio: 'Modern Gakondo & Afro-traditional singer behind Igikobwa and Cunda.' },
  { name: 'Jean-Paul Samputu', genre: 'Gakondo & Classics', era: 'Kora Award Laureate', signatureTracks: ['Psalms 150', 'Twaribohoye'], bio: 'Kora Award-winning Rwandan singer and cultural ambassador.' },
  { name: 'Orchestre Impala', genre: 'Gakondo & Classics', era: '1970s–1980s Karahanyuze', signatureTracks: ['Anita', 'Bonane', 'Mbega Urukundo'], bio: 'Historic Rwandan rumba & Karahanyuze band behind Anita, Bonane, and Mbega Urukundo.' },
  { name: 'Orchestre Nyampinga', genre: 'Gakondo & Classics', era: '1970s–1980s Karahanyuze', signatureTracks: ['Nyampinga', 'Genda Rwanda'], bio: 'Classic Karahanyuze guitar band from Rwanda’s golden era.' },
  { name: 'Sebatta', genre: 'Gakondo & Classics', era: 'Karahanyuze', signatureTracks: ['Nyirabukwe', 'Nkunda Kigali'], bio: 'Master of Karahanyuze storytelling ballads and acoustic guitar.' },
  { name: 'Jean-Baptiste Byumvuhore', genre: 'Gakondo & Classics', signatureTracks: ['Fagitare', 'Umbabarire Mawe'], bio: 'Beloved acoustic storyteller behind Fagitare and Umbabarire Mawe.' },
  { name: 'Muyango', genre: 'Gakondo & Classics', signatureTracks: ['Sabizeze', 'Karame Nanone'], bio: 'Gakondo elder behind Sabizeze and Karame Nanone.' },
  { name: 'Teta Diana', genre: 'Gakondo & Classics', signatureTracks: ['Canga Ikarita', 'Kata'], bio: 'Rwandan acoustic & Gakondo singer-songwriter behind Canga Ikarita and Kata.' },
  { name: 'Cyusa Ibrahim', genre: 'Gakondo & Classics', signatureTracks: ['Muhoza Wanjye', 'Marebe'], bio: 'Traditional Gakondo performer known for Muhoza Wanjye and Marebe.' },
  { name: 'The Good Ones', genre: 'Gakondo & Classics', location: 'Musanze / Kigali', signatureTracks: ['Rwanda, You Should Be Loved'], bio: 'Internationally acclaimed Rwandan acoustic trio recorded across Kigali and rural Rwanda.' },
  { name: 'Mighty Popo', genre: 'Gakondo & Classics', location: 'Kigali / Ottawa', signatureTracks: ['Muhazi', 'Gakondo'], bio: 'Juno Award-winning Rwandan-Canadian roots musician and Nyundo Music School director.' },
  { name: 'Faustin Murigo', genre: 'Gakondo & Classics', era: 'Karahanyuze', bio: 'Legendary Rwandan Karahanyuze vocalist and guitarist.' },
  { name: 'Jean-Bosco Hashakimana', genre: 'Gakondo & Classics', era: 'Karahanyuze', bio: 'Classic Rwandan acoustic guitarist and singer.' },
  { name: 'Sophie Nzayisenga', genre: 'Gakondo & Classics', signatureTracks: ['Inanga Yanjye', 'Ingoma'], bio: 'Pioneering female Inanga harp virtuoso and Rwandan traditional storyteller.' },
  { name: 'Daniel Ngarukiye', genre: 'Gakondo & Classics', signatureTracks: ['Gakondo', 'Urujeni'], bio: 'Virtuoso Inanga zither player and traditional Rwandan vocalist.' },
  { name: 'Deo Munyakazi', genre: 'Gakondo & Classics', signatureTracks: ['Urakwiriye', 'Inanga Fusion'], bio: 'Contemporary Inanga harpist fusing Rwandan zither with global acoustic jazz.' },
  { name: 'Abdul Makanyaga', genre: 'Gakondo & Classics', era: '1970s–Present', signatureTracks: ['Rubanda', 'Nshatse Inshuti'], bio: 'Living legend of Rwandan Karahanyuze rumba behind Rubanda and Nshatse Inshuti.' },
  { name: 'Mariya Yohana', genre: 'Gakondo & Classics', signatureTracks: ['Intsinzi'], bio: 'Iconic Rwandan heritage vocalist celebrated for Intsinzi.' },
  { name: 'Dieudonné Munyanshoza', genre: 'Gakondo & Classics', signatureTracks: ['Mibirizi'], bio: 'Renowned Rwandan commemorative and heritage songwriter behind Mibirizi.' },
  { name: 'Amasimbi n’Amakombe', genre: 'Gakondo & Classics', era: '1978–Present', bio: 'Storied Rwandan traditional music and poetry ensemble founded by Cyprien Rugamba.' },
  { name: 'Inyamibwa Cultural Troupe', genre: 'Gakondo & Classics', bio: 'Premier Rwandan traditional dance, drumming, and Gakondo vocal troupe.' },
  { name: 'Urukerereza National Ballet', genre: 'Gakondo & Classics', bio: 'Rwanda’s National Ballet preserving Intore dances, drums, and royal chants.' },
  { name: 'Orchestre Les Fellows', genre: 'Gakondo & Classics', era: '1980s Karahanyuze', bio: 'Classic Rwandan guitar & brass Karahanyuze ensemble.' },
  { name: 'Orchestre Abamararungu', genre: 'Gakondo & Classics', era: 'Karahanyuze', bio: 'Classic Rwandan folk-rumba orchestra celebrated across East Africa.' },
  { name: 'Suzanne Nyiranyamibwa', genre: 'Gakondo & Classics', signatureTracks: ['Esse Mbaze Nde'], bio: 'Respected Rwandan cultural vocalist and storyteller.' },
  { name: 'Florida Uwera', genre: 'Gakondo & Classics', era: 'Karahanyuze', signatureTracks: ['Inka Yanjye'], bio: 'Classic Rwandan female acoustic vocalist.' },
  { name: 'Sébastien Ntahobari', genre: 'Gakondo & Classics', era: '1970s–1980s', bio: 'Golden-era Rwandan radio guitarist and folk composer.' },

  // Gospel & Choirs
  { name: 'Israel Mbonyi', genre: 'Gospel & Choirs', signatureTracks: ['Nina Siri', 'Karame', 'Ndashima', 'Hari Ubuzima'], bio: 'East Africa’s leading gospel worship minister behind Nina Siri, Karame, Ndashima, and Hari Ubuzima.' },
  { name: 'Ambassadors of Christ Choir', genre: 'Gospel & Choirs', signatureTracks: ['Kwetu Pazuri', 'Mtegemee Yesu'], bio: 'Iconic Kigali gospel choir known across Africa for Kwetu Pazuri and Mtegemee Yesu.' },
  { name: 'Chorale de Kigali', genre: 'Gospel & Choirs', era: 'Founded 1966', signatureTracks: ['Njyewe Nzi Ko', 'Gloria'], bio: 'Historic Rwandan polyphonic Catholic & classical choir founded in 1966.' },
  { name: 'James & Daniella', genre: 'Gospel & Choirs', signatureTracks: ['Mpa Amavuta', 'Nkoresha'], bio: 'Rwandan gospel worship duo behind Mpa Amavuta and Nkoresha.' },
  { name: 'Patient Bizimana', genre: 'Gospel & Choirs', signatureTracks: ['Ubwo Buntu', 'Menye Neza', 'Ikimenyetso'], bio: 'Worship leader behind Ubwo Buntu, Menye Neza, and Ikimenyetso.' },
  { name: 'Aime Uwimana', genre: 'Gospel & Choirs', signatureTracks: ['Muririmbire Uwiteka', 'Thank You'], bio: 'Veteran Rwandan gospel composer behind Muririmbire Uwiteka and Thank You.' },
  { name: 'Dominic Ashimwe', genre: 'Gospel & Choirs', signatureTracks: ['Ashimwe', 'Wambereye Imfura'], bio: 'Rwandan gospel minister behind Ashimwe and Wambereye Imfura.' },
  { name: 'Theo Bosebabireba', genre: 'Gospel & Choirs', signatureTracks: ['Ibigeragezo si Iherezo', 'Kubita Utababarira'], bio: 'Iconic Rwandan gospel singer behind Ibigeragezo si Iherezo and Kubita Utababarira.' },
  { name: 'Adrien Misigaro', genre: 'Gospel & Choirs', location: 'Kigali / USA', signatureTracks: ['Ntacyo Nzaba', 'Nkwite Nde'], bio: 'Gospel singer-songwriter known for Ntacyo Nzaba and Nkwite Nde.' },
  { name: 'Gentil Misigaro', genre: 'Gospel & Choirs', location: 'Kigali / Canada', signatureTracks: ['Biratungana', 'Buri Munsi'], bio: 'Gospel worship producer & vocalist behind Biratungana and Buri Munsi.' },
  { name: 'Aline Gahongayire', genre: 'Gospel & Choirs', signatureTracks: ['Ndanyuzwe', 'Hari Impamvu'], bio: 'Veteran Rwandan gospel artist behind Ndanyuzwe and Hari Impamvu.' },
  { name: 'Gaby Kamanzi', genre: 'Gospel & Choirs', signatureTracks: ['Amahoro', 'Arankunda'], bio: 'Gospel singer celebrated for Amahoro and Arankunda.' },
  { name: 'Tonzi', genre: 'Gospel & Choirs', signatureTracks: ['Humura', 'Sijja'], bio: 'Rwandan gospel vocalist known for Humura and Sijja.' },
  { name: 'Serge Iyamuremye', genre: 'Gospel & Choirs', signatureTracks: ['Arampagije', 'Nta Mvura'], bio: 'Contemporary gospel worship artist behind Arampagije and Nta Mvura.' },
  { name: 'Papi Clever & Dorcas', genre: 'Gospel & Choirs', signatureTracks: ['Ndagushima', 'Amakuru y’Ijuru'], bio: 'Rwandan gospel hymn duo known for Ndagushima and Amakuru y’Ijuru.' },
  { name: 'Vestine & Dorcas', genre: 'Gospel & Choirs', signatureTracks: ['Nahawe Ijambo', 'Adonai', 'Papa'], bio: 'Rwandan sister gospel duo behind Nahawe Ijambo, Adonai, and Papa.' },
  { name: 'Chryso Ndasingwa', genre: 'Gospel & Choirs', signatureTracks: ['Wahozeho', 'Byose'], bio: 'Contemporary gospel worship leader behind Wahozeho and Byose.' },
  { name: 'Josh Ishimwe', genre: 'Gospel & Choirs', signatureTracks: ['Reka Ndate Imana'], bio: 'Gakondo-infused gospel worship singer behind Reka Ndate Imana.' },
  { name: 'Alarm Ministries', genre: 'Gospel & Choirs', signatureTracks: ['Hariho Impamvu', 'Songa Mbele'], bio: 'Acclaimed Kigali worship choir behind Hariho Impamvu and Songa Mbele.' },
  { name: 'Healing Worship Team', genre: 'Gospel & Choirs', signatureTracks: ['Nguwe Neza', 'Mana Imbaraga'], bio: 'Rwandan praise & worship team behind Nguwe Neza and Mana Imbaraga.' },
  { name: 'Bosco Nshuti', genre: 'Gospel & Choirs', signatureTracks: ['Ibyo Ntunze', 'Utuma Ntera Intambwe'], bio: 'Rwandan worship minister behind Ibyo Ntunze and Utuma Ntera Intambwe.' },
  { name: 'Alex Dusabe', genre: 'Gospel & Choirs', signatureTracks: ['Umuyoboro'], bio: 'Rwandan gospel worship pioneer behind Umuyoboro.' },
  { name: 'Simon Kabera', genre: 'Gospel & Choirs', signatureTracks: ['Mfashe Inanga'], bio: 'Beloved Rwandan gospel singer behind Mfashe Inanga.' },
  { name: 'True Promises Ministries', genre: 'Gospel & Choirs', signatureTracks: ['Mana Urera', 'Ndagukunda'], bio: 'Kigali praise & worship collective known for Mana Urera and live worship recordings.' },
  { name: 'Gisubizo Ministries', genre: 'Gospel & Choirs', signatureTracks: ['Amfitiye Byinshi', 'Ebenezer'], bio: 'Renowned Rwandan worship ministry celebrated for Amfitiye Byinshi and Ebenezer.' },
  { name: 'Beauty for Ashes', genre: 'Gospel & Choirs', signatureTracks: ['Yesu Niwe', 'Siriprize'], bio: 'Kigali rock-gospel worship band led by Olivier Kavutse.' },
  { name: 'Chorale Hoziyana', genre: 'Gospel & Choirs', era: 'Founded 1978', signatureTracks: ['Ndakwihaye', 'Imana ni Nziza'], bio: 'One of Rwanda’s oldest and most influential Protestant choirs from Nyarugenge.' },
  { name: 'Chorale Christus Regnat', genre: 'Gospel & Choirs', signatureTracks: ['Ave Maria', 'Shimwa Nyagasani'], bio: 'Celebrated Kigali liturgical and choral ensemble at Regina Pacis.' },
  { name: 'Chorale Il Est Vivant', genre: 'Gospel & Choirs', signatureTracks: ['Il Est Vivant', 'Alleluia'], bio: 'Beloved Kigali Catholic polyphonic choir.' },
  { name: 'Jehovah Jireh Choir', genre: 'Gospel & Choirs', signatureTracks: ['Gumamo', 'Turi Abagenzi'], bio: 'Historic Kigali university choir behind Gumamo and Turi Abagenzi.' },
  { name: 'Richard Ngendahayo', genre: 'Gospel & Choirs', location: 'Kigali / USA', signatureTracks: ['Ibuka', 'Niwe'], bio: 'Classic Rwandan gospel worship artist celebrated for Ibuka and Niwe.' },
  { name: 'Liliane Kabaganza', genre: 'Gospel & Choirs', signatureTracks: ['Ndakomeye', 'Umusaraba'], bio: 'Veteran Rwandan gospel vocalist known for Ndakomeye.' },
  { name: 'Thacien Titus', genre: 'Gospel & Choirs', signatureTracks: ['Aho Ugejeje Ukora', 'Uzabimpe'], bio: 'Beloved Rwandan gospel singer behind Aho Ugejeje Ukora.' },
  { name: 'Luc Buntu', genre: 'Gospel & Choirs', signatureTracks: ['Amahoro', 'Umuhanzi'], bio: 'Rwandan gospel singer-songwriter and acoustic worship leader.' },
  { name: 'Arsene Tuyi', genre: 'Gospel & Choirs', signatureTracks: ['Umujyi w’Amashimwe', 'Impamba'], bio: 'Contemporary Kigali gospel worship minister.' },
  { name: 'Nelson Mucyo', genre: 'Gospel & Choirs', signatureTracks: ['Ndaje', 'Isezerano'], bio: 'Rwandan gospel worship songwriter and vocalist.' },

  // DJs & Producers
  { name: 'DJ Pius', genre: 'DJs & Producers', label: '1Key Entertainment', signatureTracks: ['Agatako', 'Play It Again', 'Homba Homboka'], bio: '1Key Entertainment DJ & Afropop artist behind Agatako, Play It Again, and Homba Homboka.' },
  { name: 'DJ Marnaud', genre: 'DJs & Producers', signatureTracks: ['Bape', 'Ribuyu', 'Baho'], bio: 'Kigali club DJ & producer behind Bape, Ribuyu, and Baho.' },
  { name: 'DJ Toxxyk', genre: 'DJs & Producers', signatureTracks: ['Afro-House Sessions', 'Kigali Nights'], bio: 'Kigali electronic, Afro-house & open-format DJ and producer.' },
  { name: 'DJ Phil Peter', genre: 'DJs & Producers', signatureTracks: ['Bimpame', 'Agafoto', 'Terimber'], bio: 'Radio presenter, DJ & collaborator on Bimpame, Agafoto, and Terimber.' },
  { name: 'DJ Miller', genre: 'DJs & Producers', signatureTracks: ['Stamina', 'Belle'], bio: 'Beloved Kigali DJ & producer celebrated for Stamina and Belle.' },
  { name: 'DJ Brianne', genre: 'DJs & Producers', bio: 'Trailblazing Kigali club & festival DJ.' },
  { name: 'Dany Beats', genre: 'DJs & Producers', bio: 'Rwandan beatmaker and executive producer behind Kigali Trap & Afropop hits.' },
  { name: 'Madebeats', genre: 'DJs & Producers', location: 'Kigali / UK', signatureTracks: ['Katerina (Prod.)', 'Slowly (Prod.)'], bio: 'Multi-award-winning Rwandan music producer.' },
  { name: 'Bob Pro', genre: 'DJs & Producers', bio: 'Master mixing & mastering engineer in Kigali.' },
  { name: 'Prince Kiiiz', genre: 'DJs & Producers', label: 'Country Records', bio: 'Hit Rwandan Afropop & Afrobeats record producer.' },
  { name: 'Pastor P', genre: 'DJs & Producers', bio: 'Iconic Kigali music producer shaping modern Rwandan pop and Gakondo fusion.' },
  { name: 'DJ Ira', genre: 'DJs & Producers', bio: 'Top Kigali female club, radio, and festival DJ.' },
  { name: 'DJ Bissosso', genre: 'DJs & Producers', bio: 'Veteran Kigali club DJ and African hits selector.' },
  { name: 'DJ Diallo', genre: 'DJs & Producers', bio: 'Kigali hip-hop, Afrobeats, and club resident DJ.' },
  { name: 'DJ Lenzo', genre: 'DJs & Producers', bio: 'Kigali club & concert DJ and promoter.' },
  { name: 'DJ Karim', genre: 'DJs & Producers', bio: 'Rwandan open-format club and radio mix DJ.' },
  { name: 'DJ Sonia', genre: 'DJs & Producers', bio: 'Emerging Kigali female DJ known for Afrobeats and Amapiano sets.' },
  { name: 'DJ Pyfo', genre: 'DJs & Producers', bio: 'Kigali live event and radio mix DJ.' },
  { name: 'DJ Lou', genre: 'DJs & Producers', bio: 'Kigali club DJ and Afro-fusion selector.' },
  { name: 'DJ Anitha Pendo', genre: 'DJs & Producers', bio: 'Pioneering Rwandan female DJ, MC, and media personality.' },
  { name: 'Junior Multisystem', genre: 'DJs & Producers', era: '2010s Hitmaker', bio: 'Prolific Kigali Afrobeats and R&B producer behind countless classics.' },
  { name: 'Fazzo Pro', genre: 'DJs & Producers', bio: 'Renowned Kigali beatmaker and recording studio producer.' },
  { name: 'Trackslayer', genre: 'DJs & Producers', bio: 'Acclaimed Rwandan hip-hop & Afropop producer behind major Kigali anthems.' },
  { name: 'Evydecks', genre: 'DJs & Producers', bio: 'Kigali Afrobeats, drill, and contemporary R&B producer.' },
  { name: 'Knox Beat', genre: 'DJs & Producers', label: 'Monster Records', bio: 'Hit Rwandan beatmaker and producer at Monster Records.' },
  { name: 'Laser Beat', genre: 'DJs & Producers', bio: 'Rwandan Afropop and trap sound architect.' },
  { name: 'Hollybeat', genre: 'DJs & Producers', bio: 'Kigali Afropop & R&B music producer.' },
  { name: 'Piano The Grooveman', genre: 'DJs & Producers', bio: 'Veteran Rwandan music producer and arranger.' },
  { name: 'Davydenko', genre: 'DJs & Producers', bio: 'Kigali gospel and Afropop studio producer and sound engineer.' },
  { name: 'Bagenzi Bernard', genre: 'DJs & Producers', label: 'Incredible Records', bio: 'Executive music & video producer and founder of Incredible Records.' },
];

const GENRE_COVER_MAP: Record<string, string> = {
  'Afropop & R&B': ARTWORK_ELECTRONIC,
  'Hip-Hop & Kinyatrap': ARTWORK_JAZZ,
  'Gakondo & Classics': ARTWORK_ACOUSTIC,
  'Gospel & Choirs': ARTWORK_AMBIENT,
  'DJs & Producers': ARTWORK_ELECTRONIC,
};

function normalizeRwandaGenre(rawTag?: string): RwandaGenreCategory {
  const tag = (rawTag || '').toLowerCase();
  if (/hip.?hop|rap|trap|drill|kinyatrap|mc/.test(tag)) return 'Hip-Hop & Kinyatrap';
  if (/gospel|christian|choir|choral|worship|religious|hymn/.test(tag)) return 'Gospel & Choirs';
  if (/folk|traditional|gakondo|inanga|acoustic|classical|rumba|roots|world/.test(tag)) {
    return 'Gakondo & Classics';
  }
  if (/dj|electronic|house|techno|producer|beat|electro/.test(tag)) return 'DJs & Producers';
  return 'Afropop & R&B';
}

function makeRwandaArtistId(name: string): string {
  return `rw-artist-${name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

let cachedMbRwandaArtists: { timestamp: number; artists: ArtistSummary[] } | null = null;
let mbRwandaInFlight: Promise<ArtistSummary[]> | null = null;
async function fetchMusicBrainzRwandaArtists(): Promise<ArtistSummary[]> {
  if (cachedMbRwandaArtists && Date.now() - cachedMbRwandaArtists.timestamp < 1000 * 60 * 30) {
    return cachedMbRwandaArtists.artists;
  }
  if (mbRwandaInFlight) return mbRwandaInFlight;

  mbRwandaInFlight = (async () => {
    try {
      const mbHeaders = {
        'User-Agent': 'SoundmarkAudioPlatform/1.0 (https://soundmark.app)',
      };
      const [p1, p2] = await Promise.all([
        fetchJsonWithTimeout<{
          artists?: Array<{ id: string; name: string; disambiguation?: string; tags?: Array<{ name: string }> }>;
        }>('https://musicbrainz.org/ws/2/artist?query=area:Rwanda&limit=100&offset=0&fmt=json', 4500, mbHeaders),
        fetchJsonWithTimeout<{
          artists?: Array<{ id: string; name: string; disambiguation?: string; tags?: Array<{ name: string }> }>;
        }>('https://musicbrainz.org/ws/2/artist?query=area:Rwanda&limit=100&offset=100&fmt=json', 4500, mbHeaders),
      ]);
      const combined = [...(p1?.artists || []), ...(p2?.artists || [])];
      if (combined.length === 0) return cachedMbRwandaArtists?.artists || [];

      const list: ArtistSummary[] = combined
        .filter((a) => a.name && a.name.trim().length > 1)
        .map((a) => {
          const normalizedGenre = normalizeRwandaGenre(
            [a.tags?.[0]?.name, a.disambiguation].filter(Boolean).join(' '),
          );
          return {
            id: makeRwandaArtistId(a.name),
            name: a.name.trim(),
            location: 'Rwanda',
            avatarUrl: GENRE_COVER_MAP[normalizedGenre] || ARTWORK_ACOUSTIC,
            verified: true,
            genre: normalizedGenre,
            bio: a.disambiguation || 'Documented Rwandan recording artist.',
            sourceLabel: 'MusicBrainz Rwanda',
            topTracks: [],
          };
        });
      cachedMbRwandaArtists = { timestamp: Date.now(), artists: list };
      return list;
    } finally {
      mbRwandaInFlight = null;
    }
  })();

  return mbRwandaInFlight;
}

async function getRwandaArtistsCatalog(): Promise<ArtistSummary[]> {
  const map = new Map<string, ArtistSummary>();
  for (const seed of RWANDA_ARTISTS_SEED) {
    const id = makeRwandaArtistId(seed.name);
    map.set(seed.name.toLowerCase(), {
      id,
      name: seed.name,
      location: seed.location || 'Kigali, Rwanda',
      avatarUrl: GENRE_COVER_MAP[seed.genre] || ARTWORK_ELECTRONIC,
      verified: true,
      genre: seed.genre,
      era: seed.era,
      label: seed.label,
      signatureTracks: seed.signatureTracks,
      bio: seed.bio,
      sourceLabel: 'Rwanda Music Index',
      topTracks: [],
    });
  }

  // Merge extra documented Rwandan artists from MusicBrainz live registry
  const mbArtists = await fetchMusicBrainzRwandaArtists().catch(() => []);
  for (const mba of mbArtists) {
    const key = mba.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, mba);
    }
  }
  return Array.from(map.values());
}

function parseDurationText(text?: string): number {
  if (!text) return 0;
  const parts = text
    .trim()
    .split(':')
    .map((n) => Number(n));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

interface YouTubeExtractedVideo {
  id: string;
  title: string;
  durationSec: number;
  channel: string;
  channelId?: string;
  thumbnail: string;
}

const ytSearchCache = new Map<string, { ts: number; data: YouTubeExtractedVideo[] }>();

async function fetchYouTubeSearchRaw(query: string): Promise<YouTubeExtractedVideo[]> {
  const cacheKey = query.trim().toLowerCase();
  const hit = ytSearchCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < 10 * 60 * 1000 && hit.data.length > 0) {
    return hit.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7500);
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const match =
      html.match(/var ytInitialData = (\{.+?\});<\/script>/) ||
      html.match(/window\["ytInitialData"\] = (\{.+?\});/);
    if (!match) return [];
    const data = JSON.parse(match[1]) as {
      contents?: {
        twoColumnSearchResultsRenderer?: {
          primaryContents?: {
            sectionListRenderer?: {
              contents?: Array<{
                itemSectionRenderer?: {
                  contents?: Array<{
                    videoRenderer?: Record<string, unknown>;
                    shelfRenderer?: {
                      content?: {
                        verticalListRenderer?: {
                          items?: Array<{ videoRenderer?: Record<string, unknown> }>;
                        };
                      };
                    };
                  }>;
                };
              }>;
            };
          };
        };
      };
    };

    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    const renderers: Array<Record<string, unknown>> = [];
    for (const sec of sections) {
      const items = sec.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.videoRenderer) renderers.push(item.videoRenderer);
        if (item.shelfRenderer?.content?.verticalListRenderer?.items) {
          for (const sub of item.shelfRenderer.content.verticalListRenderer.items) {
            if (sub.videoRenderer) renderers.push(sub.videoRenderer);
          }
        }
      }
    }

    const videos: YouTubeExtractedVideo[] = [];
    for (const v of renderers) {
      const videoId = typeof v.videoId === 'string' ? v.videoId : '';
      if (!videoId) continue;
      const titleRuns = (v.title as { runs?: Array<{ text?: string }> } | undefined)?.runs || [];
      const title = titleRuns.map((r) => r.text || '').join('').trim();
      if (!title) continue;

      const lenText = (v.lengthText as { simpleText?: string } | undefined)?.simpleText;
      const durationSec = parseDurationText(lenText);
      const ownerRun = (
        v.ownerText as {
          runs?: Array<{
            text?: string;
            navigationEndpoint?: { browseEndpoint?: { browseId?: string } };
          }>;
        } | undefined
      )?.runs?.[0];
      const channel = ownerRun?.text || 'YouTube Music';
      const channelId = ownerRun?.navigationEndpoint?.browseEndpoint?.browseId;
      const thumbs = (v.thumbnail as { thumbnails?: Array<{ url?: string }> } | undefined)
        ?.thumbnails;
      const thumbnail =
        thumbs?.[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      videos.push({ id: videoId, title, durationSec, channel, channelId, thumbnail });
    }
    if (videos.length > 0) {
      ytSearchCache.set(cacheKey, { ts: Date.now(), data: videos });
    }
    return videos;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchYouTubeChannelRssTracks(
  channelId: string,
  artistName: string,
  country = 'Rwanda',
): Promise<MusicTrack[]> {
  if (!channelId) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { signal: controller.signal },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
    const tracks: MusicTrack[] = [];
    for (const entry of entries) {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([^<]+)<\/title>/)?.[1];
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      if (!videoId || !title) continue;
      if (/#shorts|teaser|trailer|behind the scenes|interview|reaction/i.test(title)) continue;
      tracks.push({
        id: `yt-${videoId}`,
        title: title
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'"),
        artist: artistName,
        artistId: country === 'Rwanda' ? makeRwandaArtistId(artistName) : undefined,
        artistLocation: country === 'Rwanda' ? 'Kigali, Rwanda' : country,
        artistVerified: true,
        album: 'Official Release',
        genre: 'Afropop',
        country,
        durationSec: 215,
        audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
        youtubeVideoId: videoId,
        coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        year: published ? published.slice(0, 4) : '2025',
        license: 'Full Song',
        sourceLabel: 'YouTube Music',
        isPreview: false,
        bitrateLabel: 'Full Stream',
        storeLinks: buildStoreLinks(artistName, title),
      });
    }
    return tracks;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchYouTubeFullTracks(
  query: string,
  artistHint?: string,
  country = 'Global',
  limit = 24,
): Promise<{ tracks: MusicTrack[]; topChannelId?: string }> {
  const raw = await fetchYouTubeSearchRaw(query);
  const artistLow = artistHint?.toLowerCase().trim() || '';
  const channelCounts = new Map<string, number>();

  const tracks: MusicTrack[] = [];
  for (const v of raw) {
    // Must be a full individual song: >= 45s and <= 22 min (excludes Shorts & multi-hour DJ mixes)
    if (v.durationSec < 45 || v.durationSec > 1320) continue;
    if (/#shorts|interview|podcast|reaction|prank|top \d+ songs mix|nonstop mix|2 hours|1 hour/i.test(v.title)) {
      continue;
    }

    if (v.channelId && artistLow && v.channel.toLowerCase().includes(artistLow.split(' ')[0])) {
      channelCounts.set(v.channelId, (channelCounts.get(v.channelId) || 0) + 1);
    }

    const displayArtist = artistHint || v.channel.replace(/ - Topic$/i, '').trim();
    tracks.push({
      id: `yt-${v.id}`,
      title: v.title,
      artist: displayArtist,
      artistId: artistHint ? makeRwandaArtistId(artistHint) : undefined,
      artistLocation: country === 'Rwanda' ? 'Kigali, Rwanda' : country,
      artistVerified: Boolean(
        artistLow && v.channel.toLowerCase().includes(artistLow.split(' ')[0]),
      ),
      album: v.channel.replace(/ - Topic$/i, '').trim(),
      genre: country === 'Rwanda' ? 'Rwanda Music' : 'World',
      country,
      durationSec: v.durationSec,
      audioUrl: `https://www.youtube.com/watch?v=${v.id}`,
      youtubeVideoId: v.id,
      coverUrl: v.thumbnail.startsWith('http')
        ? v.thumbnail
        : `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      year: '2025',
      license: 'Full Song',
      sourceLabel: 'YouTube Music',
      isPreview: false,
      bitrateLabel: 'Full Stream',
      storeLinks: buildStoreLinks(displayArtist, v.title),
    });
  }

  let topChannelId: string | undefined;
  let bestCount = 0;
  for (const [cid, cnt] of channelCounts.entries()) {
    if (cnt > bestCount) {
      bestCount = cnt;
      topChannelId = cid;
    }
  }

  return { tracks: tracks.slice(0, limit), topChannelId };
}

const artistCatalogCache = new Map<string, { timestamp: number; tracks: MusicTrack[] }>();
async function fetchFullArtistSongCatalog(
  artistName: string,
  songQuery = '',
  countryHint = 'Global',
): Promise<MusicTrack[]> {
  const cacheKey = `${artistName.toLowerCase()}::${songQuery.toLowerCase()}::${countryHint}`;
  const cached = artistCatalogCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 10) {
    return cached.tracks;
  }

  const isRwandaArtist =
    countryHint === 'Rwanda' ||
    RWANDA_ARTISTS_SEED.some((a) => a.name.toLowerCase() === artistName.toLowerCase());
  const effectiveCountry = isRwandaArtist ? 'Rwanda' : countryHint;

  const q1 = songQuery
    ? `${artistName} ${songQuery} official audio`
    : `${artistName} official audio`;
  const q2 = songQuery
    ? `${artistName} ${songQuery} lyrics`
    : `${artistName} official video ${effectiveCountry === 'Rwanda' ? 'Rwanda' : ''}`.trim();
  const q3 = songQuery ? `${artistName} ${songQuery}` : `${artistName} full songs`;

  const [audiusTracks, archiveTracks, yt1, yt2, yt3] = await Promise.all([
    searchAudiusTracks(songQuery ? `${artistName} ${songQuery}` : artistName, 12),
    searchInternetArchiveTracks(songQuery ? `${artistName} ${songQuery}` : artistName, 4),
    searchYouTubeFullTracks(q1, artistName, effectiveCountry, 24),
    searchYouTubeFullTracks(q2, artistName, effectiveCountry, 24),
    searchYouTubeFullTracks(q3, artistName, effectiveCountry, 20),
  ]);

  const detectedChannelId = yt1.topChannelId || yt2.topChannelId || yt3.topChannelId;
  const rssTracks = detectedChannelId
    ? await fetchYouTubeChannelRssTracks(detectedChannelId, artistName, effectiveCountry)
    : [];

  const localTracks = RESILIENT_FALLBACK_TRACKS.filter((t) =>
    t.artist.toLowerCase().includes(artistName.toLowerCase()),
  );

  // Merge, deduplicate by track ID and normalized title, and prioritize matching official tracks
  const dedup = new Map<string, MusicTrack>();
  const seenTitles = new Set<string>();
  const artistFirstToken = artistName.toLowerCase().split(/\s+/)[0];

  const allCandidates = [
    ...localTracks,
    ...audiusTracks.filter((t) => t.artist.toLowerCase().includes(artistFirstToken)),
    ...yt1.tracks,
    ...rssTracks,
    ...yt2.tracks,
    ...yt3.tracks,
    ...archiveTracks,
  ];

  for (const t of allCandidates) {
    if (t.isPreview || dedup.has(t.id)) continue;
    const normTitle = t.title
      .toLowerCase()
      .replace(/\(official[^)]*\)|\[official[^\]]*\]|\(lyrics[^)]*\)|\(audio\)/gi, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (normTitle.length > 3 && seenTitles.has(normTitle)) continue;
    if (songQuery && !t.title.toLowerCase().includes(songQuery.toLowerCase())) {
      // Allow fuzzy matches only after exact/partial matches
    }
    seenTitles.add(normTitle);
    dedup.set(t.id, t);
  }

  let results = Array.from(dedup.values());
  if (songQuery.trim()) {
    const sq = songQuery.trim().toLowerCase();
    const matched = results.filter((t) => t.title.toLowerCase().includes(sq));
    if (matched.length > 0) results = matched;
  }

  artistCatalogCache.set(cacheKey, { timestamp: Date.now(), tracks: results.slice(0, 60) });
  return results.slice(0, 60);
}

let cachedRwandaTrending: { timestamp: number; tracks: MusicTrack[] } | null = null;
async function getRwandaTrendingShowcase(): Promise<MusicTrack[]> {
  if (cachedRwandaTrending && Date.now() - cachedRwandaTrending.timestamp < 1000 * 60 * 15) {
    return cachedRwandaTrending.tracks;
  }
  const featuredByGenre: Array<{ name: string; genre: RwandaGenreCategory }> = [
    // Afropop & R&B
    { name: 'Bruce Melodie', genre: 'Afropop & R&B' },
    { name: 'Meddy', genre: 'Afropop & R&B' },
    { name: 'Chriss Eazy', genre: 'Afropop & R&B' },
    { name: 'The Ben', genre: 'Afropop & R&B' },
    { name: 'Ariel Wayz', genre: 'Afropop & R&B' },
    { name: 'Nel Ngabo', genre: 'Afropop & R&B' },
    // Hip-Hop & Kinyatrap
    { name: 'Kivumbi King', genre: 'Hip-Hop & Kinyatrap' },
    { name: 'Ish Kevin', genre: 'Hip-Hop & Kinyatrap' },
    { name: 'Riderman', genre: 'Hip-Hop & Kinyatrap' },
    { name: 'Bushali', genre: 'Hip-Hop & Kinyatrap' },
    // Gakondo & Classics
    { name: 'Cécile Kayirebwa', genre: 'Gakondo & Classics' },
    { name: 'Jules Sentore', genre: 'Gakondo & Classics' },
    { name: 'Clarisse Karasira', genre: 'Gakondo & Classics' },
    { name: 'Ruti Joel', genre: 'Gakondo & Classics' },
    // Gospel & Choirs
    { name: 'Israel Mbonyi', genre: 'Gospel & Choirs' },
    { name: 'Ambassadors of Christ Choir', genre: 'Gospel & Choirs' },
    { name: 'James & Daniella', genre: 'Gospel & Choirs' },
    { name: 'Vestine & Dorcas', genre: 'Gospel & Choirs' },
    // DJs & Producers
    { name: 'DJ Pius', genre: 'DJs & Producers' },
    { name: 'DJ Marnaud', genre: 'DJs & Producers' },
    { name: 'DJ Phil Peter', genre: 'DJs & Producers' },
    { name: 'Element Eleéeh', genre: 'DJs & Producers' },
  ];
  const batches = await Promise.all(
    featuredByGenre.map((entry) =>
      searchYouTubeFullTracks(`${entry.name} official audio`, entry.name, 'Rwanda', 3).then(
        (res) => ({ genre: entry.genre, tracks: res.tracks }),
      ),
    ),
  );
  const picked: MusicTrack[] = [];
  const seen = new Set<string>();
  for (const b of batches) {
    for (const t of b.tracks.slice(0, 2)) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        picked.push({ ...t, genre: b.genre });
      }
    }
  }
  if (picked.length === 0) {
    const audiusFallback = await searchAudiusTracks('afrobeats east africa kigali', 10);
    const pool = audiusFallback.length > 0 ? audiusFallback : RESILIENT_FALLBACK_TRACKS;
    for (const t of pool) {
      picked.push({ ...t, genre: 'Afropop & R&B' });
    }
  }
  if (picked.length > 0) {
    cachedRwandaTrending = { timestamp: Date.now(), tracks: picked };
  }
  return picked;
}

const rwandaCategoryTracksCache = new Map<string, { timestamp: number; tracks: MusicTrack[] }>();
async function getRwandaCategoryTracks(category: string): Promise<MusicTrack[]> {
  if (!category || category === 'All') return getRwandaTrendingShowcase();
  const cached = rwandaCategoryTracksCache.get(category);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 15) {
    return cached.tracks;
  }
  const seeds = RWANDA_ARTISTS_SEED.filter((a) => a.genre === category).slice(0, 8);
  const batches = await Promise.all(
    seeds.map((s) =>
      searchYouTubeFullTracks(`${s.name} ${s.signatureTracks?.[0] || 'official audio'}`, s.name, 'Rwanda', 2),
    ),
  );
  const tracks: MusicTrack[] = [];
  const seen = new Set<string>();
  for (const b of batches) {
    for (const t of b.tracks) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        tracks.push({ ...t, genre: category });
      }
    }
  }
  if (tracks.length > 0) {
    rwandaCategoryTracksCache.set(category, { timestamp: Date.now(), tracks });
  }
  return tracks;
}

let cachedDiscover: { timestamp: number; data: DiscoverCatalog } | null = null;
const DISCOVER_TTL_MS = 1000 * 60 * 8;

async function buildDiscoverCatalog(forceRefresh = false): Promise<DiscoverCatalog> {
  if (!forceRefresh && cachedDiscover && Date.now() - cachedDiscover.timestamp < DISCOVER_TTL_MS) {
    return cachedDiscover.data;
  }

  const [
    trendingRes,
    electronicRes,
    ambientRes,
    jazzRes,
    acousticRes,
    radioStations,
    afrobeatsFull,
  ] = await Promise.all([
    fetchAudiusTrending(undefined, 14),
    fetchAudiusTrending('Electronic', 8),
    fetchAudiusTrending('Ambient', 8),
    searchAudiusTracks('jazz saxophone trio', 8),
    searchAudiusTracks('acoustic guitar indie', 8),
    fetchRadioStations(undefined, undefined, 8),
    searchAudiusTracks('afrobeats neo soul', 6),
  ]);

  const trendingTracks =
    trendingRes.tracks.length > 0
      ? trendingRes.tracks
      : [...RESILIENT_FALLBACK_TRACKS, ...afrobeatsFull];

  const curatedPlaylists: CuratedPlaylist[] = [
    {
      id: 'curated-electronic-night',
      title: 'Electronic & Modular Sessions',
      subtitle: 'Full-length hardware synth sets, deep house cuts, and club transmissions.',
      genre: 'Electronic',
      coverUrl: ARTWORK_ELECTRONIC,
      tracks:
        electronicRes.tracks.length > 0
          ? electronicRes.tracks
          : trendingTracks.slice(0, 4),
    },
    {
      id: 'curated-acoustic-warmth',
      title: 'Acoustic & Tape Warmth',
      subtitle: 'Full-length fingerstyle guitars, close-mic strings, and analog folk sessions.',
      genre: 'Acoustic',
      coverUrl: ARTWORK_ACOUSTIC,
      tracks:
        acousticRes.length > 0
          ? acousticRes
          : [RESILIENT_FALLBACK_TRACKS[0], RESILIENT_FALLBACK_TRACKS[2]],
    },
    {
      id: 'curated-jazz-midnight',
      title: 'Midnight Jazz & Brass',
      subtitle: 'Full-length tenor saxophones, upright bass grooves, and late-night quartets.',
      genre: 'Jazz',
      coverUrl: ARTWORK_JAZZ,
      tracks:
        jazzRes.length > 0
          ? jazzRes
          : [RESILIENT_FALLBACK_TRACKS[2], RESILIENT_FALLBACK_TRACKS[3]],
    },
    {
      id: 'curated-ambient-horizon',
      title: 'Nordic Ambient Horizon',
      subtitle: 'Full-length atmospheric soundscapes, felt piano, and meditative coastal drones.',
      genre: 'Ambient',
      coverUrl: ARTWORK_AMBIENT,
      tracks:
        ambientRes.tracks.length > 0
          ? ambientRes.tracks
          : [RESILIENT_FALLBACK_TRACKS[1], RESILIENT_FALLBACK_TRACKS[3]],
    },
  ];

  // Build featured artists from trending + curated full-length tracks
  const artistMap = new Map<string, ArtistSummary>();
  for (const t of [...trendingTracks, ...electronicRes.tracks, ...jazzRes, ...afrobeatsFull]) {
    const key = t.artistId || t.artist;
    if (!artistMap.has(key)) {
      artistMap.set(key, {
        id: key,
        name: t.artist,
        handle: t.artistHandle,
        location: t.artistLocation || t.country || 'Global',
        avatarUrl: t.artistAvatar || t.coverUrl,
        verified: Boolean(t.artistVerified),
        sourceLabel: t.sourceLabel,
        topTracks: [t],
      });
    } else {
      const existing = artistMap.get(key)!;
      if (existing.topTracks.length < 4 && !existing.topTracks.some((x) => x.id === t.id)) {
        existing.topTracks.push(t);
      }
    }
  }

  const catalog: DiscoverCatalog = {
    featuredTitle: 'Global Listening Room',
    featuredSubtitle:
      'Full-length independent streams, live international radio relays, 5-band parametric EQ, and direct-to-artist storefronts.',
    heroImageUrl: HERO_LISTENING_ROOM,
    curatedPlaylists,
    spotifyPlaylists: SPOTIFY_PLAYLISTS,
    trendingTracks,
    liveStations: radioStations,
    featuredArtists: Array.from(artistMap.values()).slice(0, 10),
    countries: COUNTRIES,
    platforms: PLATFORMS,
    genres: GENRES,
    musicStores: MUSIC_STORES,
  };

  cachedDiscover = { timestamp: Date.now(), data: catalog };
  return catalog;
}

const app = express();
app.use(express.json());

// Serve generated cover artwork cleanly in both dev & production
app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));

// 1. Discover Catalog
app.get('/api/music/discover', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === '1';
    const data = await buildDiscoverCatalog(forceRefresh);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load discovery catalog' });
  }
});

// 2. Multi-source Search & Spotify URL Importer
app.get('/api/music/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const genre = String(req.query.genre || 'All Genres').trim();
  const country = String(req.query.country || 'All Countries').trim();
  const platform = String(req.query.platform || 'All Platforms').trim();
  const limit = Math.min(36, Math.max(6, Number(req.query.limit) || 24));

  try {
    // Handle pasted Spotify URL gracefully
    const spotifyMatch = q.match(/open\.spotify\.com\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/i);
    let effectiveQuery = q;
    let importedSpotifyEmbed: string | undefined;
    if (spotifyMatch) {
      const kind = spotifyMatch[1].toLowerCase();
      const spId = spotifyMatch[2];
      importedSpotifyEmbed = `https://open.spotify.com/embed/${kind}/${spId}`;
      // Fetch oEmbed metadata from Spotify (public, no key needed!)
      const oembed = await fetchJsonWithTimeout<{ title?: string }>(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(q)}`,
        3500,
      );
      effectiveQuery = oembed?.title || 'electronic jazz';
    }

    const searchTokens = [
      effectiveQuery,
      genre !== 'All Genres' ? genre : '',
      country !== 'All Countries' && country !== 'Global' ? country : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const tasks: Array<Promise<MusicTrack[]>> = [];

    if (platform === 'All Platforms' || platform === 'Audius') {
      tasks.push(searchAudiusTracks(searchTokens || 'electronic', 14));
    }
    if (
      platform === 'YouTube Music' ||
      (platform === 'All Platforms' &&
        (country === 'Rwanda' || effectiveQuery.length >= 2))
    ) {
      const ytQuery =
        country === 'Rwanda' && !effectiveQuery
          ? 'Rwanda music official audio'
          : searchTokens || 'Rwanda music official audio';
      tasks.push(
        searchYouTubeFullTracks(
          ytQuery,
          undefined,
          country !== 'All Countries' ? country : 'Global',
          20,
        ).then((r) => r.tracks),
      );
    }
    if (platform === 'All Platforms' || platform === 'Internet Archive') {
      tasks.push(searchInternetArchiveTracks(searchTokens || 'jazz', 4));
    }
    if (platform === 'All Platforms' || platform === 'Global Radio') {
      tasks.push(
        fetchRadioStations(
          country !== 'All Countries' ? country : undefined,
          effectiveQuery || undefined,
          8,
        ),
      );
    }
    if (platform === 'Wikimedia Commons') {
      tasks.push(
        Promise.resolve(
          RESILIENT_FALLBACK_TRACKS.filter((t) => {
            if (!effectiveQuery) return true;
            const hay = `${t.title} ${t.artist} ${t.genre} ${t.country}`.toLowerCase();
            return hay.includes(effectiveQuery.toLowerCase());
          }),
        ),
      );
    }

    const batches = await Promise.all(tasks);
    let combined = batches.flat();

    if (platform === 'All Platforms') {
      const wmMatches = effectiveQuery
        ? RESILIENT_FALLBACK_TRACKS.filter((t) =>
            `${t.title} ${t.artist} ${t.genre} ${t.country}`
              .toLowerCase()
              .includes(effectiveQuery.toLowerCase()),
          )
        : [];
      if (wmMatches.length > 0) combined = [...combined, ...wmMatches];
      if (combined.length === 0) {
        combined =
          country === 'Rwanda' ? await getRwandaTrendingShowcase() : RESILIENT_FALLBACK_TRACKS;
      }
      if (combined.length === 0) combined = RESILIENT_FALLBACK_TRACKS;
    }

    // Deduplicate by track ID and ensure zero 30s previews
    const dedup = new Map<string, MusicTrack>();
    for (const t of combined) {
      if (!t.isPreview && !dedup.has(t.id)) dedup.set(t.id, t);
    }
    combined = Array.from(dedup.values());

    if (importedSpotifyEmbed && combined.length > 0) {
      combined = combined.map((t, i) =>
        i === 0 ? { ...t, spotifyEmbedUrl: importedSpotifyEmbed, spotifyUrl: q } : t,
      );
    }

    // Apply local genre / country refinements softly if needed
    if (genre !== 'All Genres') {
      const exactGenre = combined.filter(
        (t) => t.genre.toLowerCase().includes(genre.toLowerCase()),
      );
      if (exactGenre.length >= 3) combined = exactGenre;
    }

    res.json({
      query: q,
      genre,
      country,
      platform,
      importedSpotifyEmbed,
      tracks: combined.slice(0, limit),
    });
  } catch {
    res.status(500).json({ error: 'Search failed', tracks: RESILIENT_FALLBACK_TRACKS });
  }
});

// 2b. Dedicated Rwanda Artists & Full Catalog Hub ("Abahanzi bose bo mu Rwanda")
app.get('/api/music/rwanda', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || 'All').trim();

  try {
    const [allRwandaArtists, liveRadio, trendingTracks, categoryTracks] = await Promise.all([
      getRwandaArtistsCatalog(),
      fetchRadioStations('Rwanda', undefined, 10),
      getRwandaTrendingShowcase(),
      category && category !== 'All' ? getRwandaCategoryTracks(category) : Promise.resolve([]),
    ]);

    const categoryCounts: Record<string, number> = {
      All: allRwandaArtists.length,
      'Afropop & R&B': 0,
      'Hip-Hop & Kinyatrap': 0,
      'Gakondo & Classics': 0,
      'Gospel & Choirs': 0,
      'DJs & Producers': 0,
    };
    for (const a of allRwandaArtists) {
      if (a.genre && Object.prototype.hasOwnProperty.call(categoryCounts, a.genre)) {
        categoryCounts[a.genre] += 1;
      }
    }

    let filtered = allRwandaArtists;
    if (category && category !== 'All') {
      filtered = filtered.filter((a) => (a.genre || '').toLowerCase() === category.toLowerCase());
    }
    if (q) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.genre && a.genre.toLowerCase().includes(q)) ||
          (a.bio && a.bio.toLowerCase().includes(q)) ||
          (a.label && a.label.toLowerCase().includes(q)) ||
          (a.signatureTracks && a.signatureTracks.some((s) => s.toLowerCase().includes(q))),
      );
    }

    const mergedTracks = (() => {
      const map = new Map<string, MusicTrack>();
      for (const t of [...categoryTracks, ...trendingTracks]) {
        if (!map.has(t.id)) map.set(t.id, t);
      }
      return Array.from(map.values());
    })();

    res.json({
      artists: filtered,
      totalArtists: allRwandaArtists.length,
      categoryCounts,
      categoryDescriptions: RWANDA_CATEGORY_DESCRIPTIONS,
      categories: [
        'All',
        'Afropop & R&B',
        'Hip-Hop & Kinyatrap',
        'Gakondo & Classics',
        'Gospel & Choirs',
        'DJs & Producers',
      ],
      liveRadio,
      trendingTracks: mergedTracks,
    });
  } catch {
    res.status(500).json({ error: 'Failed to load Rwanda music hub' });
  }
});

// 2c. Dedicated Live Radio Endpoint ("Show Radio Alone")
const RADIO_GENRE_OPTIONS = [
  { id: 'all', label: 'All Radio' },
  { id: 'news', label: 'News & Talk' },
  { id: 'music', label: 'Music & Hits' },
  { id: 'afrobeats', label: 'Afrobeats & African' },
  { id: 'jazz', label: 'Jazz & Blues' },
  { id: 'electronic', label: 'Electronic & Dance' },
  { id: 'hiphop', label: 'Hip-Hop & Urban' },
  { id: 'gospel', label: 'Gospel & Christian' },
  { id: 'classical', label: 'Classical & Ambient' },
  { id: 'sports', label: 'Sports Radio' },
  { id: 'rock', label: 'Rock & Indie' },
];

const RADIO_COUNTRIES = [
  'All Countries',
  'Rwanda',
  'United States',
  'United Kingdom',
  'France',
  'Germany',
  'Kenya',
  'Nigeria',
  'South Africa',
  'Ghana',
  'Canada',
  'Japan',
  'Brazil',
  'Australia',
  'Netherlands',
  'Switzerland',
];

app.get('/api/music/radio', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const country = String(req.query.country || 'All Countries').trim();
  const tag = String(req.query.tag || 'all').trim().toLowerCase();
  const limit = Math.min(60, Math.max(8, Number(req.query.limit) || 36));

  try {
    let stations = await fetchRadioStations(
      country !== 'All Countries' ? country : undefined,
      q || undefined,
      limit,
      tag !== 'all' ? tag : undefined,
    );

    // If querying Rwanda or a niche filter returns few stations, try broader country/query fallback
    if (stations.length === 0 && country !== 'All Countries' && tag !== 'all') {
      stations = await fetchRadioStations(country, q || undefined, limit);
    }
    if (stations.length === 0 && !q && tag === 'all') {
      stations = await fetchRadioStations(undefined, undefined, limit);
    }

    res.json({
      stations,
      countries: RADIO_COUNTRIES,
      genres: RADIO_GENRE_OPTIONS,
    });
  } catch {
    res.status(500).json({ error: 'Failed to load live radio stations' });
  }
});

// 3. Artists Directory
app.get('/api/music/artists', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const country = String(req.query.country || 'All Countries').trim();
  const limit = Math.min(80, Math.max(4, Number(req.query.limit) || 24));

  try {
    const queryTerm = [q, country !== 'All Countries' && country !== 'Global' ? country : '']
      .filter(Boolean)
      .join(' ')
      .trim();

    const [audiusArtists, discover, rwandaCatalog] = await Promise.all([
      searchAudiusArtists(queryTerm || 'producer', Math.min(limit, 24)),
      buildDiscoverCatalog(false),
      getRwandaArtistsCatalog(),
    ]);

    const merged = new Map<string, ArtistSummary>();
    const includeRwandaFirst =
      country === 'Rwanda' ||
      (q && rwandaCatalog.some((r) => r.name.toLowerCase().includes(q.toLowerCase())));

    const ordered = includeRwandaFirst
      ? [...rwandaCatalog, ...audiusArtists, ...discover.featuredArtists]
      : [...audiusArtists, ...discover.featuredArtists, ...rwandaCatalog.slice(0, 12)];

    for (const a of ordered) {
      if (!merged.has(a.id)) merged.set(a.id, a);
    }

    let list = Array.from(merged.values());
    if (country !== 'All Countries' && country !== 'Global') {
      const matched = list.filter((a) =>
        a.location.toLowerCase().includes(country.toLowerCase()),
      );
      if (matched.length > 0) list = matched;
    }
    if (q) {
      const qLow = q.toLowerCase();
      const matched = list.filter(
        (a) =>
          a.name.toLowerCase().includes(qLow) ||
          (a.handle && a.handle.toLowerCase().includes(qLow)) ||
          (a.genre && a.genre.toLowerCase().includes(qLow)) ||
          a.location.toLowerCase().includes(qLow),
      );
      if (matched.length > 0) list = matched;
    }

    res.json({
      query: q,
      country,
      artists: list.slice(0, limit),
    });
  } catch {
    res.status(500).json({ error: 'Failed to load artists', artists: [] });
  }
});

// 4. Single Artist Profile + Full Discography ("All Songs")
app.get('/api/music/artist', async (req: Request, res: Response) => {
  const artistId = String(req.query.id || '').trim();
  const artistName = String(req.query.name || '').trim();
  const songQuery = String(req.query.song || '').trim();

  try {
    if (artistId.startsWith('audius-user-') && !songQuery) {
      const rawId = artistId.replace('audius-user-', '');
      for (const host of AUDIUS_HOSTS) {
        const [userRes, tracksRes] = await Promise.all([
          fetchJsonWithTimeout<{ data?: AudiusUserRaw }>(
            `${host}/v1/users/${encodeURIComponent(rawId)}?app_name=Soundmark`,
            4500,
          ),
          fetchJsonWithTimeout<{ data?: AudiusTrackRaw[] }>(
            `${host}/v1/users/${encodeURIComponent(rawId)}/tracks?app_name=Soundmark&limit=30`,
            4500,
          ),
        ]);
        if (userRes?.data) {
          const u = userRes.data;
          const tracks = (tracksRes?.data || [])
            .filter((t) => !t.duration || Number(t.duration) >= 45)
            .map((t) => mapAudiusTrack(t, host));
          const artist: ArtistSummary = {
            id: artistId,
            name: u.name || u.handle || artistName || 'Artist',
            handle: u.handle ? `@${u.handle.replace(/^@/, '')}` : undefined,
            location: u.location?.trim() || 'Global',
            avatarUrl:
              u.profile_picture?.['480x480'] ||
              u.profile_picture?.['150x150'] ||
              tracks[0]?.coverUrl ||
              ARTWORK_ELECTRONIC,
            verified: Boolean(u.is_verified),
            bio: u.bio || undefined,
            sourceLabel: 'Audius',
            trackCount: u.track_count || tracks.length,
            followerCount: u.follower_count,
            topTracks: tracks,
          };
          return res.json({ artist, tracks });
        }
      }
    }

    const rwandaMatch = (await getRwandaArtistsCatalog()).find(
      (a) =>
        a.id === artistId ||
        (artistName && a.name.toLowerCase() === artistName.toLowerCase()),
    );
    const resolvedName =
      rwandaMatch?.name ||
      artistName ||
      artistId.replace(/^(rw|ia|wm|audius-user)?-artist-/, '').replace(/-/g, ' ');

    const tracks = await fetchFullArtistSongCatalog(
      resolvedName,
      songQuery,
      rwandaMatch ? 'Rwanda' : 'Global',
    );

    const artist: ArtistSummary = {
      id: rwandaMatch?.id || artistId || `artist-${encodeURIComponent(resolvedName)}`,
      name: resolvedName || 'Global Artist',
      location: rwandaMatch?.location || tracks[0]?.country || 'Global',
      avatarUrl: tracks[0]?.coverUrl || rwandaMatch?.avatarUrl || ARTWORK_ACOUSTIC,
      verified: rwandaMatch ? true : Boolean(tracks[0]?.artistVerified),
      bio: rwandaMatch?.bio,
      genre: rwandaMatch?.genre,
      era: rwandaMatch?.era,
      label: rwandaMatch?.label,
      signatureTracks: rwandaMatch?.signatureTracks,
      sourceLabel: rwandaMatch ? 'Rwanda Music Index' : tracks[0]?.sourceLabel || 'Soundmark Catalog',
      trackCount: tracks.length,
      topTracks: tracks,
    };

    res.json({ artist, tracks });
  } catch {
    res.status(500).json({ error: 'Artist lookup failed' });
  }
});

// 5. Lyrics & Liner Notes Endpoint (New Feature)
app.get('/api/music/lyrics', async (req: Request, res: Response) => {
  const artist = String(req.query.artist || '').replace(/^@/, '').split(',')[0].split('·')[0].trim();
  const title = String(req.query.title || '').replace(/\([^)]*\)/g, '').trim();

  if (!artist || !title) {
    return res.json({ lyrics: null, source: 'liner-notes' });
  }

  try {
    const json = await fetchJsonWithTimeout<{ lyrics?: string }>(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      4000,
    );
    if (json?.lyrics && json.lyrics.trim().length > 0) {
      return res.json({ lyrics: json.lyrics.trim(), source: 'lyrics.ovh' });
    }
    return res.json({ lyrics: null, source: 'liner-notes' });
  } catch {
    return res.json({ lyrics: null, source: 'liner-notes' });
  }
});

// 6. CORS-enabled Audio Stream Proxy with Range header forwarding for seeking + Web Audio EQ
app.get('/api/music/stream', async (req: Request, res: Response) => {
  const targetUrl = String(req.query.url || '').trim();
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).send('Invalid stream URL');
  }
  if (!isSafePublicHttpUrl(targetUrl)) {
    return res.status(403).send('Blocked private or unsupported URL');
  }

  try {
    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'SoundmarkAudioPlatform/1.0',
    };
    if (req.headers.range) {
      forwardHeaders.Range = String(req.headers.range);
    }

    const upstream = await fetchWithHandshakeTimeout(
      targetUrl,
      {
        headers: forwardHeaders,
        redirect: 'follow',
      },
      req,
      15000,
    );

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send('Upstream audio unavailable');
    }

    res.status(upstream.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const copyHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
    ];
    for (const h of copyHeaders) {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    }
    if (!upstream.headers.get('content-type')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }

    if (!upstream.body) {
      return res.end();
    }

    // Pipe Web ReadableStream to Express Response
    const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.on('error', () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });
    nodeStream.pipe(res);
  } catch {
    if (!res.headersSent) {
      res.status(502).send('Stream proxy connection failed');
    }
  }
});

// 7. World Live TV Catalog (iptv-org public global TV index)
interface IptvChannelRaw {
  id: string;
  name: string;
  country?: string;
  categories?: string[];
  is_nsfw?: boolean;
  closed?: string | null;
  website?: string | null;
}

interface IptvStreamRaw {
  channel?: string | null;
  title?: string | null;
  url: string;
  quality?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
}

interface IptvCountryRaw {
  name: string;
  code: string;
  flag?: string;
}

interface IptvLogoRaw {
  channel: string;
  in_use?: boolean;
  url: string;
}

interface IptvCategoryRaw {
  id: string;
  name: string;
}

interface StandardTvCategoryDef {
  no: number;
  id: string;
  name: string;
  description: string;
}

const STANDARD_TV_CATEGORIES: StandardTvCategoryDef[] = [
  { no: 1, id: 'sports', name: 'Sports TV', description: 'Football, basketball, athletics' },
  { no: 2, id: 'motorsport', name: 'Motorsport TV', description: 'Car racing, motorcycle racing, Formula 1, MotoGP' },
  { no: 3, id: 'news', name: 'News TV', description: 'National and international news' },
  { no: 4, id: 'movies', name: 'Movies TV', description: 'Action, comedy, drama, adventure' },
  { no: 5, id: 'music', name: 'Music TV', description: 'Music videos, concerts, entertainment' },
  { no: 6, id: 'documentary', name: 'Documentary TV', description: 'History, science, nature, discoveries' },
  { no: 7, id: 'educational', name: 'Educational TV', description: 'Learning, technology, science, languages' },
  { no: 8, id: 'kids', name: 'Kids TV', description: "Cartoons and children's programs" },
  { no: 9, id: 'wildlife', name: 'Wildlife TV', description: 'Animals, forests, oceans and nature' },
  { no: 10, id: 'technology', name: 'Technology TV', description: 'Computers, AI, robotics and innovation' },
  { no: 11, id: 'business', name: 'Business TV', description: 'Finance, companies, economics and markets' },
  { no: 12, id: 'religious', name: 'Religious TV', description: 'Religious teachings and programs' },
  { no: 13, id: 'lifestyle', name: 'Lifestyle TV', description: 'Fashion, beauty and daily life' },
  { no: 14, id: 'cooking', name: 'Cooking TV', description: 'Food, recipes and cooking competitions' },
  { no: 15, id: 'travel', name: 'Travel TV', description: 'Countries, tourism and cultures' },
  { no: 16, id: 'reality', name: 'Reality TV', description: 'Competitions and reality shows' },
  { no: 17, id: 'comedy', name: 'Comedy TV', description: 'Comedy shows and stand-up' },
  { no: 18, id: 'drama', name: 'Drama TV', description: 'Series, soap operas and television dramas' },
  { no: 19, id: 'automotive', name: 'Automotive TV', description: 'Cars, motorcycles, reviews and repairs' },
  { no: 20, id: 'gaming', name: 'Gaming & Esports TV', description: 'Video games and gaming competitions' },
  { no: 21, id: 'weather', name: 'Weather TV', description: 'Weather forecasts and climate' },
  { no: 22, id: 'agriculture', name: 'Agriculture TV', description: 'Farming, livestock and agribusiness' },
  { no: 23, id: 'health', name: 'Health TV', description: 'Health education and wellness' },
  { no: 24, id: 'politics', name: 'Politics TV', description: 'Government, elections and political discussions' },
];

const CORE_TV_CATEGORIES = STANDARD_TV_CATEGORIES.map((c) => c.id);

const TV_CATEGORY_META: Record<string, string> = {
  all: 'Live international television broadcasts spanning all 24 categorized TV channels worldwide.',
  ...Object.fromEntries(STANDARD_TV_CATEGORIES.map((c) => [c.id, c.description])),
};

const VALID_STANDARD_CAT_SET = new Set(CORE_TV_CATEGORIES);

function mapChannelCategories(name: string, rawCats: string[]): string[] {
  const out = new Set<string>();
  const lowName = name.toLowerCase();

  for (const raw of rawCats) {
    const c = raw.toLowerCase().trim();
    if (VALID_STANDARD_CAT_SET.has(c)) {
      out.add(c);
      continue;
    }
    if (c === 'education') out.add('educational');
    else if (c === 'science') {
      out.add('technology');
      out.add('educational');
    } else if (c === 'series') out.add('drama');
    else if (c === 'auto') out.add('automotive');
    else if (c === 'legislative') out.add('politics');
    else if (c === 'outdoor') out.add('wildlife');
    else if (c === 'culture') {
      out.add('travel');
      out.add('documentary');
    } else if (c === 'animation' || c === 'family') out.add('kids');
    else if (c === 'entertainment') out.add('lifestyle');
    else if (c === 'general') out.add('news');
    else if (c === 'shop') out.add('lifestyle');
  }

  if (/\b(f1|formula 1|motogp|nascar|motorsport|racing|grand prix)\b/i.test(lowName)) {
    out.add('motorsport');
    out.add('sports');
  }
  if (/\b(love nature|wildlife|animal|ocean|wild|zoo|forest|nature)\b/i.test(lowName)) {
    out.add('wildlife');
  }
  if (/\b(tech|ai\b|robot|cyber|computer|innovation|astroscience)\b/i.test(lowName)) {
    out.add('technology');
  }
  if (/\b(bloomberg|cnbc|finance|business|market|econom)\b/i.test(lowName)) {
    out.add('business');
  }
  if (/\b(fashion|lifestyle|luxe|beauty)\b/i.test(lowName)) {
    out.add('lifestyle');
  }
  if (/\b(cook|food|kitchen|chef|tastemade|gusto|recipe)\b/i.test(lowName)) {
    out.add('cooking');
  }
  if (/\b(travel|tourism|wander|journey)\b/i.test(lowName)) {
    out.add('travel');
  }
  if (/\b(reality|fear factor|ninja warrior|idol|survivor|competition)\b/i.test(lowName)) {
    out.add('reality');
  }
  if (/\b(auto|car|motor|top gear|garage|driver|mavtv)\b/i.test(lowName)) {
    out.add('automotive');
  }
  if (/\b(gaming|esports?|gametoon|twitch|arcade)\b/i.test(lowName)) {
    out.add('gaming');
  }
  if (/\b(weather|climate|accuweather|meteo)\b/i.test(lowName)) {
    out.add('weather');
  }
  if (/\b(agro|agri|farm|livestock|rural|terraviva)\b/i.test(lowName)) {
    out.add('agriculture');
  }
  if (/\b(health|wellness|fitness|medical|nutrition|yoga)\b/i.test(lowName)) {
    out.add('health');
  }
  if (/\b(parlament|parliament|c-span|senate|congress|politics|sansad|election)\b/i.test(lowName)) {
    out.add('politics');
  }

  if (out.size === 0) out.add('news');
  return Array.from(out);
}

const VERIFIED_FEATURED_TV: TvChannel[] = [
  {
    id: 'France24.fr',
    name: 'France 24 English',
    countryCode: 'FR',
    countryName: 'France',
    countryFlag: '🇫🇷',
    categories: ['news'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/6/65/FRANCE_24_logo.svg',
    streamUrl:
      'https://amg00106-amg00106c1-rakuten-uk-4654.playouts.now.amagi.tv/playlist/amg00106-france24fast-france24-rakutenuk/playlist.m3u8',
    alternateUrls: [
      'https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8',
      'https://dash3.antik.sk/live/test_france24_eng/playlist.m3u8',
    ],
    quality: '1080p',
    website: 'https://www.france24.com/en/',
  },
  {
    id: 'DWEnglish.de',
    name: 'DW English',
    countryCode: 'DE',
    countryName: 'Germany',
    countryFlag: '🇩🇪',
    categories: ['news', 'documentary'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Deutsche_Welle_symbol_2012.svg',
    streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    quality: '1080p',
    website: 'https://www.dw.com/en/',
  },
  {
    id: 'TRACEUK.uk',
    name: 'TRACE UK (Music & Urban)',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['music', 'lifestyle'],
    logoUrl: '',
    streamUrl: 'https://amg01131-tracetv-amg01131c5-stirr-us-4389.playouts.now.amagi.tv/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'Vevo90s00s.uk',
    name: "Vevo '90s & '00s",
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['music'],
    logoUrl: '',
    streamUrl: 'https://d1cj21il6keqa2.cloudfront.net/playlist.m3u8',
    alternateUrls: ['https://d2n3779oy6efpi.cloudfront.net/playlist.m3u8'],
    quality: '1080p',
  },
  {
    id: 'RwandaTV.rw',
    name: 'Rwanda TV (RTV)',
    description: 'National news and programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['news', 'politics', 'drama'],
    logoUrl: 'https://i.imgur.com/4nbGvxW.png',
    streamUrl: 'https://5c46fa289c89f.streamlock.net/rtv25/rtv/playlist.m3u8',
    alternateUrls: ['http://197.243.19.131:1935/rtv25/rtv/chunklist.m3u8'],
    embedUrl: 'https://rba.player.easybroadcast.io/events/151_hc2_uuwnhaa',
    quality: '720p',
    website: 'https://www.rba.co.rw/tv',
  },
  {
    id: 'TV1.rw',
    name: 'TV1 Rwanda',
    description: 'News and entertainment.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['news', 'lifestyle', 'reality'],
    logoUrl: 'https://i.imgur.com/nQNOHJx.png',
    streamUrl: 'https://live.tv1.rw/index.m3u8',
    quality: '720p',
    website: 'https://www.tv1.rw/',
  },
  {
    id: 'TV10.rw',
    name: 'TV10',
    description: 'General entertainment.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['sports', 'drama', 'comedy'],
    logoUrl: 'https://i.imgur.com/DeaWC1N.png',
    streamUrl: 'https://5c46fa289c89f.streamlock.net/pub1live/mystream/playlist.m3u8',
    quality: '720p',
    website: 'http://www.radiotv10.rw/',
  },
  {
    id: 'IsiboTV.rw',
    name: 'Isibo TV',
    description: 'News and entertainment.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['news', 'music', 'lifestyle'],
    logoUrl: 'https://i.imgur.com/bXhEeTC.png',
    streamUrl: 'https://5c46fa289c89f.streamlock.net/pub2live/myStream/playlist.m3u8',
    quality: '720p',
    website: 'https://www.isibomedia.com/',
  },
  {
    id: 'KC2.rw',
    name: 'KC2',
    description: 'Entertainment.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['music', 'lifestyle', 'reality'],
    logoUrl: 'https://i.imgur.com/PsYPzNc.png',
    streamUrl: 'https://5c46fa289c89f.streamlock.net/kc2/kc2/chunklist.m3u8',
    alternateUrls: ['http://197.243.19.131:1935/kc2/kc2/chunklist.m3u8'],
    quality: '720p',
    website: 'https://www.rba.co.rw/kc2',
  },
  {
    id: 'BTNTV.rw',
    name: 'BTN TV',
    description: 'General programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['news', 'lifestyle'],
    logoUrl: 'https://i.imgur.com/WmaP8zP.png',
    streamUrl: 'https://tv.btnrwanda.com:3973/live/btnv2live.m3u8',
    embedUrl: 'https://tv.btnrwanda.com/hybrid-stream-video-widget/btnv2',
    quality: '720p',
    website: 'https://btnrwanda.com/',
  },
  {
    id: 'IsangoTV.rw',
    name: 'Isango TV',
    description: 'Music and entertainment.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['music', 'lifestyle'],
    logoUrl: 'https://i.imgur.com/EfsHaMQ.png',
    streamUrl: 'http://80.241.215.175:1935/isangostar/isangostar/playlist.m3u8',
    quality: '720p',
    website: 'http://www.isangostar.rw/',
  },
  {
    id: 'BPlusTV.rw',
    name: 'B+ TV',
    description: 'Entertainment.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['drama', 'comedy', 'reality'],
    logoUrl: 'https://i.ibb.co/WzLwj3X/IMG-20230703-155036.jpg',
    streamUrl: 'https://tv.btnrwanda.com:3432/live/bpluslive.m3u8',
    embedUrl: 'https://tv.btnrwanda.com/hybrid-stream-video-widget/bplus',
    quality: '720p',
    website: 'https://btnrwanda.com/',
  },
  {
    id: 'BCNTV.rw',
    name: 'BCN TV',
    description: 'Religious programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['religious'],
    logoUrl: 'https://i.imgur.com/rP46S5B.png',
    streamUrl: 'https://live.bcntv.org/live/bcn_16_9.m3u8',
    quality: '720p',
    website: 'https://bcntv.org/',
  },
  {
    id: 'MagicSportsTV.rw',
    name: 'Magic Sports TV',
    description: 'Sports.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['sports'],
    logoUrl: 'https://i.imgur.com/Le7ZxXn.png',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/gMKuGUNfnjE?playlist=gMKuGUNfnjE,F3WeUVKH_Sw,yEH5UDl_-Rw&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.rba.co.rw/sports',
  },
  {
    id: 'FlashTV.rw',
    name: 'Flash TV',
    description: 'General programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['news', 'politics'],
    logoUrl: 'https://i.imgur.com/0IViNQw.png',
    streamUrl: '',
    embedUrl: 'https://rtsp.me/embed/BU1Lr9xabYEDqX7k/',
    quality: 'HD Live',
    website: 'https://flash.rw/flash-tv-live/',
  },
  {
    id: 'IzubaTV.rw',
    name: 'Izuba TV',
    description: 'General programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['travel', 'news'],
    logoUrl: 'https://i.imgur.com/cRA1CuG.png',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/fDYGaZb6VE0?autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.izubaradiotv.rw/',
  },
  {
    id: 'PacisTV.rw',
    name: 'Pacis TV',
    description: 'Religious programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['religious'],
    logoUrl: 'https://i.imgur.com/Z1BAljS.png',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/5J72KNquRzY?autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://pacistv.rw/',
  },
  {
    id: 'GoodrichTV.rw',
    name: 'Goodrich TV',
    description: 'Business and general content.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['business', 'educational', 'news'],
    logoUrl: 'https://i.imgur.com/52ouIBt.png',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/o0OWFIsXYoQ?autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://goodrichtv.com/en',
  },
  {
    id: 'YongweTV.rw',
    name: 'Yongwe TV',
    description: 'General programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['travel', 'lifestyle'],
    logoUrl: 'https://i.imgur.com/GRHg9Th.jpg',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/RD2-Qj4SyTI?playlist=RD2-Qj4SyTI,NEJjsySc5Zw&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.yongwetv.com/',
  },
  {
    id: 'AuthenticTV.rw',
    name: 'Authentic TV',
    description: 'General programmes.',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['religious', 'educational'],
    logoUrl: 'https://i.imgur.com/PZ1yJjn.png',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/u_Vf0i0wwYQ?autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.youtube.com/@authentictvrwanda',
  },
  {
    id: 'CNNHeadlines.us',
    name: 'CNN Headlines',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['news'],
    logoUrl: '',
    streamUrl: 'https://jmp2.uk/plu-66c45c274f25dd00092739ee.m3u8',
    alternateUrls: ['https://jmp2.uk/plu-66337e365a402e00087eccaf.m3u8'],
    quality: '1080p',
  },
  {
    id: 'AlJazeera2.qa',
    name: 'Al Jazeera 2',
    countryCode: 'QA',
    countryName: 'Qatar',
    countryFlag: '🇶🇦',
    categories: ['news'],
    logoUrl: '',
    streamUrl: 'https://live-hls-web-aja2-gcp.thehlive.com/AJA2/index.m3u8',
    quality: '1080p',
  },
  {
    id: 'Euronews.eu',
    name: 'Euronews',
    countryCode: 'FR',
    countryName: 'France',
    countryFlag: '🇫🇷',
    categories: ['news'],
    logoUrl: '',
    streamUrl: 'https://jmp2.uk/plu-61de8e502c8e9400077e5de7.m3u8',
    quality: '1080p',
  },
  {
    id: 'SuperSportPremierLeague.za',
    name: 'SuperSport',
    description: 'Premier League, European football and other competitions.',
    countryCode: 'ZA',
    countryName: 'South Africa',
    countryFlag: '🇿🇦',
    categories: ['sports'],
    logoUrl: 'https://i.imgur.com/xZFMYj4.png',
    streamUrl: '',
    embedUrl:
      'https://www.youtube.com/embed/LhoMw1ix_ow?playlist=LhoMw1ix_ow,fRJxEMTtGqk,AfqBO0cGifs&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.supersport.com/',
  },
  {
    id: 'CanalPlusSport.fr',
    name: 'Canal+ Sport',
    description: 'European leagues and selected major matches.',
    countryCode: 'FR',
    countryName: 'France',
    countryFlag: '🇫🇷',
    categories: ['sports'],
    logoUrl: 'https://i.imgur.com/EOXnU15.png',
    streamUrl: '',
    embedUrl:
      'https://www.youtube.com/embed/RKFT-T8oifc?playlist=RKFT-T8oifc,909AI7zdnvg,I_K5r2dRfUo&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.canalplus.com/sport/',
  },
  {
    id: 'beINSPORTSXTRA.us',
    name: 'beIN SPORTS',
    description: 'European football competitions, depending on broadcasting rights.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['sports'],
    logoUrl: 'https://i.imgur.com/uJosqHh.png',
    streamUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
    alternateUrls: [
      'https://bein-beinxtrasports-firetv.amagi.tv/playlist.m3u8',
      'https://d9ssxzmclhfo4.cloudfront.net/bein_sports.m3u8',
      'https://bein-xtra-xumo.amagi.tv/playlist.m3u8',
    ],
    quality: '1080p',
    website: 'https://www.beinsports.com/',
  },
  {
    id: 'ESPN.us',
    name: 'ESPN',
    description: 'Selected international football.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['sports'],
    logoUrl:
      'https://images.fubo.tv/channel-config-ui/station-logos/on-white/espn4k_color_1440x1440.png',
    streamUrl: '',
    embedUrl:
      'https://www.youtube.com/embed/t_Yj5OGJ2Hc?playlist=t_Yj5OGJ2Hc,QgpjyGrfo4I,3Gu7H7ltNZE&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.espn.com/soccer/',
  },
  {
    id: 'UEFATV.ch',
    name: 'UEFA.tv',
    description: 'Selected European football content and highlights.',
    countryCode: 'CH',
    countryName: 'Switzerland',
    countryFlag: '🇨🇭',
    categories: ['sports'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/UEFA_logo.svg',
    streamUrl: '',
    embedUrl:
      'https://www.youtube.com/embed/OVcoVweCVuY?playlist=OVcoVweCVuY,SkeFMwnSwQM,DLOUfAVwuXA,NiPCDDNEZa0&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.uefa.tv/',
  },
  {
    id: 'FIFAPlus.uk',
    name: 'FIFA+',
    description: 'Selected live football matches, highlights and international competitions.',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['sports'],
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png',
    streamUrl:
      'https://a62dad94.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0ZJRkFQbHVzRW5nbGlzaF9ITFM/playlist.m3u8',
    alternateUrls: [
      'https://ba3e2e93.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/U2Ftc3VuZy1nYl9GSUZBUGx1c0VuZ2xpc2hfSExT/playlist.m3u8',
      'https://jmp2.uk/plu-63d91d2560bc8f0008a225e4.m3u8',
    ],
    quality: '1080p',
    website: 'https://www.plus.fifa.com/',
  },
  {
    id: 'SkySportsF1.uk',
    name: 'Sky Sports F1',
    description: 'Formula 1.',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['motorsport', 'sports'],
    logoUrl: 'https://epg.pw/media/images/epg/2025/02/20/20250220020810596669_35.png',
    streamUrl: '',
    embedUrl:
      'https://www.youtube.com/embed/guCbZ-TsnWk?playlist=guCbZ-TsnWk,onTqc5L1Opk,EZeApLXpQAY,Dxh3NwRZbs4,6bVQz0FMg_s,T3mbNa6QLG8&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.skysports.com/f1',
  },
  {
    id: 'Eurosport1.fr',
    name: 'Eurosport',
    description: 'Car and motorcycle racing.',
    countryCode: 'FR',
    countryName: 'France',
    countryFlag: '🇫🇷',
    categories: ['motorsport', 'sports', 'automotive'],
    logoUrl: 'https://i.imgur.com/s4jDnJh.png',
    streamUrl: 'https://r.eu.cdn-redge.media/livehls/oeu/mt/live/eurosport_1_en/live.livx/playlist.m3u8',
    alternateUrls: [
      'https://r.eu.cdn-redge.media/livehls/oeu/mt/live/eurosport_1/live.livx/playlist.m3u8',
      'https://r.eu.cdn-redge.media/livehls/oeu/mt/live/eurosport_2_en/live.livx/playlist.m3u8',
    ],
    embedUrl: 'https://www.youtube.com/embed/_ptuYKmD4_U?playlist=_ptuYKmD4_U,0ub5XVUpRrc&autoplay=1&rel=0',
    quality: '1080p',
    website: 'https://www.eurosport.com/',
  },
  {
    id: 'SuperSportMotorsport.za',
    name: 'SuperSport Motorsport',
    description: 'Motorsport.',
    countryCode: 'ZA',
    countryName: 'South Africa',
    countryFlag: '🇿🇦',
    categories: ['motorsport', 'sports'],
    logoUrl: 'https://i.imgur.com/QvIPyxE.png',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/HVScH48KGGA?playlist=HVScH48KGGA,xuDPQrLTjKA,1nfgWGhABn8&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.supersport.com/motorsport',
  },
  {
    id: 'ESPNMotorsport.us',
    name: 'ESPN Motorsport',
    description: 'Motorsport.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['motorsport', 'sports'],
    logoUrl:
      'https://images.fubo.tv/channel-config-ui/station-logos/on-white/espn4k_color_1440x1440.png',
    streamUrl: '',
    embedUrl:
      'https://www.youtube.com/embed/ZKCSvOaxE0U?playlist=ZKCSvOaxE0U,Z0Xn3ZmQSLM,ipOT9ruRobc,lkb5kqDJYXk&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.espn.com/racing/',
  },
  {
    id: 'FoxSports1.us',
    name: 'FOX Sports',
    description: 'NASCAR and other racing.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['motorsport', 'sports'],
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/FOX_Sports_logo.svg/960px-FOX_Sports_logo.svg.png',
    streamUrl: '',
    embedUrl: 'https://www.youtube.com/embed/Q-sBjtj5nZ4?playlist=Q-sBjtj5nZ4,mLig53bJ2l0,c8jIQwiq0Fs&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.foxsports.com/nascar',
  },
  {
    id: 'TNTSports1.uk',
    name: 'TNT Sports',
    description: 'Motorsport.',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['motorsport', 'sports'],
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/TNT_Sports_2021_logo.svg/960px-TNT_Sports_2021_logo.svg.png',
    streamUrl: '',
    embedUrl:
      'https://www.youtube.com/embed/AkmX26SJxm8?playlist=AkmX26SJxm8,28YRXRnhYME,wrO3fk7OBcI,OeUK0_MY4R8&autoplay=1&rel=0',
    quality: 'HD Live',
    website: 'https://www.tntsports.co.uk/motorsport/',
  },
  {
    id: 'RacerNetwork.us',
    name: 'MAVTV',
    description: 'Motorsport and automotive racing.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['motorsport', 'automotive', 'sports'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/MAVTV_Canada.png',
    streamUrl:
      'https://amg00378-mavtv-amg00378c2-samsung-au-1790.playouts.now.amagi.tv/playlist/amg00378-mavtvfast-motorsportsnetwork-samsungau/playlist.m3u8',
    alternateUrls: [
      'https://amg00378-mavtv-amg00378c2-rakuten-us-1048.playouts.now.amagi.tv/playlist/amg00378-mavtvfast-motorsportsnetwork-rakutenus/playlist.m3u8',
      'https://amg00378-mavtv-amg00378c2-samsung-nz-1791.playouts.now.amagi.tv/playlist/amg00378-mavtvfast-motorsportsnetwork-samsungnz/playlist.m3u8',
      'https://amg00378-mavtv-amg00378c3-sportstribal-emea-1325.playouts.now.amagi.tv/mavtv-smn-xm/playlist.m3u8',
    ],
    embedUrl: 'https://www.youtube.com/embed/i1xbeRWVYK8?playlist=i1xbeRWVYK8,UDRS5FsKW04,7f3NKXYg5N4&autoplay=1&rel=0',
    quality: '1080p',
    website: 'https://www.mavtv.com/',
  },
  {
    id: 'ACCDigitalNetwork.us',
    name: 'ACC Digital Network',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['sports'],
    logoUrl: '',
    streamUrl: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'ARTFLIXMovieClassics.us',
    name: 'ARTFLIX Movie Classics',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['movies'],
    logoUrl: '',
    streamUrl: 'https://amogonetworx-artflix-1-nl.samsung.wurl.tv/playlist.m3u8',
    quality: '720p',
  },
  {
    id: 'AdrenalinaPuraTV.us',
    name: 'Adrenalina Pura TV',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['movies'],
    logoUrl: '',
    streamUrl: 'https://jmp2.uk/plu-61b790b985706b00072cb797.m3u8',
    quality: 'HD',
  },
  {
    id: '48Hours.us',
    name: '48 Hours',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['drama', 'documentary'],
    logoUrl: '',
    streamUrl: 'https://jmp2.uk/plu-62e925bc68d18a00077bb990.m3u8',
    quality: 'HD',
  },
  {
    id: 'AllRealitybyWEtv.us',
    name: 'All Reality by WE tv',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['reality', 'drama'],
    logoUrl: '',
    streamUrl: 'https://jmp2.uk/plu-5e82530945600e0007ca076c.m3u8',
    quality: '720p',
  },
  {
    id: 'FearFactor.us',
    name: 'Fear Factor',
    description: 'Competitions and reality shows.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['reality'],
    logoUrl: 'https://i.imgur.com/CIYnLWz.png',
    streamUrl:
      'https://amg00627-banijaygroup-fearfactor-samsungau-9vdod.amagi.tv/playlist/amg00627-banijaygroup-fearfactor-samsungau/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'BabyFirst.us',
    name: 'BabyFirst',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['kids', 'educational'],
    logoUrl: '',
    streamUrl: 'https://cdn.fast.jwp.services/v1/channel/1_jB6940Ei_TvhvIHDL/manifest.m3u8',
    quality: 'HD',
  },
  {
    id: 'BabySharkTV.us',
    name: 'Baby Shark TV',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['kids'],
    logoUrl: '',
    streamUrl: 'https://jmp2.uk/plu-63da6bcd60bc8f0008a5d364.m3u8',
    quality: 'HD',
  },
  {
    id: 'PBSHistory.us',
    name: 'PBS History',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['documentary', 'educational'],
    logoUrl: '',
    streamUrl:
      'https://amg02333-pbs-amg02333c1-samsung-au-1253.playouts.now.amagi.tv/playlist/amg02333-pbsdistributionfast-pbshistory-samsungau/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'AdventureEarth.de',
    name: 'Adventure Earth',
    countryCode: 'DE',
    countryName: 'Germany',
    countryFlag: '🇩🇪',
    categories: ['documentary', 'wildlife'],
    logoUrl: '',
    streamUrl: 'https://autentic-adventure-earth-1-eu.rakuten.wurl.tv/playlist.m3u8',
    quality: '720p',
  },
  {
    id: 'LoveNature.ca',
    name: 'Love Nature',
    description: 'Animals, forests, oceans and nature.',
    countryCode: 'CA',
    countryName: 'Canada',
    countryFlag: '🇨🇦',
    categories: ['wildlife', 'documentary'],
    logoUrl: '',
    streamUrl: 'https://pb-ehs1glsha1juy.akamaized.net/Love_Nature_4K.m3u8',
    quality: '4K',
  },
  {
    id: '30ADarcizzleOffshore.us',
    name: '30A Darcizzle Offshore',
    description: 'Animals, forests, oceans and nature.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['wildlife', 'travel'],
    logoUrl: 'https://i.imgur.com/Q4l2uao.png',
    streamUrl: 'https://30a-tv.com/darcizzle.m3u8',
    quality: '1080p',
  },
  {
    id: 'BloombergOriginals.us',
    name: 'Bloomberg Originals',
    description: 'Computers, AI, robotics, innovation and markets.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['technology', 'business', 'educational'],
    logoUrl: '',
    streamUrl:
      'https://e96a7526.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0Jsb29tYmVyZ09yaWdpbmFsc19ITFM/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'BloombergTV.us',
    name: 'Bloomberg TV',
    description: 'Finance, companies, economics and markets.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['business', 'news'],
    logoUrl: '',
    streamUrl: 'https://bloomberg.com/media-manifest/streams/asia.m3u8',
    quality: '1080p',
  },
  {
    id: 'CNBCUK.uk',
    name: 'CNBC UK',
    description: 'Finance, companies, economics and markets.',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['business', 'news'],
    logoUrl: '',
    streamUrl: 'https://amg01079-nbcuuk-amg01079c2-lg-gb-2030.playouts.now.amagi.tv/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'FashionTVParisLOriginal.fr',
    name: "FashionTV Paris L'Original",
    description: 'Fashion, beauty and daily life.',
    countryCode: 'FR',
    countryName: 'France',
    countryFlag: '🇫🇷',
    categories: ['lifestyle'],
    logoUrl: '',
    streamUrl:
      'https://edge-fast3.evrideo.tv/bfdbb576-83f7-11f0-9f89-0200170e3e04_1000028043_HLS/manifest.m3u8',
    quality: '1080p',
  },
  {
    id: '30ALuxeLifeDiscovered.us',
    name: '30A Luxe Life Discovered',
    description: 'Fashion, beauty and daily life.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['lifestyle', 'travel'],
    logoUrl: 'https://m.media-amazon.com/images/I/51FJ5A0mEyL.jpg',
    streamUrl: 'https://30a-tv.com/feeds/vidaa/luxelife.m3u8',
    quality: '1080p',
  },
  {
    id: 'GustoTV.ca',
    name: 'Gusto TV',
    description: 'Food, recipes and cooking competitions.',
    countryCode: 'CA',
    countryName: 'Canada',
    countryFlag: '🇨🇦',
    categories: ['cooking', 'lifestyle'],
    logoUrl: '',
    streamUrl:
      'https://563f72af.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0d1c3RvVFZfSExT/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'Tastemade.us',
    name: 'Tastemade',
    description: 'Food, recipes and cooking competitions.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['cooking', 'travel'],
    logoUrl: '',
    streamUrl: 'https://tastemade-tdint-rakuten.amagi.tv/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'BBCTravel.us',
    name: 'BBC Travel',
    description: 'Countries, tourism and cultures.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['travel', 'documentary'],
    logoUrl: 'https://i.imgur.com/QiuYWs9.png',
    streamUrl: 'https://jmp2.uk/plu-60e4519e6873180007d3cddb.m3u8',
    quality: '1080p',
  },
  {
    id: 'AutenticTravel.de',
    name: 'Autentic Travel',
    description: 'Countries, tourism and cultures.',
    countryCode: 'DE',
    countryName: 'Germany',
    countryFlag: '🇩🇪',
    categories: ['travel'],
    logoUrl: 'https://www.autentic.com/images/Travel-Logo-positiv-RGB.svg',
    streamUrl:
      'https://cb0c87cc605942ff9766a4e6744bbadc.mediatailor.us-east-1.amazonaws.com/v1/master/44f73ba4d03e9607dcd9bebdcb8494d86964f1d8/RlaxxTV-eu_AutenticTravel/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'MotorvisionPlus.de',
    name: 'Motorvision+',
    description: 'Cars, motorcycles, reviews and repairs.',
    countryCode: 'DE',
    countryName: 'Germany',
    countryFlag: '🇩🇪',
    categories: ['automotive', 'motorsport'],
    logoUrl: '',
    streamUrl:
      'https://r.eu.cdn-redge.media/livehls/oeu/mt/live/motorvision_en/live.livx/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'Automotolachaine.fr',
    name: 'Automoto la chaine',
    description: 'Cars, motorcycles, reviews and repairs.',
    countryCode: 'FR',
    countryName: 'France',
    countryFlag: '🇫🇷',
    categories: ['automotive', 'motorsport'],
    logoUrl: 'https://i.imgur.com/ebf2uc7.png',
    streamUrl: 'https://r.eu.cdn-redge.media/livehls/oeu/mt/live/automoto/live.livx/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: '30AWeLoveCars.us',
    name: '30A We Love Cars',
    description: 'Cars, motorcycles, reviews and repairs.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['automotive'],
    logoUrl: '',
    streamUrl: 'https://30a-tv.com/feeds/vidaa/cars.m3u8',
    quality: '1080p',
  },
  {
    id: 'Gametoon.nl',
    name: 'Gametoon',
    description: 'Video games and gaming competitions.',
    countryCode: 'NL',
    countryName: 'Netherlands',
    countryFlag: '🇳🇱',
    categories: ['gaming'],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/tr/b/b6/Gametoon_HD_logo.png',
    streamUrl: 'https://webtvstream.bhtelecom.ba/gametoon.m3u8',
    embedUrl:
      'https://www.youtube.com/embed/RHlyno8_9vI?playlist=RHlyno8_9vI,AlOwMEAtD0Q,7THAvCYXqbg&autoplay=1&rel=0',
    quality: '1080p',
  },
  {
    id: 'eSportsMaxTV.ve',
    name: 'eSports Max TV',
    description: 'Video games and gaming competitions.',
    countryCode: 'VE',
    countryName: 'Venezuela',
    countryFlag: '🇻🇪',
    categories: ['gaming'],
    logoUrl: 'https://i.imgur.com/OprRgQN.png',
    streamUrl: 'https://cdnlive.klicgo.net/esportsmax/live/playlist_dvr.m3u8',
    embedUrl:
      'https://www.youtube.com/embed/AlOwMEAtD0Q?playlist=AlOwMEAtD0Q,rH-XexiOBCA,teT0Vnuq_9o&autoplay=1&rel=0',
    quality: '1080p',
  },
  {
    id: 'AccuWeatherNOW.us',
    name: 'AccuWeather NOW',
    description: 'Weather forecasts and climate.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['weather', 'news'],
    logoUrl: 'https://i.imgur.com/M8wbVYK.png',
    streamUrl:
      'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg00684-accuweather-accuweather-plex/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'FoxWeather.us',
    name: 'Fox Weather',
    description: 'Weather forecasts and climate.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['weather', 'news'],
    logoUrl: '',
    streamUrl:
      'https://aka-live1050.delivery.roku.com/2ff50939-341e-4fa8-becf-718769322f14/t2-origin/out/v1/live.m3u8',
    quality: '1080p',
  },
  {
    id: 'AgrotendenciaTV.cr',
    name: 'Agrotendencia TV',
    description: 'Farming, livestock and agribusiness.',
    countryCode: 'CR',
    countryName: 'Costa Rica',
    countryFlag: '🇨🇷',
    categories: ['agriculture', 'business'],
    logoUrl: 'https://i.imgur.com/frd60hR.png',
    streamUrl:
      'https://5fc584f3f19c9.streamlock.net/agrotendencia/videoagrotendencia_hls1/playlist.m3u8',
    quality: '720p',
  },
  {
    id: 'BetterHealthTV.us',
    name: 'Better Health TV',
    description: 'Health education and wellness.',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['health', 'educational'],
    logoUrl: 'https://i.imgur.com/qnwJiji.png',
    streamUrl: 'https://tgn.bozztv.com/betterlife/betterhealth/betterhealth/index.m3u8',
    embedUrl:
      'https://www.youtube.com/embed/ZtL74IHkqFc?playlist=ZtL74IHkqFc,Yr48xp-22bM,345Se_skBOk&autoplay=1&rel=0',
    quality: '720p',
  },
  {
    id: 'BBCFour.uk',
    name: 'BBC Four',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['documentary', 'travel'],
    logoUrl: '',
    streamUrl:
      'https://vs-hls-pushb-uk-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_four_hd/mobile_wifi_main_hd_abr_v2.m3u8',
    quality: '720p',
  },
  {
    id: 'FoxSoul.us',
    name: 'Fox Soul',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['lifestyle', 'comedy'],
    logoUrl: '',
    streamUrl: 'https://foxsoul-vizio.amagi.tv/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'SansadTV1.in',
    name: 'Sansad TV 1',
    countryCode: 'IN',
    countryName: 'India',
    countryFlag: '🇮🇳',
    categories: ['politics'],
    logoUrl: '',
    streamUrl: 'https://d2lk5u59tns74c.cloudfront.net/out/v1/fff8f20221d5456e8922e689d71dedc3/index.m3u8',
    quality: '1080p',
  },
  {
    id: 'CanalParlamento.es',
    name: 'Canal Parlamento',
    countryCode: 'ES',
    countryName: 'Spain',
    countryFlag: '🇪🇸',
    categories: ['politics'],
    logoUrl: '',
    streamUrl: 'https://congresodirecto.akamaized.net/hls/live/2037973/canalparlamento/master.m3u8',
    quality: '360p',
  },
  {
    id: 'Aastha.in',
    name: 'Aastha TV',
    countryCode: 'IN',
    countryName: 'India',
    countryFlag: '🇮🇳',
    categories: ['religious'],
    logoUrl: '',
    streamUrl: 'https://aasthaott.akamaized.net/110923/smil:aasthatv.smil/index.m3u8',
    quality: '720p',
  },
  {
    id: 'AngerManagementChannel.us',
    name: 'Anger Management Channel',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['comedy', 'drama'],
    logoUrl: '',
    streamUrl:
      'https://amg00353-lionsgatestudio-angermgmt-samsungau-o9jg9.amagi.tv/playlist/amg00353-lionsgatestudio-angermgmt-samsungau/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'ClubbingTV.us',
    name: 'Clubbing TV',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['music'],
    logoUrl: '',
    streamUrl: 'https://a-cdn.klowdtv.com/live3/clubbingtv_720p/playlist.m3u8',
    quality: '720p',
  },
];

function scoreStreamHost(url: string): number {
  const low = url.toLowerCase();
  const httpsBonus = low.startsWith('https://') ? 3 : 0;
  if (
    low.includes('amagi.tv') ||
    low.includes('akamaized.net') ||
    low.includes('cloudfront.net') ||
    low.includes('streamlock.net') ||
    low.includes('thehlive.com') ||
    low.includes('klowdtv.com') ||
    low.includes('wurl.tv') ||
    low.includes('wurl.com') ||
    low.includes('jmp2.uk')
  ) {
    return 10 + httpsBonus;
  }
  if (/:\d{4,5}\//.test(low)) return 1 + httpsBonus;
  return 5 + httpsBonus;
}

interface TvCatalogCache {
  timestamp: number;
  channels: TvChannel[];
  countries: TvCountryOption[];
  categories: TvCategoryOption[];
}

let cachedTvCatalog: TvCatalogCache | null = null;
let tvCatalogInFlight: Promise<TvCatalogCache> | null = null;
const TV_CACHE_TTL_MS = 1000 * 60 * 30;

async function buildTvCatalog(): Promise<TvCatalogCache> {
  if (cachedTvCatalog && Date.now() - cachedTvCatalog.timestamp < TV_CACHE_TTL_MS) {
    return cachedTvCatalog;
  }
  if (tvCatalogInFlight) {
    return tvCatalogInFlight;
  }

  tvCatalogInFlight = (async (): Promise<TvCatalogCache> => {
    try {
      const [channelsRaw, streamsRaw, countriesRaw, logosRaw, categoriesRaw] = await Promise.all([
        fetchJsonWithTimeout<IptvChannelRaw[]>('https://iptv-org.github.io/api/channels.json', 8500),
        fetchJsonWithTimeout<IptvStreamRaw[]>('https://iptv-org.github.io/api/streams.json', 8500),
        fetchJsonWithTimeout<IptvCountryRaw[]>('https://iptv-org.github.io/api/countries.json', 6500),
        fetchJsonWithTimeout<IptvLogoRaw[]>('https://iptv-org.github.io/api/logos.json', 8500),
        fetchJsonWithTimeout<IptvCategoryRaw[]>('https://iptv-org.github.io/api/categories.json', 6500),
      ]);

  if (!channelsRaw || !streamsRaw) {
    const fbCountries = new Map<string, TvCountryOption>();
    const fbCategories = new Map<string, number>();
    for (const coreId of CORE_TV_CATEGORIES) {
      fbCategories.set(coreId, 0);
    }
    for (const ch of VERIFIED_FEATURED_TV) {
      const existingCountry = fbCountries.get(ch.countryCode);
      if (existingCountry) {
        existingCountry.count += 1;
      } else {
        fbCountries.set(ch.countryCode, {
          code: ch.countryCode,
          name: ch.countryName,
          flag: ch.countryFlag,
          count: 1,
        });
      }
      for (const catId of ch.categories) {
        const low = catId.toLowerCase();
        fbCategories.set(low, (fbCategories.get(low) || 0) + 1);
      }
    }
    return {
      timestamp: Date.now(),
      channels: VERIFIED_FEATURED_TV,
      countries: Array.from(fbCountries.values()).sort((a, b) => b.count - a.count),
      categories: STANDARD_TV_CATEGORIES.map((c) => ({
        id: c.id,
        no: c.no,
        name: `${c.no}. ${c.name}`,
        description: c.description,
        count: fbCategories.get(c.id) || 0,
      })),
    };
  }

  const countryMap = new Map<string, IptvCountryRaw>();
  for (const c of countriesRaw || []) {
    countryMap.set(c.code.toUpperCase(), c);
  }

  const logoMap = new Map<string, string>();
  for (const l of logosRaw || []) {
    if (!l.channel || !l.url || !l.url.startsWith('https://')) continue;
    if (!logoMap.has(l.channel) || l.in_use) {
      logoMap.set(l.channel, l.url);
    }
  }

  const channelMap = new Map<string, IptvChannelRaw>();
  for (const ch of channelsRaw) {
    if (!ch.is_nsfw && !ch.closed) {
      channelMap.set(ch.id, ch);
    }
  }

  const categoryNameMap = new Map<string, string>();
  for (const cat of categoriesRaw || []) {
    categoryNameMap.set(cat.id.toLowerCase(), cat.name);
  }

  // Group all HTTPS streams per channel so we pick the strongest CDN host and keep backups
  const seenUrls = new Set<string>();
  const channelStreamsMap = new Map<string, { ch?: IptvChannelRaw; name: string; urls: Array<{ url: string; quality: string }> }>();

  for (const st of streamsRaw) {
    if (!st.url || seenUrls.has(st.url)) continue;
    if (st.user_agent || st.referrer) continue;

    const ch = st.channel ? channelMap.get(st.channel) : undefined;
    if (st.channel && !ch) continue; // Closed or NSFW channel

    const isHttps = st.url.startsWith('https://');
    const isRwandaHttp = st.url.startsWith('http://') && ch?.country === 'RW';
    if (!isHttps && !isRwandaHttp) continue;

    const name = (ch?.name || st.title || 'Live Broadcast').trim();
    const key = ch?.id || `stream-${name.toLowerCase()}-${channelStreamsMap.size}`;
    seenUrls.add(st.url);

    const existing = channelStreamsMap.get(key);
    if (existing) {
      if (existing.urls.length < 5) {
        existing.urls.push({ url: st.url, quality: st.quality || 'HD' });
      }
    } else {
      channelStreamsMap.set(key, {
        ch,
        name,
        urls: [{ url: st.url, quality: st.quality || 'HD' }],
      });
    }
  }

  const resolvedChannels: TvChannel[] = [];
  const countryCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const featuredById = new Map(VERIFIED_FEATURED_TV.map((f) => [f.id.toLowerCase(), f]));

  // Always seed our verified live channels first so top listings are immediately playable
  const addedFeaturedIds = new Set<string>();
  for (const feat of VERIFIED_FEATURED_TV) {
    const logo = feat.logoUrl || logoMap.get(feat.id) || '';
    const entry = channelStreamsMap.get(feat.id);
    const extraAlts =
      feat.streamUrl && entry
        ? entry.urls.map((u) => u.url).filter((u) => u !== feat.streamUrl)
        : [];
    const mergedAlts = Array.from(new Set([...(feat.alternateUrls || []), ...extraAlts])).slice(0, 4);

    resolvedChannels.push({
      ...feat,
      logoUrl: logo,
      alternateUrls: mergedAlts.length > 0 ? mergedAlts : undefined,
    });
    addedFeaturedIds.add(feat.id.toLowerCase());

    countryCounts.set(feat.countryCode, (countryCounts.get(feat.countryCode) || 0) + 1);
    for (const catId of feat.categories) {
      const low = catId.toLowerCase();
      categoryCounts.set(low, (categoryCounts.get(low) || 0) + 1);
    }
  }

  for (const [id, entry] of channelStreamsMap.entries()) {
    if (addedFeaturedIds.has(id.toLowerCase()) || featuredById.has(id.toLowerCase())) continue;

    // Sort candidate URLs so reliable CDN hosts are tried first
    entry.urls.sort((a, b) => scoreStreamHost(b.url) - scoreStreamHost(a.url));
    const primary = entry.urls[0];
    const alternates = entry.urls.slice(1).map((u) => u.url);

    const countryCode = (entry.ch?.country || 'INT').toUpperCase();
    const cInfo = countryMap.get(countryCode);
    const countryName = cInfo?.name || (countryCode === 'INT' ? 'International' : countryCode);
    const countryFlag = cInfo?.flag || '🌐';
    const rawCats =
      entry.ch?.categories && entry.ch.categories.length > 0 ? entry.ch.categories : ['general'];
    const cats = mapChannelCategories(entry.name, rawCats);

    resolvedChannels.push({
      id,
      name: entry.name,
      countryCode,
      countryName,
      countryFlag,
      categories: cats,
      logoUrl: logoMap.get(id) || '',
      streamUrl: primary.url,
      alternateUrls: alternates.length > 0 ? alternates : undefined,
      quality: primary.quality,
      website: entry.ch?.website || undefined,
    });

    countryCounts.set(countryCode, (countryCounts.get(countryCode) || 0) + 1);
    for (const catId of cats) {
      const low = catId.toLowerCase();
      categoryCounts.set(low, (categoryCounts.get(low) || 0) + 1);
    }
  }

  // Keep verified featured channels pinned at the top in curated order, then sort rest by CDN reliability + logo + name
  const featOrderMap = new Map(VERIFIED_FEATURED_TV.map((f, idx) => [f.id, idx]));
  resolvedChannels.sort((a, b) => {
    const aFeatIdx = featOrderMap.get(a.id);
    const bFeatIdx = featOrderMap.get(b.id);
    if (aFeatIdx !== undefined && bFeatIdx !== undefined) return aFeatIdx - bFeatIdx;
    if (aFeatIdx !== undefined) return -1;
    if (bFeatIdx !== undefined) return 1;
    const aScore =
      scoreStreamHost(a.streamUrl) +
      (a.logoUrl ? 4 : 0) +
      (a.countryCode !== 'INT' ? 2 : 0) +
      (a.alternateUrls?.length ? 2 : 0);
    const bScore =
      scoreStreamHost(b.streamUrl) +
      (b.logoUrl ? 4 : 0) +
      (b.countryCode !== 'INT' ? 2 : 0) +
      (b.alternateUrls?.length ? 2 : 0);
    if (aScore !== bScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });

  const countries: TvCountryOption[] = Array.from(countryCounts.entries())
    .map(([code, count]) => {
      const info = countryMap.get(code);
      return {
        code,
        name: info?.name || (code === 'INT' ? 'International' : code),
        flag: info?.flag || '🌐',
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  const categories: TvCategoryOption[] = STANDARD_TV_CATEGORIES.map((c) => ({
    id: c.id,
    no: c.no,
    name: `${c.no}. ${c.name}`,
    description: c.description,
    count: categoryCounts.get(c.id) || 0,
  }));

  cachedTvCatalog = {
    timestamp: Date.now(),
    channels: resolvedChannels.length > 0 ? resolvedChannels : VERIFIED_FEATURED_TV,
    countries,
    categories,
  };
  return cachedTvCatalog;
    } finally {
      tvCatalogInFlight = null;
    }
  })();

  return tvCatalogInFlight;
}

const STREAM_HEALTH_TTL_MS = 1000 * 60 * 15;
const streamHealthCache = new Map<string, { ok: boolean; checkedAt: number }>();

async function verifyHlsStreamLive(url: string): Promise<boolean> {
  if (!url) return false;
  const cached = streamHealthCache.get(url);
  if (cached && Date.now() - cached.checkedAt < STREAM_HEALTH_TTL_MS) {
    return cached.ok;
  }

  const uaHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: '*/*',
  };

  let ok = false;
  try {
    const r1 = await fetch(url, {
      headers: uaHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(2600),
    });
    if (r1.ok) {
      const t1 = await r1.text();
      if (t1.trimStart().startsWith('#EXTM3U')) {
        const base1 = r1.url || url;
        const lines1 = t1
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));

        if (lines1[0]) {
          const nextUrl = new URL(lines1[0], base1).toString();
          const isSubPlaylist =
            t1.includes('#EXT-X-STREAM-INF') || nextUrl.toLowerCase().includes('.m3u8');

          if (isSubPlaylist) {
            const r2 = await fetch(nextUrl, {
              headers: uaHeaders,
              redirect: 'follow',
              signal: AbortSignal.timeout(2400),
            });
            if (r2.ok) {
              const t2 = await r2.text();
              if (t2.trimStart().startsWith('#EXTM3U')) {
                const base2 = r2.url || nextUrl;
                const segLines = t2
                  .split(/\r?\n/)
                  .map((l) => l.trim())
                  .filter((l) => l && !l.startsWith('#'));
                if (segLines[0]) {
                  const segUrl = new URL(segLines[0], base2).toString();
                  const r3 = await fetch(segUrl, {
                    headers: { ...uaHeaders, Range: 'bytes=0-63' },
                    redirect: 'follow',
                    signal: AbortSignal.timeout(2200),
                  });
                  ok = r3.ok || r3.status === 206;
                }
              }
            }
          } else {
            const r3 = await fetch(nextUrl, {
              headers: { ...uaHeaders, Range: 'bytes=0-63' },
              redirect: 'follow',
              signal: AbortSignal.timeout(2200),
            });
            ok = r3.ok || r3.status === 206;
          }
        }
      }
    }
  } catch {
    ok = false;
  }

  streamHealthCache.set(url, { ok, checkedAt: Date.now() });
  return ok;
}

async function resolveVerifiedTvChannel(ch: TvChannel): Promise<TvChannel | null> {
  const candidates = [ch.streamUrl, ...(ch.alternateUrls || [])].filter(Boolean);
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (await verifyHlsStreamLive(candidate)) {
      const remaining = candidates.filter((_, idx) => idx !== i);
      return {
        ...ch,
        streamUrl: candidate,
        alternateUrls: remaining.length > 0 ? remaining : undefined,
      };
    }
  }
  if (ch.embedUrl) {
    return ch;
  }
  return null;
}

async function collectVerifiedChannels(
  list: TvChannel[],
  targetCount: number,
): Promise<{ verified: TvChannel[]; scannedCount: number }> {
  const verified: TvChannel[] = [];
  const batchSize = 36;
  const maxToScan = Math.min(list.length, Math.max(128, targetCount * 3));
  const maxBudgetMs = process.env.VERCEL ? 7500 : 12000;
  const startedAt = Date.now();
  let scannedCount = 0;

  while (scannedCount < maxToScan && verified.length < targetCount) {
    if (scannedCount > 0 && Date.now() - startedAt >= maxBudgetMs) break;
    const slice = list.slice(scannedCount, scannedCount + batchSize);
    scannedCount += slice.length;
    const results = await Promise.all(slice.map((ch) => resolveVerifiedTvChannel(ch)));
    for (const item of results) {
      if (item) verified.push(item);
    }
  }

  return { verified, scannedCount };
}

app.get('/api/tv/channels', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const country = String(req.query.country || 'ALL').trim().toUpperCase();
    const category = String(req.query.category || 'all').trim().toLowerCase();
    const verifiedOnly = req.query.verified !== '0';
    const limit = Math.min(120, Math.max(4, Number(req.query.limit) || 48));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const data = await buildTvCatalog();
    let filtered = data.channels;

    if (country && country !== 'ALL') {
      filtered = filtered.filter((ch) => ch.countryCode === country);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter((ch) =>
        ch.categories.some((cat) => cat.toLowerCase() === category),
      );
    }
    if (q) {
      filtered = filtered.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          (ch.description && ch.description.toLowerCase().includes(q)) ||
          ch.countryName.toLowerCase().includes(q) ||
          ch.categories.some((cat) => cat.toLowerCase().includes(q)),
      );
    }

    if (!verifiedOnly) {
      return res.json({
        total: filtered.length,
        totalWorldwide: data.channels.length,
        channels: filtered.slice(offset, offset + limit),
        countries: data.countries,
        categories: data.categories,
        categoryMeta: TV_CATEGORY_META,
      });
    }

    const { verified, scannedCount } = await collectVerifiedChannels(filtered, offset + limit);
    const hasUnscanned = scannedCount < filtered.length;
    const effectiveTotal = hasUnscanned
      ? Math.max(verified.length + (filtered.length - scannedCount > 0 ? limit : 0), verified.length)
      : verified.length;

    res.json({
      total: effectiveTotal,
      totalWorldwide: data.channels.length,
      channels: verified.slice(offset, offset + limit),
      countries: data.countries,
      categories: data.categories,
      categoryMeta: TV_CATEGORY_META,
    });
  } catch {
    res.json({
      total: VERIFIED_FEATURED_TV.length,
      totalWorldwide: VERIFIED_FEATURED_TV.length,
      channels: VERIFIED_FEATURED_TV,
      countries: [],
      categories: [],
      categoryMeta: TV_CATEGORY_META,
    });
  }
});

// 8. Smart HLS (.m3u8 + CMAF/TS segment) CORS Proxy for Live TV streams
app.options('/api/tv/proxy', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.status(204).end();
});

app.get('/api/tv/proxy', async (req: Request, res: Response) => {
  const targetUrl = String(req.query.url || '').trim();
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).send('Invalid TV stream URL');
  }
  if (!isSafePublicHttpUrl(targetUrl)) {
    return res.status(403).send('Blocked private or unsupported URL');
  }

  try {
    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    if (req.headers.range) {
      forwardHeaders.Range = String(req.headers.range);
    }

    const upstream = await fetchWithHandshakeTimeout(
      targetUrl,
      {
        headers: forwardHeaders,
        redirect: 'follow',
      },
      req,
      15000,
    );

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send('TV stream unavailable');
    }

    const finalUrl = (upstream.url || targetUrl).toLowerCase();
    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const isPlaylist =
      contentType.includes('mpegurl') ||
      contentType.includes('m3u') ||
      finalUrl.includes('.m3u8') ||
      targetUrl.toLowerCase().includes('.m3u8');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (isPlaylist) {
      const text = await upstream.text();
      const baseUrl = upstream.url || targetUrl;
      if (text.trimStart().startsWith('#EXTM3U')) {
        const proxiedLines = text.split(/\r?\n/).map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith('#')) {
            return line
              .replace(/URI="([^"]+)"/gi, (_m, uri) => {
                try {
                  const abs = new URL(uri, baseUrl).toString();
                  return `URI="/api/tv/proxy?url=${encodeURIComponent(abs)}"`;
                } catch {
                  return `URI="${uri}"`;
                }
              })
              .replace(/URI='([^']+)'/gi, (_m, uri) => {
                try {
                  const abs = new URL(uri, baseUrl).toString();
                  return `URI='/api/tv/proxy?url=${encodeURIComponent(abs)}'`;
                } catch {
                  return `URI='${uri}'`;
                }
              });
          }
          try {
            const abs = new URL(trimmed, baseUrl).toString();
            return `/api/tv/proxy?url=${encodeURIComponent(abs)}`;
          } catch {
            return line;
          }
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        return res.send(proxiedLines.join('\n'));
      }
      if (contentType) res.setHeader('Content-Type', contentType);
      return res.send(text);
    }

    res.status(upstream.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    if (!upstream.body) return res.end();
    const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.on('error', () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });
    nodeStream.pipe(res);
  } catch {
    if (!res.headersSent) {
      res.status(502).send('Live TV relay failed');
    }
  }
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ error: message });
    return;
  }
  res.status(500).send('Internal server error');
});

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Soundmark listening on http://0.0.0.0:${PORT}`);
    // Pre-warm live TV catalog & top streams across all 24 categories in the background
    buildTvCatalog()
      .then(async (cat) => {
        const rw = cat.channels.filter((c) => c.countryCode === 'RW');
        await collectVerifiedChannels(cat.channels, 48);
        if (rw.length > 0) await collectVerifiedChannels(rw, rw.length);
        for (const coreCat of CORE_TV_CATEGORIES) {
          const subset = cat.channels.filter((c) =>
            c.categories.some((x) => x.toLowerCase() === coreCat),
          );
          if (subset.length > 0) {
            await collectVerifiedChannels(subset, 24);
          }
        }
      })
      .catch(() => {});
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
