import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search, ArrowRight, Loader2, Heart, MapPin, Clock, Flame,
  Smartphone, Car, Sofa, Shirt, TrendingUp,
  BadgeCheck, Star, ChevronLeft, ChevronRight, Mic
} from 'lucide-react';

// ============================================================
//  CONSTANTS
// ============================================================

const ISLAND_CATEGORIES = [
  { name: 'Mobiles', slug: 'mobiles', icon: Smartphone, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
  { name: 'Vehicles', slug: 'vehicles', icon: Car, bgClass: 'bg-teal-50', textClass: 'text-teal-600' },
  { name: 'Home', slug: 'home', icon: Sofa, bgClass: 'bg-purple-50', textClass: 'text-purple-600' },
  { name: 'Fashion', slug: 'fashion', icon: Shirt, bgClass: 'bg-red-50', textClass: 'text-red-600' },
];

const HERO_SLIDES = [
  {
    id: 1,
    tag: 'Fresh Catch Today',
    emoji: '🐟',
    headline: 'Straight from the Sea',
    sub: 'Local fishermen, freshest catch',
    slug: 'fresh-catch',
    from: 'from-teal-600',
    to: 'to-teal-500',
  },
  {
    id: 2,
    tag: 'Island Artisans',
    emoji: '🐚',
    headline: 'Crafted with Island Soul',
    sub: 'Shells, pearls & handmade art',
    slug: 'handicrafts',
    from: 'from-purple-600',
    to: 'to-indigo-500',
  },
  {
    id: 3,
    tag: 'Tourism Experiences',
    emoji: '🤿',
    headline: 'Explore Paradise',
    sub: 'Diving, tours & local guides',
    slug: 'experiences',
    from: 'from-coral-500',
    to: 'to-sandy-400',
  },
  {
    id: 4,
    tag: 'Seasonal Specials',
    emoji: '🏖️',
    headline: 'Tourist Season Deals',
    sub: 'Best prices, verified sellers',
    slug: 'tourism',
    from: 'from-emerald-600',
    to: 'to-teal-400',
  },
];

const SEARCH_PLACEHOLDERS = [
  'Search fish, coconuts, tours…',
  'Find island handicrafts…',
  'Book a local guide…',
  'Discover diving packages…',
  'Browse fresh produce…',
];

const RECENT_PAGE_SIZE = 8;

// ============================================================
//  TYPES
// ============================================================
interface Listing {
  id: string;
  title: string;
  price: number;
  city: string;
  is_featured?: boolean;
  created_at?: string;
  views_count?: number;
  images?: { image_url: string }[];
}

// ============================================================
//  MAIN HOME COMPONENT
// ============================================================
export const Home: React.FC = () => {
  const navigate = useNavigate();

  // Data state
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [trendingListings, setTrendingListings] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [savedListings, setSavedListings] = useState<Set<string>>(new Set());

  // Hero carousel
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flash deal timer (countdown)
  const [flashTime, setFlashTime] = useState(3 * 3600 + 47 * 60 + 22);

  useEffect(() => {
    fetchFeatured();
    fetchTrending();
    fetchRecent(0);
  }, []);

  // Cycling search placeholder
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Auto-advance hero carousel
  useEffect(() => {
    heroTimer.current = setInterval(() => {
      setHeroIdx(i => (i + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, []);

  // Flash deal countdown
  useEffect(() => {
    const t = setInterval(() => {
      setFlashTime(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fetchFeatured = async () => {
    setLoadingFeatured(true);
    try {
      const { data } = await supabase
        .from('listings')
        .select('id, title, price, city, is_featured, views_count, images:listing_images(image_url)')
        .eq('status', 'active')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(10);
      setFeaturedListings(data || []);
    } catch (err) {
      console.error('Featured fetch error:', err);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const fetchTrending = async () => {
    setLoadingTrending(true);
    try {
      const { data } = await supabase
        .from('listings')
        .select('id, title, price, city, is_featured, views_count, images:listing_images(image_url)')
        .eq('status', 'active')
        .order('views_count', { ascending: false })
        .limit(6);
      setTrendingListings(data || []);
    } catch (err) {
      console.error('Trending fetch error:', err);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchRecent = async (pageIndex: number) => {
    if (pageIndex === 0) setLoadingRecent(true);
    else setLoadingMore(true);
    try {
      const from = pageIndex * RECENT_PAGE_SIZE;
      const to = from + RECENT_PAGE_SIZE - 1;
      const { data } = await supabase
        .from('listings')
        .select('id, title, price, city, is_featured, created_at, images:listing_images(image_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (data) {
        setRecentListings(prev => pageIndex === 0 ? data : [...prev, ...data]);
        setHasMore(data.length === RECENT_PAGE_SIZE);
        setPage(pageIndex);
      }
    } catch (err) {
      console.error('Recent fetch error:', err);
    } finally {
      setLoadingRecent(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/listings?q=${encodeURIComponent(searchQuery.trim())}` : '/listings');
  };

  const toggleSave = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedListings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatTimer = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return { h, m, ss };
  };

  const { h, m, ss } = formatTimer(flashTime);
  const slide = HERO_SLIDES[heroIdx];

  return (
    <div className="min-h-screen bg-warm-50 pb-28 md:pb-12">

      {/* ── HERO TEXT ── */}
      <section className="px-4 pt-8 pb-6 bg-warm-50 text-center">
        <div className="app-container space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <span className="text-[10px] md:text-xs xl:text-sm font-bold text-teal-600 tracking-wide uppercase">Andaman's Own Marketplace</span>
            </div>
            <h1 className="text-3xl md:text-4xl xl:text-5xl font-extrabold text-midnight-700 leading-tight tracking-tight">
              Buy & Sell <br />
              <span className="text-teal-500">in Paradise.</span>
            </h1>
            <p className="text-warm-500 text-sm md:text-base xl:text-lg max-w-[280px] md:max-w-[560px] xl:max-w-[640px] mx-auto leading-relaxed">
              Join thousands of islanders trading safely. From Port Blair to Diglipur, we've got you covered.
            </p>
          </div>
          <div className="relative max-w-md mx-auto search-pill">
            <form onSubmit={handleSearch}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-[20px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search mobiles, scooters..."
                className="block w-full pl-11 pr-24 py-3.5 bg-white border border-gray-200 rounded-full shadow-soft text-sm text-midnight-700 placeholder-gray-400 focus:ring-2 focus:ring-teal-100 focus:border-teal-400 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-midnight-700 hover:bg-midnight-600 text-white text-sm font-semibold px-5 rounded-full transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── ISLAND CATEGORY GRID ── */}
      <section className="px-4 mb-8">
        <div className="app-container">
          <div className="section-header">
            <h2 className="section-title">Browse Island Categories</h2>
            <Link to="/listings" className="section-link">All <ArrowRight size={14} /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {ISLAND_CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/listings?category=${cat.slug}`}
                  className="category-pill animate-fade-in-up min-w-[80px] flex-shrink-0 snap-start"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`category-icon-wrap ${cat.bgClass}`}>
                    <Icon size={28} className={cat.textClass} />
                  </div>
                  <span className="text-[11px] md:text-xs xl:text-sm font-bold text-midnight-700 text-center leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section >

      {/* ── FLASH DEALS ── */}
      < section className="px-4 mb-8" >
        <div className="app-container">
        <div className="bg-gradient-to-r from-coral-500 to-coral-600 rounded-3xl p-5 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10">
            <svg viewBox="0 0 100 120" className="w-full h-full">
              <circle cx="80" cy="30" r="60" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame size={16} className="text-sandy-400 animate-pulse" />
                <span className="text-white/80 text-xs md:text-sm font-black uppercase tracking-widest">Flash Deals</span>
              </div>
              <p className="text-white font-heading font-black text-lg leading-tight">Ends in</p>
            </div>

            <div className="flex items-center gap-1.5">
              {[h, m, ss].map((val, i) => (
                <React.Fragment key={i}>
                  <div className="timer-block min-w-[36px]">
                    <div className="text-lg font-black leading-none">{val}</div>
                    <div className="text-[8px] md:text-[10px] text-white/50 uppercase">{['HRS', 'MIN', 'SEC'][i]}</div>
                  </div>
                  {i < 2 && <span className="text-white font-black text-lg">:</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Link
            to="/listings?sort=newest"
            className="mt-4 flex w-full items-center justify-center gap-2 bg-white/20 border border-white/30 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-white/30 transition-all"
          >
            View Flash Deals <ArrowRight size={14} />
          </Link>
        </div>
        </div>
      </section >

      {/* ── FEATURED LISTINGS ── */}
      {(loadingFeatured || featuredListings.length > 0) && (
        <section className="px-4 mb-8">
          <div className="app-container">
            <div className="section-header px-0">
              <div>
                <h2 className="section-title flex items-center gap-2">
                  <span className="text-midnight-700">Featured</span> <span className="text-amber-500">Picks</span>
                </h2>
                <p className="text-xs text-warm-400 font-medium mt-0.5">Top rated island treasures</p>
              </div>
            </div>
            <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex gap-4 w-max pb-2">
                {loadingFeatured
                  ? [1, 2, 3].map(n => <HorizontalCardSkeleton key={n} />)
                  : featuredListings.map((listing, i) => (
                    <HorizontalListingCard
                      key={listing.id}
                      listing={listing}
                      rank={i + 1}
                      saved={savedListings.has(listing.id)}
                      onSave={toggleSave}
                    />
                  ))
                }
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING ON THE ISLANDS ── */}
      < section className="px-4 mb-8" >
        <div className="app-container">
          <div className="section-header px-0">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <span className="text-midnight-700">Today's</span> <span className="text-coral-500">Hot Picks</span>
              </h2>
              <p className="text-xs text-warm-400 font-medium mt-0.5">Handpicked deals just for you</p>
            </div>
            <Link to="/listings?sort=popular" className="section-link">All <ArrowRight size={14} /></Link>
          </div>
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-4 w-max pb-2">
              {loadingTrending
                ? [1, 2, 3].map(n => <HorizontalCardSkeleton key={n} />)
                : trendingListings.slice(0, 5).map((listing, i) => (
                  <HorizontalListingCard
                    key={listing.id}
                    listing={listing}
                    rank={i + 1}
                    saved={savedListings.has(listing.id)}
                    onSave={toggleSave}
                  />
                ))
              }
            </div>
          </div>
        </div>
      </section >

      {/* ── ISLAND VERIFIED STRIP ── */}
      < section className="px-4 mb-8" >
        <div className="app-container">
        <div className="bg-teal-50 border border-teal-100 rounded-3xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BadgeCheck size={18} className="text-teal-600" />
            <h3 className="font-heading font-bold text-teal-800 text-sm md:text-base">Island Verified Sellers</h3>
          </div>
          <p className="text-teal-700/70 text-xs md:text-sm mb-4">GPS-verified locals from across the Andaman Islands</p>
          <Link
            to="/listings?verified=true"
            className="text-teal-700 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
          >
            Browse verified listings <ArrowRight size={14} />
          </Link>
        </div>
        </div>
      </section >

      {/* ── FRESH ARRIVALS GRID ── */}
      < section className="px-4 mb-8" >
        <div className="app-container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Fresh Arrivals</h2>
              <p className="text-xs text-warm-400 font-medium mt-0.5">Just listed today</p>
            </div>
            <Link to="/listings" className="section-link">All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loadingRecent
              ? [1, 2, 3, 4].map(n => <ListingCardSkeleton key={n} />)
              : recentListings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  saved={savedListings.has(listing.id)}
                  onSave={toggleSave}
                  timeAgo={formatTimeAgo(listing.created_at)}
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))
            }
          </div>
          {
            hasMore && !loadingRecent && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchRecent(page + 1)}
                  disabled={loadingMore}
                  className="btn-secondary disabled:opacity-50 gap-2"
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Load More Listings'}
                </button>
              </div>
            )
          }
        </div>
      </section >

      {/* ── SEASONAL SPOTLIGHT ── */}
      < section className="px-4 mb-8" >
        <div className="app-container">
          <div className="relative rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-midnight-700 to-teal-600/80 p-6">
            <span className="text-[10px] uppercase tracking-widest font-black text-sandy-400 bg-white/10 px-3 py-1 rounded-full">
              🌊 Seasonal Spotlight
            </span>
            <h3 className="text-white font-heading font-black text-xl mt-3 mb-1">
              Tourist Season is Here
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Nov–May is peak season. Find the best experiences, stays and local products.
            </p>
            <Link to="/listings?category=tourism" className="btn-coral text-sm py-2.5 px-5">
              Explore Season Picks <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        </div>
      </section >

    </div >
  );
};

// ============================================================
//  SUB-COMPONENTS
// ============================================================

interface ListingCardProps {
  listing: Listing;
  saved: boolean;
  onSave: (id: string, e: React.MouseEvent) => void;
  timeAgo?: string;
  style?: React.CSSProperties;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, saved, onSave, timeAgo, style }) => {
  const imageUrl = listing.images?.length
    ? listing.images[0].image_url
    : `https://picsum.photos/seed/${listing.id}/400/400`;

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="listing-card animate-fade-in-up"
      style={style}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-warm-100 m-2 rounded-2xl">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {/* Save/Heart Button */}
        <button
          onClick={e => onSave(listing.id, e)}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-glass transition-all duration-200 active:scale-90 ${saved ? 'bg-coral-500' : 'bg-white/90 backdrop-blur-sm'
            }`}
          aria-label={saved ? 'Unsave listing' : 'Save listing'}
        >
          <Heart
            size={14}
            className={saved ? 'text-white fill-white' : 'text-warm-400'}
          />
        </button>
        {listing.city && (
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-[9px] font-bold text-midnight-700 uppercase tracking-wide shadow-sm">
            <MapPin size={10} className="text-ocean-600" style={{ color: '#006D77' }} />
            {listing.city}
          </div>
        )}
        {/* Featured Badge */}
        {listing.is_featured && (
          <div className="absolute top-2 left-2 bg-sandy-gradient text-midnight-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
            ✦ Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-3 flex-1 flex flex-col justify-between gap-1">
        <h3 className="text-[12px] font-semibold text-midnight-700 line-clamp-2 leading-tight pr-2">
          {listing.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-midnight-800 text-sm">
            ₹{listing.price?.toLocaleString('en-IN') ?? '0'}
          </span>
          <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
            <ArrowRight size={10} className="text-gray-500" />
          </div>
        </div>
      </div>
    </Link>
  );
};

interface HorizontalCardProps {
  listing: Listing;
  rank: number;
  saved: boolean;
  onSave: (id: string, e: React.MouseEvent) => void;
}

const HorizontalListingCard: React.FC<HorizontalCardProps> = ({ listing, rank, saved, onSave }) => {
  const imageUrl = listing.images?.length
    ? listing.images[0].image_url
    : `https://picsum.photos/seed/${listing.id}/300/300`;

  return (
    <Link to={`/listings/${listing.id}`} className="w-44 flex-shrink-0 listing-card group">
      <div className="relative aspect-square overflow-hidden bg-warm-100 m-2 rounded-2xl">
        <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        {/* Location badge */}
        {listing.city && (
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-[9px] font-bold text-midnight-700 uppercase tracking-wide shadow-sm">
            <MapPin size={10} className="text-ocean-600" style={{ color: '#006D77' }} />
            {listing.city}
          </div>
        )}

        {/* AndamanBazaar badge */}
        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-md rounded-xl p-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center flex-shrink-0">
            <BadgeCheck size={12} className="text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold">Andaman<span className="text-blue-500">Bazaar</span></div>
            <div className="text-[7px] text-gray-500 tracking-widest uppercase">Local . Trusted</div>
          </div>
        </div>

        {/* Removed Rank code, it's not in the image */}
        <button
          onClick={e => onSave(listing.id, e)}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-glass transition-all ${saved ? 'bg-coral-500' : 'bg-white/90 backdrop-blur-sm'}`}
          title={saved ? 'Unsave listing' : 'Save listing'}
          aria-label={saved ? 'Unsave listing' : 'Save listing'}
        >
          <Heart size={12} className={saved ? 'text-white fill-white' : 'text-warm-400'} />
        </button>
      </div>
      <div className="px-3 pb-3 pt-1">
        <h4 className="text-[13px] font-semibold text-midnight-700 line-clamp-1 leading-tight mb-1">{listing.title}</h4>
        <div className="flex items-center justify-between">
          <span className="font-bold text-midnight-800 text-sm">₹{listing.price?.toLocaleString('en-IN')}</span>
          <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
            <ArrowRight size={10} className="text-gray-500" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const ListingCardSkeleton = () => (
  <div className="premium-card overflow-hidden">
    <div className="m-2 aspect-square rounded-2xl skeleton" />
    <div className="px-3 pb-3 space-y-2">
      <div className="h-3 skeleton w-3/4" />
      <div className="h-3 skeleton w-1/2" />
    </div>
  </div>
);

const HorizontalCardSkeleton = () => (
  <div className="w-44 flex-shrink-0 premium-card overflow-hidden">
    <div className="m-2 aspect-square rounded-2xl skeleton" />
    <div className="px-3 pb-3 space-y-2">
      <div className="h-3 skeleton w-3/4" />
      <div className="h-3 skeleton w-1/2" />
    </div>
  </div>
);
