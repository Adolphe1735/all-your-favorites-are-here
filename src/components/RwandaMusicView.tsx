import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Search,
  Play,
  CheckCircle2,
  Radio,
  Disc3,
  ArrowRight,
  Music2,
  UserPlus,
  Shuffle,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react';
import type { ArtistSummary, MusicTrack, UserPlaylist } from '../types/music';
import { fetchJsonChecked, normalizeError, type AppErrorInfo } from '../utils/errors';
import { CoverArtwork } from './CoverArtwork';
import { ErrorNotice } from './ErrorNotice';
import { TrackTable } from './TrackTable';

interface RwandaMusicResponse {
  artists: ArtistSummary[];
  totalArtists: number;
  categoryCounts?: Record<string, number>;
  categoryDescriptions?: Record<string, string>;
  categories: string[];
  liveRadio: MusicTrack[];
  trendingTracks: MusicTrack[];
}

interface RwandaMusicViewProps {
  currentTrackId: string | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  userPlaylists: UserPlaylist[];
  onPlayTrack: (track: MusicTrack, contextTracks?: MusicTrack[]) => void;
  onPlayAll: (tracks: MusicTrack[]) => void;
  onTogglePlayPause: () => void;
  onToggleLike: (track: MusicTrack) => void;
  onAddToPlaylist: (playlistId: string, track: MusicTrack) => void;
  onAddToQueue: (track: MusicTrack) => void;
  onOpenStoreModal: (track: MusicTrack) => void;
  onOpenLyrics: (track: MusicTrack) => void;
  onOpenSpotifyEmbed: (track: MusicTrack) => void;
  onSelectArtist: (artistId: string, artistName?: string) => void;
  onSearchRwandaCatalog: (query: string) => void;
  onCacheTracks: (tracks: MusicTrack[]) => void;
}

const DEFAULT_CATEGORIES = [
  'All',
  'Afropop & R&B',
  'Hip-Hop & Kinyatrap',
  'Gakondo & Classics',
  'Gospel & Choirs',
  'DJs & Producers',
];

const LETTER_RANGES = [
  { id: 'all', label: 'All A–Z', test: () => true },
  { id: 'a-e', label: 'A–E', test: (name: string) => /^[a-e]/i.test(name.trim()) },
  { id: 'f-j', label: 'F–J', test: (name: string) => /^[f-j]/i.test(name.trim()) },
  { id: 'k-o', label: 'K–O', test: (name: string) => /^[k-o]/i.test(name.trim()) },
  { id: 'p-t', label: 'P–T', test: (name: string) => /^[p-t]/i.test(name.trim()) },
  { id: 'u-z', label: 'U–Z', test: (name: string) => /^[u-z]/i.test(name.trim()) },
] as const;

type SortMode = 'featured' | 'az' | 'hits';
type DirectoryLayout = 'cards' | 'index';

export function RwandaMusicView({
  currentTrackId,
  isPlaying,
  likedTrackIds,
  userPlaylists,
  onPlayTrack,
  onPlayAll,
  onTogglePlayPause,
  onToggleLike,
  onAddToPlaylist,
  onAddToQueue,
  onOpenStoreModal,
  onOpenLyrics,
  onOpenSpotifyEmbed,
  onSelectArtist,
  onSearchRwandaCatalog,
  onCacheTracks,
}: RwandaMusicViewProps) {
  const [data, setData] = useState<RwandaMusicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppErrorInfo | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<AppErrorInfo | null>(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [letterRange, setLetterRange] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<DirectoryLayout>('cards');
  const [directoryExpanded, setDirectoryExpanded] = useState(true);
  const [loadedCategories, setLoadedCategories] = useState<Record<string, MusicTrack[]>>({});
  const categoryAbortRef = useRef<AbortController | null>(null);

  const loadRwandaHub = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchJsonChecked<RwandaMusicResponse>('/api/music/rwanda', {
          context: 'Rwanda Music Archive',
          signal,
        });
        setData(res);
        onCacheTracks([...(res.trendingTracks || []), ...(res.liveRadio || [])]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(normalizeError(err, 'Rwanda Music Archive'));
        setData({
          artists: [],
          totalArtists: 0,
          categories: DEFAULT_CATEGORIES,
          liveRadio: [],
          trendingTracks: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [onCacheTracks],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadRwandaHub(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadRwandaHub]);

  const categories = data?.categories?.length ? data.categories : DEFAULT_CATEGORIES;

  const computedCategoryCounts = useMemo(() => {
    if (data?.categoryCounts) return data.categoryCounts;
    const list = data?.artists || [];
    const counts: Record<string, number> = { All: list.length };
    for (const c of categories) {
      if (c !== 'All') counts[c] = 0;
    }
    for (const artist of list) {
      if (artist.genre && Object.prototype.hasOwnProperty.call(counts, artist.genre)) {
        counts[artist.genre] += 1;
      }
    }
    return counts;
  }, [data?.categoryCounts, data?.artists, categories]);

  useEffect(() => {
    return () => {
      categoryAbortRef.current?.abort();
    };
  }, []);

  const handleSelectCategory = (nextCat: string) => {
    setCategory(nextCat);
    setLetterRange('all');
    setDirectoryExpanded(true);
    setCategoryError(null);
    categoryAbortRef.current?.abort();

    if (nextCat !== 'All' && !loadedCategories[nextCat]) {
      const controller = new AbortController();
      categoryAbortRef.current = controller;
      setCategoryLoading(true);
      fetchJsonChecked<RwandaMusicResponse>(
        `/api/music/rwanda?category=${encodeURIComponent(nextCat)}`,
        { context: `${nextCat} tracks`, signal: controller.signal },
      )
        .then((res) => {
          if (controller.signal.aborted) return;
          const catTracks = (res.trendingTracks || []).filter(
            (t) => (t.genre || '').toLowerCase() === nextCat.toLowerCase(),
          );
          if (catTracks.length > 0) {
            onCacheTracks(catTracks);
            setLoadedCategories((prev) => ({ ...prev, [nextCat]: catTracks }));
          }
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setCategoryError(normalizeError(err, `${nextCat} tracks`));
        })
        .finally(() => {
          if (categoryAbortRef.current === controller) {
            setCategoryLoading(false);
          }
        });
    } else {
      setCategoryLoading(false);
    }
  };

  const filteredArtists = useMemo(() => {
    const list = data?.artists || [];
    const q = query.trim().toLowerCase();
    const rangeMatcher =
      LETTER_RANGES.find((r) => r.id === letterRange)?.test || (() => true);

    const matched = list.filter((artist) => {
      const catOk =
        category === 'All' || (artist.genre || '').toLowerCase() === category.toLowerCase();
      if (!catOk) return false;
      if (!rangeMatcher(artist.name)) return false;
      if (!q) return true;
      return (
        artist.name.toLowerCase().includes(q) ||
        (artist.genre && artist.genre.toLowerCase().includes(q)) ||
        (artist.bio && artist.bio.toLowerCase().includes(q)) ||
        (artist.label && artist.label.toLowerCase().includes(q)) ||
        (artist.location && artist.location.toLowerCase().includes(q)) ||
        (artist.signatureTracks &&
          artist.signatureTracks.some((s) => s.toLowerCase().includes(q)))
      );
    });

    if (sortMode === 'az') {
      return [...matched].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortMode === 'hits') {
      return [...matched].sort(
        (a, b) => (b.signatureTracks?.length || 0) - (a.signatureTracks?.length || 0),
      );
    }
    return matched;
  }, [data?.artists, category, query, letterRange, sortMode]);

  const filteredTrending = useMemo(() => {
    const base = data?.trendingTracks || [];
    const extra = category !== 'All' ? loadedCategories[category] || [] : [];
    const combinedMap = new Map<string, MusicTrack>();
    for (const t of [...extra, ...base]) {
      if (!combinedMap.has(t.id)) combinedMap.set(t.id, t);
    }
    const combined = Array.from(combinedMap.values());

    const byCategory =
      category === 'All'
        ? combined
        : combined.filter((t) => (t.genre || '').toLowerCase() === category.toLowerCase());

    const activeList = byCategory.length > 0 ? byCategory : combined;
    const q = query.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q),
    );
  }, [data?.trendingTracks, loadedCategories, category, query]);

  const activeCategoryDescription =
    data?.categoryDescriptions?.[category] ||
    'Explore verified Rwandan artists, signature hits, and full discographies.';

  const handleLookupSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (filteredArtists.length === 1) {
      onSelectArtist(filteredArtists[0].id, filteredArtists[0].name);
      return;
    }
    if (filteredArtists.length === 0) {
      onSelectArtist(`rw-lookup-${encodeURIComponent(trimmed)}`, trimmed);
    }
  };

  const handlePickRandomArtist = () => {
    if (filteredArtists.length === 0) return;
    const chosen = filteredArtists[Math.floor(Math.random() * filteredArtists.length)];
    onSelectArtist(chosen.id, chosen.name);
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <section className="border-b border-[var(--sm-border)] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs font-mono text-[var(--sm-text-muted)] tabular-nums">
            Rwanda Music Archive · {data?.totalArtists || 200}+ Verified Artists ·{' '}
            {filteredTrending.length} Full Songs · {data?.liveRadio?.length || 0} Live FM Stations
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--sm-text)]">
            Abahanzi bo mu Rwanda
          </h1>
          <p className="text-xs sm:text-sm text-[var(--sm-text-sec)] max-w-2xl leading-relaxed">
            Explore every Rwandan artist across Afropop, R&amp;B, Kinyatrap, Hip-Hop, Gakondo heritage, Gospel choirs, and DJs — click any category or artist to stream full-length songs.
          </p>
        </div>

        {filteredTrending.length > 0 && (
          <button
            type="button"
            onClick={() => onPlayAll(filteredTrending)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs sm:text-sm font-semibold hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <Play size={15} fill="currentColor" />
            <span>
              {category === 'All' ? 'Play Rwanda Top Mix' : `Play ${category} Mix`}
            </span>
          </button>
        )}
      </section>

      {/* Search & Custom Artist/Song Lookup */}
      <section className="space-y-4">
        <form onSubmit={handleLookupSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sm-text-muted)]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Shakisha umuhanzi, label, cyangwa indirimbo (e.g. Bruce Melodie, Katerina, Kina Music, Bushali, Israel Mbonyi)..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-[var(--sm-surface)] border border-[var(--sm-border)] text-sm text-[var(--sm-text)] placeholder:text-[var(--sm-text-muted)] focus:outline-none focus:border-[var(--sm-accent)]"
            />
          </div>
          {query.trim() && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onSelectArtist(
                    filteredArtists[0]?.id || `rw-lookup-${encodeURIComponent(query.trim())}`,
                    filteredArtists[0]?.name || query.trim(),
                  )
                }
                className="h-10 px-4 rounded-lg bg-[var(--sm-contrast-bg)] text-[var(--sm-contrast-text)] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap hover:opacity-90"
              >
                <UserPlus size={14} />
                <span>Open "{query.trim()}" Songs</span>
              </button>
              <button
                type="button"
                onClick={() => onSearchRwandaCatalog(query.trim())}
                className="h-10 px-4 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] text-xs font-medium text-[var(--sm-text)] inline-flex items-center gap-1.5 whitespace-nowrap hover:bg-[var(--sm-muted)]"
              >
                <Music2 size={14} />
                <span>Find Song</span>
              </button>
            </div>
          )}
        </form>

        {/* Genre / Era Tabs with Live Counts */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const active = category === cat;
            const count = computedCategoryCounts[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 tabular-nums ${
                  active
                    ? 'border-[var(--sm-accent)] bg-[var(--sm-accent)] text-[var(--sm-on-accent)] font-semibold'
                    : 'border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:border-[var(--sm-text-muted)]'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[11px] font-mono ${
                    active ? 'opacity-90' : 'text-[var(--sm-text-muted)]'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Rwandan Artists Directory with Rich Category Spotlight & Controls */}
      <section className="space-y-4">
        <div className="border border-[var(--sm-border)] rounded-xl bg-[var(--sm-surface)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDirectoryExpanded((prev) => !prev)}
                  className="text-left group inline-flex items-center gap-2.5"
                >
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--sm-text)] group-hover:text-[var(--sm-accent-text)] transition-colors tabular-nums">
                    Rwandan Artists Directory ({filteredArtists.length})
                  </h2>
                  <span className="text-xs font-mono text-[var(--sm-text-muted)] whitespace-nowrap">
                    {directoryExpanded ? 'Hide Grid' : 'Show Grid'}
                  </span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-[var(--sm-text-sec)] max-w-3xl leading-relaxed">
                {activeCategoryDescription}
              </p>
            </div>

            {/* High-Value Directory Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {filteredTrending.length > 0 && (
                <button
                  type="button"
                  onClick={() => onPlayAll(filteredTrending)}
                  className="h-9 px-3.5 rounded-lg bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap hover:opacity-90"
                >
                  <Play size={13} fill="currentColor" />
                  <span>
                    {category === 'All' ? 'Play Directory Mix' : `Play ${category}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePickRandomArtist}
                disabled={filteredArtists.length === 0}
                className="h-9 px-3.5 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-bg)] text-xs font-medium text-[var(--sm-text)] inline-flex items-center gap-1.5 whitespace-nowrap hover:border-[var(--sm-accent)] disabled:opacity-40"
              >
                <Shuffle size={13} />
                <span>Surprise Artist</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSortMode((prev) =>
                    prev === 'featured' ? 'az' : prev === 'az' ? 'hits' : 'featured',
                  )
                }
                className="h-9 px-3 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-bg)] text-xs font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowUpDown size={13} />
                <span>
                  Sort:{' '}
                  {sortMode === 'featured'
                    ? 'Featured'
                    : sortMode === 'az'
                      ? 'A–Z'
                      : 'Signature Hits'}
                </span>
              </button>

              <div className="flex items-center border border-[var(--sm-border)] rounded-lg bg-[var(--sm-bg)] p-0.5">
                <button
                  type="button"
                  onClick={() => setLayoutMode('cards')}
                  aria-label="Card layout"
                  className={`h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap transition-colors ${
                    layoutMode === 'cards'
                      ? 'bg-[var(--sm-surface)] text-[var(--sm-text)] shadow-xs'
                      : 'text-[var(--sm-text-muted)] hover:text-[var(--sm-text)]'
                  }`}
                >
                  <LayoutGrid size={13} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('index')}
                  aria-label="Compact index layout"
                  className={`h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap transition-colors ${
                    layoutMode === 'index'
                      ? 'bg-[var(--sm-surface)] text-[var(--sm-text)] shadow-xs'
                      : 'text-[var(--sm-text-muted)] hover:text-[var(--sm-text)]'
                  }`}
                >
                  <List size={13} />
                  <span>Index</span>
                </button>
              </div>
            </div>
          </div>

          {/* A–Z Quick Jump + Live Directory Summary Metrics */}
          <div className="pt-3 border-t border-[var(--sm-border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {LETTER_RANGES.map((range) => {
                const active = letterRange === range.id;
                return (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setLetterRange(range.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--sm-contrast-bg)] text-[var(--sm-contrast-text)] font-semibold'
                        : 'text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:bg-[var(--sm-muted)]'
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs font-mono text-[var(--sm-text-muted)] tabular-nums">
              Showing {filteredArtists.length} of {data?.totalArtists || filteredArtists.length}{' '}
              artists · {filteredTrending.length} playable songs in view
            </div>
          </div>
        </div>

        {directoryExpanded && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-[var(--sm-muted)]" />
                ))}
              </div>
            ) : error ? (
              <ErrorNotice
                error={error}
                variant="card"
                onRetry={() => loadRwandaHub()}
                onDismiss={() => setError(null)}
              />
            ) : filteredArtists.length === 0 ? (
              <div className="border border-[var(--sm-border)] rounded-xl bg-[var(--sm-surface)] p-8 text-center space-y-3">
                <Disc3 size={28} className="mx-auto text-[var(--sm-text-muted)]" />
                <div className="text-sm font-medium text-[var(--sm-text)]">
                  No cached artist matched "{query || letterRange}" in {category}
                </div>
                <p className="text-xs text-[var(--sm-text-sec)]">
                  Reset the letter filter or open any artist directly to resolve their full catalog of songs across Soundmark networks.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {letterRange !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setLetterRange('all')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-bg)] text-xs font-medium text-[var(--sm-text)] hover:border-[var(--sm-accent)]"
                    >
                      <span>Show All Letters</span>
                    </button>
                  )}
                  {query.trim() && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectArtist(
                          `rw-lookup-${encodeURIComponent(query.trim())}`,
                          query.trim(),
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold hover:opacity-90"
                    >
                      <span>Load All Songs for "{query.trim()}"</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ) : layoutMode === 'index' ? (
              <div className="border border-[var(--sm-border)] rounded-xl bg-[var(--sm-surface)] divide-y divide-[var(--sm-border)]">
                {filteredArtists.map((artist, idx) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => onSelectArtist(artist.id, artist.name)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--sm-muted)]/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-7 text-xs font-mono text-[var(--sm-text-muted)] tabular-nums shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[var(--sm-text)] truncate group-hover:text-[var(--sm-accent-text)]">
                            {artist.name}
                          </span>
                          {artist.verified && (
                            <CheckCircle2
                              size={13}
                              className="text-[var(--sm-accent-text)] shrink-0"
                            />
                          )}
                        </div>
                        <div className="text-xs text-[var(--sm-text-muted)] truncate">
                          {artist.genre || 'Rwandan Artist'} · {artist.location}
                          {artist.label ? ` · ${artist.label}` : ''}
                          {artist.signatureTracks?.length
                            ? ` · Hits: ${artist.signatureTracks.slice(0, 3).join(', ')}`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[var(--sm-text-sec)] group-hover:text-[var(--sm-accent-text)] inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                      <span>Open Songs</span>
                      <ArrowRight size={13} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredArtists.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => onSelectArtist(artist.id, artist.name)}
                    className="group text-left border border-[var(--sm-border)] rounded-2xl bg-[var(--sm-surface)] p-4 flex flex-col justify-between gap-3 hover:border-[var(--sm-accent)] transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-[var(--sm-border)] bg-[var(--sm-muted)]">
                        <CoverArtwork
                          src={artist.avatarUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          roundedClassName="rounded-none"
                          sizeIcon={18}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[var(--sm-text)] truncate group-hover:text-[var(--sm-accent-text)] transition-colors">
                            {artist.name}
                          </span>
                          {artist.verified && (
                            <CheckCircle2
                              size={13}
                              className="text-[var(--sm-accent-text)] shrink-0"
                            />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--sm-text-muted)] truncate">
                          {artist.genre || 'Rwandan Artist'} · {artist.location}
                        </div>
                        {(artist.label || artist.era) && (
                          <div className="text-[11px] text-[var(--sm-accent-text)] truncate">
                            {[artist.label, artist.era].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {artist.bio && (
                      <p className="text-xs text-[var(--sm-text-sec)] line-clamp-2 leading-snug">
                        {artist.bio}
                      </p>
                    )}

                    <div className="pt-2 border-t border-[var(--sm-border)] flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-[var(--sm-text-muted)] truncate">
                        {artist.signatureTracks?.length
                          ? `Hits: ${artist.signatureTracks.slice(0, 2).join(' · ')}`
                          : artist.sourceLabel}
                      </span>
                      <span className="font-medium text-[var(--sm-text-sec)] group-hover:text-[var(--sm-accent-text)] inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        <span>Full Catalog</span>
                        <ArrowRight size={11} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {categoryError && (
        <ErrorNotice
          error={categoryError}
          variant="banner"
          onRetry={() => handleSelectCategory(category)}
          onDismiss={() => setCategoryError(null)}
        />
      )}

      {/* Rwanda Top Songs Showcase (Synced with Selected Category) */}
      {!loading && (filteredTrending.length > 0 || categoryLoading) && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--sm-text)] tabular-nums">
                {category === 'All'
                  ? `Indirimbo zikunzwe mu Rwanda (${filteredTrending.length})`
                  : `${category} — Top Playable Songs (${filteredTrending.length})`}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--sm-text-sec)]">
                {categoryLoading
                  ? `Loading full-length ${category} releases...`
                  : 'Full-length hits and classics ready for instant listening and queueing'}
              </p>
            </div>
            {filteredTrending.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayAll(filteredTrending)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sm-accent-text)] hover:underline tabular-nums"
              >
                <Play size={13} fill="currentColor" />
                <span>Play All ({filteredTrending.length})</span>
              </button>
            )}
          </div>

          <TrackTable
            tracks={filteredTrending}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            userPlaylists={userPlaylists}
            onPlayTrack={onPlayTrack}
            onTogglePlayPause={onTogglePlayPause}
            onToggleLike={onToggleLike}
            onAddToPlaylist={onAddToPlaylist}
            onAddToQueue={onAddToQueue}
            onOpenStoreModal={onOpenStoreModal}
            onOpenLyrics={onOpenLyrics}
            onOpenSpotifyEmbed={onOpenSpotifyEmbed}
            onSelectArtist={onSelectArtist}
          />
        </section>
      )}

      {/* Live Rwanda FM Radio */}
      {!loading && data && data.liveRadio.length > 0 && (
        <section className="space-y-4 pt-2 border-t border-[var(--sm-border)]">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--sm-text)]">
              Radiyo zo mu Rwanda (Live FM)
            </h2>
            <p className="text-xs sm:text-sm text-[var(--sm-text-sec)]">
              Real-time FM broadcasts direct from Kigali and across Rwanda
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.liveRadio.map((station) => {
              const active = currentTrackId === station.id;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() =>
                    active ? onTogglePlayPause() : onPlayTrack(station, data.liveRadio)
                  }
                  className={`text-left p-4 rounded-xl border transition-colors flex items-center gap-3.5 ${
                    active
                      ? 'border-[var(--sm-accent)] bg-[var(--sm-muted)]'
                      : 'border-[var(--sm-border)] bg-[var(--sm-surface)] hover:border-[var(--sm-text-muted)]'
                  }`}
                >
                  <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-[var(--sm-border)]">
                    <CoverArtwork
                      src={station.coverUrl}
                      alt={station.title}
                      roundedClassName="rounded-none"
                      sizeIcon={18}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#15803D] dark:text-emerald-400">
                      <Radio size={11} />
                      <span className="truncate">
                        {station.stationNumber ? `#${station.stationNumber} · ` : ''}
                        LIVE ·{' '}
                        {station.frequency && station.frequency !== '—'
                          ? station.frequency
                          : 'RWANDA'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[var(--sm-text)] truncate">
                      {station.title}
                    </div>
                    <div className="text-xs text-[var(--sm-text-muted)] truncate">
                      {station.programs || station.genre}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
