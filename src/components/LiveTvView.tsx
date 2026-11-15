import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Tv,
  Search,
  Radio,
  Heart,
  RefreshCw,
  Maximize2,
  ShieldCheck,
  Globe,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  PictureInPicture2,
  Play,
  Shuffle,
} from 'lucide-react';
import type { TvCategoryOption, TvChannel, TvCountryOption } from '../types/music';
import { fetchJsonChecked, normalizeError, type AppErrorInfo } from '../utils/errors';
import { CoverArtwork } from './CoverArtwork';
import { ErrorNotice } from './ErrorNotice';
import { HlsVideoPlayer } from './HlsVideoPlayer';

const DEFAULT_TV_CATEGORIES: TvCategoryOption[] = [
  { id: 'general', name: 'General', count: 0 },
  { id: 'news', name: 'News', count: 0 },
  { id: 'religious', name: 'Religious', count: 0 },
  { id: 'entertainment', name: 'Entertainment', count: 0 },
  { id: 'music', name: 'Music', count: 0 },
  { id: 'movies', name: 'Movies', count: 0 },
  { id: 'series', name: 'Series', count: 0 },
  { id: 'sports', name: 'Sports', count: 0 },
  { id: 'kids', name: 'Kids', count: 0 },
  { id: 'legislative', name: 'Legislative', count: 0 },
  { id: 'education', name: 'Education', count: 0 },
  { id: 'culture', name: 'Culture', count: 0 },
  { id: 'documentary', name: 'Documentary', count: 0 },
  { id: 'comedy', name: 'Comedy', count: 0 },
];

const DEFAULT_CATEGORY_META: Record<string, string> = {
  all: 'Live international television broadcasts spanning all 14 live genres and global networks.',
  general: 'Flagship national broadcasters, public television networks, and live regional TV feeds.',
  news: '24/7 breaking global newsrooms, live briefings, and international current affairs.',
  religious: 'Live faith broadcasts, cathedral services, gospel ministries, and spiritual programming.',
  entertainment: 'Variety networks, lifestyle shows, talk television, and live pop-culture channels.',
  music: '24-hour music video networks, live concerts, urban beats, and electronic club visuals.',
  movies: 'Continuous cinema streams, classic feature films, and curated international movie channels.',
  series: 'Binge-ready drama, crime docuseries, reality TV, and episodic television networks.',
  sports: 'Live international sports networks, football, motorsport, athletics, and combat sports.',
  kids: 'Family-safe cartoons, preschool learning channels, and animated adventure streams.',
  legislative: 'Live parliamentary chambers, public policy hearings, and national assembly feeds.',
  education: 'History, science, lifelong learning, agricultural, and classroom broadcast channels.',
  culture: 'Arts, heritage programming, performing arts, literature, and global cultural showcases.',
  documentary: 'Nature expeditions, science features, investigative films, and historical documentaries.',
  comedy: 'Stand-up showcases, sitcom marathons, sketch comedy, and late-night humor streams.',
};

const QUICK_FEATURED_CHANNELS: TvChannel[] = [
  {
    id: 'France24.fr',
    name: 'France 24 English',
    countryCode: 'FR',
    countryName: 'France',
    countryFlag: '🇫🇷',
    categories: ['news'],
    logoUrl: '',
    streamUrl:
      'https://amg00106-amg00106c1-rakuten-uk-4654.playouts.now.amagi.tv/playlist/amg00106-france24fast-france24-rakutenuk/playlist.m3u8',
    alternateUrls: [
      'https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8',
      'https://dash3.antik.sk/live/test_france24_eng/playlist.m3u8',
    ],
    quality: '1080p',
  },
  {
    id: 'beINSPORTSXTRA.us',
    name: 'beIN SPORTS XTRA',
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    categories: ['sports'],
    logoUrl: '',
    streamUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
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
    id: 'TRACEUK.uk',
    name: 'TRACE UK (Music)',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    categories: ['music', 'entertainment'],
    logoUrl: '',
    streamUrl: 'https://amg01131-tracetv-amg01131c5-stirr-us-4389.playouts.now.amagi.tv/playlist.m3u8',
    quality: '1080p',
  },
  {
    id: 'RwandaTV.rw',
    name: 'Rwanda TV',
    countryCode: 'RW',
    countryName: 'Rwanda',
    countryFlag: '🇷🇼',
    categories: ['general', 'news'],
    logoUrl: '',
    streamUrl: 'https://5c46fa289c89f.streamlock.net/rtv25/rtv/playlist.m3u8',
    quality: '720p',
  },
];

interface LiveTvViewProps {
  initialQuery?: string;
  activeChannel: TvChannel | null;
  useProxyRelay: boolean;
  onSelectChannel: (channel: TvChannel) => void;
  onCloseChannel: () => void;
  onToggleProxyRelay: () => void;
  onEnableProxyRelay: () => void;
  onPopOutMiniPlayer: () => void;
  onPauseMusic: () => void;
}

function loadTvFavorites(): string[] {
  try {
    const raw = localStorage.getItem('soundmark_tv_favorites');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function LiveTvView({
  initialQuery = '',
  activeChannel,
  useProxyRelay,
  onSelectChannel,
  onCloseChannel,
  onToggleProxyRelay,
  onEnableProxyRelay,
  onPopOutMiniPlayer,
  onPauseMusic,
}: LiveTvViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [country, setCountry] = useState('ALL');
  const [category, setCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [countries, setCountries] = useState<TvCountryOption[]>([]);
  const [categories, setCategories] = useState<TvCategoryOption[]>(DEFAULT_TV_CATEGORIES);
  const [categoryMeta, setCategoryMeta] = useState<Record<string, string>>(DEFAULT_CATEGORY_META);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalWorldwide, setTotalWorldwide] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppErrorInfo | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadTvFavorites);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerBoxRef = useRef<HTMLDivElement | null>(null);
  const userStoppedRef = useRef(false);
  const pendingCategoryTuneRef = useRef<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    localStorage.setItem('soundmark_tv_favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const fetchChannels = useCallback(
    async (nextOffset = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          country,
          category,
          limit: '48',
          offset: String(nextOffset),
        });
        const data = await fetchJsonChecked<{
          channels?: TvChannel[];
          total?: number;
          totalWorldwide?: number;
          countries?: TvCountryOption[];
          categories?: TvCategoryOption[];
          categoryMeta?: Record<string, string>;
        }>(`/api/tv/channels?${params.toString()}`, {
          context: 'Live TV channels',
        });
        const incoming: TvChannel[] = data.channels || [];

        setChannels((prev) => (append ? [...prev, ...incoming] : incoming));
        setTotalFiltered(data.total || incoming.length);
        setTotalWorldwide(data.totalWorldwide || incoming.length);
        if (Array.isArray(data.countries) && data.countries.length > 0) {
          setCountries(data.countries);
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
        if (data.categoryMeta && typeof data.categoryMeta === 'object') {
          setCategoryMeta((prev) => ({ ...prev, ...data.categoryMeta }));
        }
        setOffset(nextOffset + incoming.length);

        if (!append && pendingCategoryTuneRef.current === category && incoming.length > 0) {
          pendingCategoryTuneRef.current = null;
          userStoppedRef.current = false;
          onSelectChannel(incoming[0]);
        }
      } catch (err) {
        if (!append) setChannels([]);
        setError(normalizeError(err, 'Live TV channels'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, country, category, onSelectChannel],
  );

  useEffect(() => {
    fetchChannels(0, false);
  }, [country, category, initialQuery]);

  // Automatically start live TV video playback on first visit so video is immediately visible
  useEffect(() => {
    if (!activeChannel && !userStoppedRef.current && !loading && channels.length > 0) {
      onSelectChannel(channels[0]);
    }
  }, [activeChannel, loading, channels, onSelectChannel]);

  const handleSelectCategory = (nextCat: string) => {
    setFavoritesOnly(false);
    if (nextCat === category) {
      if (channels.length > 0) {
        userStoppedRef.current = false;
        onSelectChannel(channels[0]);
      }
      return;
    }
    pendingCategoryTuneRef.current = nextCat;
    setCategory(nextCat);
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
    );
  };

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const displayedChannels = useMemo(() => {
    if (!favoritesOnly) return channels;
    return channels.filter((ch) => favoriteSet.has(ch.id));
  }, [channels, favoritesOnly, favoriteSet]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.id === category),
    [categories, category],
  );

  const activeCategoryLabel =
    category === 'all' ? 'All Live Categories' : activeCategoryObj?.name || category;

  const activeCategoryDescription =
    categoryMeta[category] || DEFAULT_CATEGORY_META[category] || DEFAULT_CATEGORY_META.all;

  const quickLivePicks = useMemo(() => {
    const source = displayedChannels.length > 0 ? displayedChannels : QUICK_FEATURED_CHANNELS;
    return source.slice(0, 5);
  }, [displayedChannels]);

  const activeListIndex = useMemo(() => {
    if (!activeChannel) return -1;
    return displayedChannels.findIndex((c) => c.id === activeChannel.id);
  }, [activeChannel, displayedChannels]);

  const handlePrevChannel = () => {
    const list = displayedChannels.length > 0 ? displayedChannels : QUICK_FEATURED_CHANNELS;
    if (activeListIndex > 0) {
      onSelectChannel(list[activeListIndex - 1]);
    } else {
      onSelectChannel(list[list.length - 1]);
    }
  };

  const handleNextChannel = () => {
    const list = displayedChannels.length > 0 ? displayedChannels : QUICK_FEATURED_CHANNELS;
    if (activeListIndex >= 0 && activeListIndex < list.length - 1) {
      onSelectChannel(list[activeListIndex + 1]);
    } else {
      onSelectChannel(list[0]);
    }
  };

  const handleRandomLiveInCategory = () => {
    const list = displayedChannels.length > 0 ? displayedChannels : QUICK_FEATURED_CHANNELS;
    if (list.length === 0) return;
    const pool =
      list.length > 1 && activeChannel ? list.filter((c) => c.id !== activeChannel.id) : list;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    userStoppedRef.current = false;
    onSelectChannel(pick);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchChannels(0, false);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-medium text-[var(--sm-text-muted)] mb-1">
            Global TV Theatre ·{' '}
            <span className="font-mono tabular-nums">{totalWorldwide.toLocaleString()}</span> Live Channels Worldwide
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--sm-text)]">
            Watch Live TV
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextCountry = country === 'RW' ? 'ALL' : 'RW';
              setCountry(nextCountry);
              setCategory('all');
              setFavoritesOnly(false);
              pendingCategoryTuneRef.current = 'all';
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              country === 'RW'
                ? 'border-[var(--sm-accent)] bg-[var(--sm-accent-soft)] text-[var(--sm-accent-text)]'
                : 'border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]'
            }`}
          >
            <span>🇷🇼 Rwanda TV</span>
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
            onClick={() => fetchChannels(0, false)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] text-xs font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] whitespace-nowrap"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Always-Visible Dedicated TV Video Viewing Screen */}
      <section className="border border-[var(--sm-border)] rounded-2xl bg-[var(--sm-surface)] overflow-hidden">
        <div ref={playerBoxRef} className="relative aspect-video bg-[#0E0E0D] w-full max-h-[540px]">
          {activeChannel ? (
            <HlsVideoPlayer
              streamUrl={activeChannel.streamUrl}
              alternateUrls={activeChannel.alternateUrls}
              embedUrl={activeChannel.embedUrl}
              channelName={activeChannel.name}
              useProxyRelay={useProxyRelay}
              onRequestProxyRelay={onEnableProxyRelay}
              onNextChannel={handleNextChannel}
              onPlaybackStart={onPauseMusic}
              videoRefExternal={videoRef}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-6 text-center bg-gradient-to-b from-[#171715] to-[#0E0E0D] text-[#F3F1EA]">
              <div className="w-14 h-14 rounded-2xl bg-[#232320] border border-[#34342F] flex items-center justify-center text-[var(--sm-accent-text)]">
                <Tv size={26} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2 className="font-display text-xl font-bold">TV Video Theatre Ready</h2>
                <p className="text-xs text-[#A3A096] leading-relaxed">
                  Pick any of the 14 live categories below or jump straight into a verified HD channel stream.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {QUICK_FEATURED_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      userStoppedRef.current = false;
                      onSelectChannel(ch);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#232320] hover:bg-[var(--sm-accent)] hover:text-[var(--sm-on-accent)] border border-[#34342F] text-xs font-medium text-[#F3F1EA] transition-colors"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>
                      {ch.countryFlag} {ch.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TV Screen Console Toolbar */}
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--sm-border)]">
          {activeChannel ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-[var(--sm-border)] bg-[var(--sm-bg)]">
                <CoverArtwork
                  src={activeChannel.logoUrl}
                  alt={activeChannel.name}
                  className="w-full h-full object-contain p-1"
                  roundedClassName="rounded-none"
                  sizeIcon={18}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-[var(--sm-text)] truncate">
                    {activeChannel.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#15803D] dark:text-emerald-400 shrink-0">
                    <Radio size={11} />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-[var(--sm-text-sec)] truncate">
                  {activeChannel.countryFlag} {activeChannel.countryName} ·{' '}
                  {activeChannel.categories.join(', ')} · {activeChannel.quality}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--sm-text-sec)]">
              No broadcast selected — choose any category or channel below to start live video playback.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* Channel Zapper */}
            <div className="inline-flex items-center border border-[var(--sm-border)] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={handlePrevChannel}
                title="Previous channel"
                aria-label="Previous TV channel"
                className="px-2.5 py-1.5 text-xs text-[var(--sm-text-sec)] hover:bg-[var(--sm-muted)] flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                type="button"
                onClick={handleNextChannel}
                title="Next channel"
                aria-label="Next TV channel"
                className="px-2.5 py-1.5 text-xs text-[var(--sm-text-sec)] hover:bg-[var(--sm-muted)] border-l border-[var(--sm-border)] flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {activeChannel && (
              <>
                <button
                  type="button"
                  onClick={onToggleProxyRelay}
                  title="Toggle CORS relay proxy if stream stalls"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    useProxyRelay
                      ? 'border-[var(--sm-accent)] text-[var(--sm-accent-text)]'
                      : 'border-[var(--sm-border)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]'
                  }`}
                >
                  <ShieldCheck size={13} />
                  <span>{useProxyRelay ? 'Relay Active' : 'Direct Stream'}</span>
                </button>

                <button
                  type="button"
                  onClick={onPopOutMiniPlayer}
                  title="Dock as floating Mini TV screen while browsing"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--sm-border)] text-xs font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] whitespace-nowrap"
                >
                  <PictureInPicture2 size={14} />
                  <span className="hidden sm:inline">Mini Screen</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite(activeChannel.id)}
                  className={`p-2 rounded-lg border border-[var(--sm-border)] ${
                    favoriteSet.has(activeChannel.id)
                      ? 'text-[var(--sm-accent-text)]'
                      : 'text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]'
                  }`}
                  aria-label="Save channel"
                >
                  <Heart size={15} fill={favoriteSet.has(activeChannel.id) ? 'currentColor' : 'none'} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    (videoRef.current?.requestFullscreen
                      ? videoRef.current.requestFullscreen()
                      : playerBoxRef.current?.requestFullscreen?.()
                    )?.catch(() => {})
                  }
                  aria-label="Fullscreen"
                  className="p-2 rounded-lg border border-[var(--sm-border)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]"
                >
                  <Maximize2 size={15} />
                </button>

                {activeChannel.website && (
                  <a
                    href={activeChannel.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-[var(--sm-border)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)]"
                    aria-label="Official broadcaster site"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    userStoppedRef.current = true;
                    onCloseChannel();
                  }}
                  aria-label="Stop live TV"
                  className="p-2 rounded-lg border border-[var(--sm-border)] text-[var(--sm-text-muted)] hover:text-[var(--sm-accent-text)]"
                >
                  <X size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Search & Country + 14 Live Category Filters */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sm-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search live TV channels by name, country, or genre..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-[var(--sm-surface)] border border-[var(--sm-border)] text-sm text-[var(--sm-text)] placeholder:text-[var(--sm-text-muted)] focus:outline-none focus:border-[var(--sm-accent)]"
            />
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Filter TV channels by country"
            className="h-10 px-3 rounded-lg bg-[var(--sm-surface)] border border-[var(--sm-border)] text-xs font-medium text-[var(--sm-text)] sm:w-64 focus:outline-none focus:border-[var(--sm-accent)]"
          >
            <option value="ALL">All Countries Worldwide</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.count})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 px-5 rounded-lg bg-[var(--sm-contrast-bg)] text-[var(--sm-contrast-text)] text-xs font-medium whitespace-nowrap hover:opacity-90"
          >
            Search TV
          </button>
        </form>

        {/* 14 Live Category Tabs with Live Channel Counts */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 tabular-nums ${
              category === 'all'
                ? 'border-[var(--sm-accent)] bg-[var(--sm-accent)] text-[var(--sm-on-accent)] font-semibold'
                : 'border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:border-[var(--sm-text-muted)]'
            }`}
          >
            <span>All Categories</span>
            {totalWorldwide > 0 && (
              <span className={`text-[11px] font-mono ${category === 'all' ? 'opacity-90' : 'text-[var(--sm-text-muted)]'}`}>
                ({totalWorldwide.toLocaleString()})
              </span>
            )}
          </button>
          {categories.slice(0, 14).map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 tabular-nums ${
                  active
                    ? 'border-[var(--sm-accent)] bg-[var(--sm-accent)] text-[var(--sm-on-accent)] font-semibold'
                    : 'border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:border-[var(--sm-text-muted)]'
                }`}
              >
                <span>{cat.name}</span>
                {cat.count > 0 && (
                  <span className={`text-[11px] font-mono ${active ? 'opacity-90' : 'text-[var(--sm-text-muted)]'}`}>
                    ({cat.count.toLocaleString()})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Now Spotlight Strip for Active Category */}
        <div className="border border-[var(--sm-border)] rounded-xl bg-[var(--sm-surface)] p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#15803D] dark:text-emerald-400">
                  <Radio size={12} />
                  <span>LIVE NOW</span>
                </span>
                <span className="text-[var(--sm-text-muted)]">·</span>
                <h2 className="font-display text-lg font-bold text-[var(--sm-text)]">
                  {activeCategoryLabel}
                </h2>
                <span className="text-xs font-mono text-[var(--sm-text-muted)] tabular-nums">
                  {loading
                    ? 'Scanning live streams...'
                    : `${displayedChannels.length} live streams ready${
                        activeCategoryObj?.count
                          ? ` · ${activeCategoryObj.count.toLocaleString()} indexed`
                          : ''
                      }`}
                </span>
              </div>
              <p className="text-xs text-[var(--sm-text-sec)] leading-relaxed">
                {activeCategoryDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {displayedChannels.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    userStoppedRef.current = false;
                    onSelectChannel(displayedChannels[0]);
                  }}
                  className="h-9 px-3.5 rounded-lg bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap hover:opacity-90"
                >
                  <Play size={13} fill="currentColor" />
                  <span>
                    {category === 'all' ? 'Watch Featured Live' : `Watch Top ${activeCategoryLabel}`}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={handleRandomLiveInCategory}
                disabled={displayedChannels.length === 0}
                className="h-9 px-3.5 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-bg)] text-xs font-medium text-[var(--sm-text)] inline-flex items-center gap-1.5 whitespace-nowrap hover:border-[var(--sm-accent)] disabled:opacity-40"
              >
                <Shuffle size={13} />
                <span>Channel Surf Live</span>
              </button>
            </div>
          </div>

          {!loading && quickLivePicks.length > 0 && (
            <div className="pt-2.5 border-t border-[var(--sm-border)] flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--sm-text-muted)] mr-1">
                Quick-tune live:
              </span>
              {quickLivePicks.map((ch) => {
                const isLive = activeChannel?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      userStoppedRef.current = false;
                      onSelectChannel(ch);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      isLive
                        ? 'border-[var(--sm-accent)] bg-[var(--sm-accent-soft)] text-[var(--sm-accent-text)] font-semibold'
                        : 'border-[var(--sm-border)] bg-[var(--sm-bg)] text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] hover:border-[var(--sm-text-muted)]'
                    }`}
                  >
                    <Play size={11} fill="currentColor" />
                    <span>
                      {ch.countryFlag} {ch.name}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--sm-text-muted)]">
                      {ch.quality}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Channels Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-[var(--sm-muted)]" />
          ))}
        </div>
      ) : error && displayedChannels.length === 0 ? (
        <ErrorNotice
          error={error}
          variant="card"
          onRetry={() => fetchChannels(0, false)}
          onDismiss={() => setError(null)}
        />
      ) : displayedChannels.length === 0 ? (
        <div className="border border-[var(--sm-border)] rounded-xl bg-[var(--sm-surface)] p-12 text-center space-y-2">
          <Globe size={28} className="mx-auto text-[var(--sm-text-muted)]" />
          <p className="text-sm font-medium text-[var(--sm-text)]">
            No live TV channels match your current filter
          </p>
          <p className="text-xs text-[var(--sm-text-sec)]">
            Try switching country to All Countries Worldwide or clearing your search query.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <ErrorNotice
              error={error}
              variant="banner"
              onRetry={() => fetchChannels(offset, true)}
              onDismiss={() => setError(null)}
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedChannels.map((ch) => {
              const isSelected = activeChannel?.id === ch.id;
              const isFav = favoriteSet.has(ch.id);
              return (
                <div
                  key={ch.id}
                  className={`border rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'border-[var(--sm-accent)] bg-[var(--sm-muted)]'
                      : 'border-[var(--sm-border)] bg-[var(--sm-surface)] hover:border-[var(--sm-text-muted)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      userStoppedRef.current = false;
                      onSelectChannel(ch);
                    }}
                    className="flex items-start gap-3 text-left w-full"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-[var(--sm-border)] bg-[var(--sm-bg)]">
                      <CoverArtwork
                        src={ch.logoUrl}
                        alt={`${ch.name} logo`}
                        className="w-full h-full object-contain p-1"
                        roundedClassName="rounded-none"
                        sizeIcon={18}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#15803D] dark:text-emerald-400">
                        <Radio size={10} />
                        <span>LIVE · {ch.quality}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--sm-text)] truncate mt-0.5">
                        {ch.name}
                      </h3>
                      <p className="text-xs text-[var(--sm-text-sec)] truncate">
                        {ch.countryFlag} {ch.countryName} ·{' '}
                        {ch.categories.slice(0, 2).join(' · ') || 'general'}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--sm-border)]">
                    <button
                      type="button"
                      onClick={() => {
                        userStoppedRef.current = false;
                        onSelectChannel(ch);
                      }}
                      className="text-xs font-medium text-[var(--sm-accent-text)] hover:underline"
                    >
                      {isSelected ? 'Watching Live Now' : 'Watch Live'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(ch.id)}
                      aria-label={isFav ? 'Remove from saved channels' : 'Save channel'}
                      className={`p-1 rounded ${
                        isFav
                          ? 'text-[var(--sm-accent-text)]'
                          : 'text-[var(--sm-text-muted)] hover:text-[var(--sm-text)]'
                      }`}
                    >
                      <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!favoritesOnly && channels.length < totalFiltered && (
            <div className="flex items-center justify-center pt-4">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchChannels(offset, true)}
                className="px-5 py-2.5 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] text-xs font-medium text-[var(--sm-text)] hover:bg-[var(--sm-muted)] disabled:opacity-50"
              >
                {loadingMore
                  ? 'Loading channels...'
                  : `Load More Channels (${channels.length} of ${totalFiltered.toLocaleString()})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
