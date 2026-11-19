import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Radio,
  Search,
  Play,
  Pause,
  Heart,
  RefreshCw,
  Shuffle,
  SlidersHorizontal,
  ListPlus,
  Check,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import type { MusicTrack } from '../types/music';
import { fetchJsonChecked, normalizeError, type AppErrorInfo } from '../utils/errors';
import { CoverArtwork } from './CoverArtwork';
import { ErrorNotice } from './ErrorNotice';

interface RadioGenreOption {
  id: string;
  label: string;
}

const DEFAULT_RADIO_GENRES: RadioGenreOption[] = [
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

const DEFAULT_RADIO_COUNTRIES = [
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

interface RadioViewProps {
  initialQuery?: string;
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onPlayStation: (station: MusicTrack, contextStations?: MusicTrack[]) => void;
  onTogglePlayPause: () => void;
  onAddToQueue: (station: MusicTrack) => void;
  onOpenListeningRoom: () => void;
  onCacheTracks: (tracks: MusicTrack[]) => void;
}

function loadRadioFavorites(): string[] {
  try {
    const raw = localStorage.getItem('soundmark_radio_favorites');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function RadioView({
  initialQuery = '',
  currentTrack,
  isPlaying,
  onPlayStation,
  onTogglePlayPause,
  onAddToQueue,
  onOpenListeningRoom,
  onCacheTracks,
}: RadioViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [country, setCountry] = useState('All Countries');
  const [genreTag, setGenreTag] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [stations, setStations] = useState<MusicTrack[]>([]);
  const [countries, setCountries] = useState<string[]>(DEFAULT_RADIO_COUNTRIES);
  const [genres, setGenres] = useState<RadioGenreOption[]>(DEFAULT_RADIO_GENRES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppErrorInfo | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadRadioFavorites);
  const [queuedFlashId, setQueuedFlashId] = useState<string | null>(null);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const prevInitialQueryRef = useRef(initialQuery);

  useEffect(() => {
    localStorage.setItem('soundmark_radio_favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const fetchStations = useCallback(
    async (queryOverride?: string) => {
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setLoading(true);
      setError(null);

      const activeQuery = (queryOverride !== undefined ? queryOverride : query).trim();

      try {
        const params = new URLSearchParams({
          q: activeQuery,
          country,
          tag: genreTag,
          limit: '36',
        });
        const data = await fetchJsonChecked<{
          stations?: MusicTrack[];
          countries?: string[];
          genres?: RadioGenreOption[];
        }>(`/api/music/radio?${params.toString()}`, {
          context: 'Live world radio',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const list = data.stations || [];
        setStations(list);
        if (list.length > 0) onCacheTracks(list);
        if (Array.isArray(data.countries) && data.countries.length > 0) {
          setCountries(data.countries);
        }
        if (Array.isArray(data.genres) && data.genres.length > 0) {
          setGenres(data.genres);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setStations([]);
        setError(normalizeError(err, 'Live world radio'));
      } finally {
        if (fetchAbortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [query, country, genreTag, onCacheTracks],
  );

  useEffect(() => {
    const changed = initialQuery !== prevInitialQueryRef.current;
    prevInitialQueryRef.current = initialQuery;
    if (changed) {
      setQuery(initialQuery);
      fetchStations(initialQuery);
    } else {
      fetchStations();
    }
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, [country, genreTag, initialQuery]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const displayedStations = useMemo(() => {
    if (!favoritesOnly) return stations;
    return stations.filter((s) => favoriteSet.has(s.id));
  }, [stations, favoritesOnly, favoriteSet]);

  const activeRadioStation = currentTrack?.isLive ? currentTrack : null;
  const activeIndex = useMemo(() => {
    if (!activeRadioStation) return -1;
    return displayedStations.findIndex((s) => s.id === activeRadioStation.id);
  }, [activeRadioStation, displayedStations]);

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
    );
  };

  const handleTuneRandom = () => {
    if (displayedStations.length === 0) return;
    const pool =
      displayedStations.length > 1 && activeRadioStation
        ? displayedStations.filter((s) => s.id !== activeRadioStation.id)
        : displayedStations;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    onPlayStation(pick, displayedStations);
  };

  const handlePrevStation = () => {
    if (displayedStations.length === 0) return;
    const prevIdx =
      activeIndex > 0 ? activeIndex - 1 : displayedStations.length - 1;
    onPlayStation(displayedStations[prevIdx], displayedStations);
  };

  const handleNextStation = () => {
    if (displayedStations.length === 0) return;
    const nextIdx =
      activeIndex >= 0 && activeIndex < displayedStations.length - 1
        ? activeIndex + 1
        : 0;
    onPlayStation(displayedStations[nextIdx], displayedStations);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchStations(query);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-medium text-[var(--sm-text-muted)] mb-1">
            Worldwide FM &amp; Internet Broadcasts · Audio Only
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--sm-text)]">
            Live Radio Tuner
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFavoritesOnly(false);
              setCountry((prev) => (prev === 'Rwanda' ? 'All Countries' : 'Rwanda'));
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              country === 'Rwanda'
                ? 'border-[var(--sm-accent)] bg-[var(--sm-accent-soft)] text-[var(--sm-accent-text)]'
                : 'border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]'
            }`}
          >
            <span>🇷🇼</span>
            <span>Rwanda FM Radio</span>
          </button>

          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              favoritesOnly
                ? 'border-[var(--sm-accent)] bg-[var(--sm-accent-soft)] text-[var(--sm-accent-text)]'
                : 'border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]'
            }`}
          >
            <Heart size={13} fill={favoritesOnly ? 'currentColor' : 'none'} />
            <span>Saved ({favoriteIds.length})</span>
          </button>

          <button
            type="button"
            onClick={handleTuneRandom}
            disabled={displayedStations.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] text-xs font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] disabled:opacity-40 whitespace-nowrap"
          >
            <Shuffle size={13} />
            <span>Random Station</span>
          </button>

          <button
            type="button"
            onClick={() => fetchStations(query)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] text-xs font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] whitespace-nowrap"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dedicated Radio Tuner Console */}
      <section className="rounded-2xl border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        {activeRadioStation ? (
          <>
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-[var(--sm-border)] bg-[var(--sm-bg)]">
                <CoverArtwork
                  src={activeRadioStation.coverUrl}
                  alt={activeRadioStation.title}
                  roundedClassName="rounded-none"
                  sizeIcon={24}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#15803D] dark:text-emerald-400">
                  <Radio size={12} className={isPlaying ? 'animate-pulse' : ''} />
                  <span>
                    {isPlaying ? 'ON AIR' : 'TUNED (PAUSED)'} · {activeRadioStation.country} ·{' '}
                    {activeRadioStation.bitrateLabel || 'Live Stream'}
                  </span>
                </div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--sm-text)] truncate">
                  {activeRadioStation.title}
                </h2>
                <p className="text-xs text-[var(--sm-text-sec)] truncate">
                  {activeRadioStation.genre} · {activeRadioStation.album}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrevStation}
                disabled={displayedStations.length === 0}
                aria-label="Previous radio station"
                className="p-2.5 rounded-lg border border-[var(--sm-border)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:bg-[var(--sm-muted)] disabled:opacity-40"
              >
                <SkipBack size={15} />
              </button>

              <button
                type="button"
                onClick={onTogglePlayPause}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold hover:opacity-90 whitespace-nowrap"
              >
                {isPlaying ? (
                  <>
                    <Pause size={14} fill="currentColor" />
                    <span>Pause Radio</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    <span>Resume Radio</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNextStation}
                disabled={displayedStations.length === 0}
                aria-label="Next radio station"
                className="p-2.5 rounded-lg border border-[var(--sm-border)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:bg-[var(--sm-muted)] disabled:opacity-40"
              >
                <SkipForward size={15} />
              </button>

              <button
                type="button"
                onClick={() => toggleFavorite(activeRadioStation.id)}
                aria-label="Save radio station"
                className={`p-2.5 rounded-lg border border-[var(--sm-border)] ${
                  favoriteSet.has(activeRadioStation.id)
                    ? 'text-[var(--sm-accent-text)]'
                    : 'text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]'
                }`}
              >
                <Heart
                  size={15}
                  fill={favoriteSet.has(activeRadioStation.id) ? 'currentColor' : 'none'}
                />
              </button>

              <button
                type="button"
                onClick={onOpenListeningRoom}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[var(--sm-border)] text-xs font-medium text-[var(--sm-text)] hover:bg-[var(--sm-muted)] whitespace-nowrap"
              >
                <SlidersHorizontal size={14} />
                <span>EQ &amp; Visualizer</span>
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[var(--sm-accent-soft)] text-[var(--sm-accent-text)] flex items-center justify-center shrink-0">
                <Volume2 size={22} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--sm-text)]">
                  Ready to Tune Live Radio
                </h2>
                <p className="text-xs text-[var(--sm-text-sec)]">
                  Pick any FM or internet station below to start streaming live radio with 5-band EQ support.
                </p>
              </div>
            </div>
            {displayedStations.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayStation(displayedStations[0], displayedStations)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold hover:opacity-90 whitespace-nowrap"
              >
                <Play size={14} fill="currentColor" />
                <span>Play {displayedStations[0].title}</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Search, Country Select & Radio Genre Pills */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sm-text-muted)]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search radio stations by name, FM frequency, city, or tag..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-[var(--sm-surface)] border border-[var(--sm-border)] text-sm text-[var(--sm-text)] placeholder:text-[var(--sm-text-muted)] focus:outline-none focus:border-[var(--sm-accent)]"
            />
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Filter radio stations by country"
            className="h-10 px-3 rounded-lg bg-[var(--sm-surface)] border border-[var(--sm-border)] text-xs font-medium text-[var(--sm-text)] sm:w-56 focus:outline-none focus:border-[var(--sm-accent)]"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 px-5 rounded-lg bg-[var(--sm-contrast-bg)] text-[var(--sm-contrast-text)] text-xs font-medium whitespace-nowrap hover:opacity-90"
          >
            Search Radio
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          {genres.map((g) => {
            const active = genreTag === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setFavoritesOnly(false);
                  setGenreTag(g.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[var(--sm-accent)] bg-[var(--sm-accent)] text-[var(--sm-on-accent)] font-semibold'
                    : 'border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:border-[var(--sm-text-muted)]'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stations Directory */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <div key={n} className="h-24 rounded-xl bg-[var(--sm-muted)]" />
          ))}
        </div>
      ) : error ? (
        <ErrorNotice
          error={error}
          variant="card"
          onRetry={() => fetchStations(query)}
          onDismiss={() => setError(null)}
        />
      ) : displayedStations.length === 0 ? (
        <div className="border border-[var(--sm-border)] rounded-xl bg-[var(--sm-surface)] p-10 text-center space-y-3">
          <p className="text-sm text-[var(--sm-text-sec)]">
            No live radio stations matched your current filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCountry('All Countries');
              setGenreTag('all');
              setFavoritesOnly(false);
            }}
            className="px-4 py-2 rounded-lg bg-[var(--sm-contrast-bg)] text-[var(--sm-contrast-text)] text-xs font-medium"
          >
            Reset Radio Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedStations.map((station) => {
            const active = currentTrack?.id === station.id;
            const saved = favoriteSet.has(station.id);
            const queued = queuedFlashId === station.id;
            return (
              <div
                key={station.id}
                className={`rounded-xl border p-4 flex items-center gap-3.5 transition-colors ${
                  active
                    ? 'border-[var(--sm-accent)] bg-[var(--sm-muted)]'
                    : 'border-[var(--sm-border)] bg-[var(--sm-surface)] hover:border-[var(--sm-text-muted)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    active ? onTogglePlayPause() : onPlayStation(station, displayedStations)
                  }
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left"
                >
                  <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-[var(--sm-border)] bg-[var(--sm-bg)]">
                    <CoverArtwork
                      src={station.coverUrl}
                      alt={station.title}
                      roundedClassName="rounded-none"
                      sizeIcon={20}
                    />
                    <span
                      className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity ${
                        active ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                      }`}
                    >
                      {active && isPlaying ? (
                        <Pause size={16} fill="currentColor" />
                      ) : (
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#15803D] dark:text-emerald-400">
                      <Radio size={11} />
                      <span className="truncate">
                        {active && isPlaying ? 'PLAYING' : 'LIVE'} · {station.country}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[var(--sm-text)] truncate">
                      {station.title}
                    </div>
                    <div className="text-xs text-[var(--sm-text-muted)] truncate">
                      {station.genre} · {station.bitrateLabel || 'Live Stream'}
                    </div>
                  </div>
                </button>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(station.id)}
                    aria-label={saved ? 'Remove from saved stations' : 'Save station'}
                    className={`p-1.5 rounded-md transition-colors ${
                      saved
                        ? 'text-[var(--sm-accent-text)]'
                        : 'text-[var(--sm-text-muted)] hover:text-[var(--sm-text)] hover:bg-[var(--sm-muted)]'
                    }`}
                  >
                    <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddToQueue(station);
                      setQueuedFlashId(station.id);
                      setTimeout(() => setQueuedFlashId(null), 1300);
                    }}
                    title="Add station to queue"
                    aria-label="Add station to queue"
                    className="p-1.5 rounded-md text-[var(--sm-text-muted)] hover:text-[var(--sm-text)] hover:bg-[var(--sm-muted)] transition-colors"
                  >
                    {queued ? (
                      <Check size={14} className="text-[var(--sm-accent-text)]" />
                    ) : (
                      <ListPlus size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
