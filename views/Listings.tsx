
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Listing } from '../types';
import { Search, MapPin, Heart, Sparkles, Filter, X, ChevronDown, ArrowUpDown, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';

const CATEGORIES = ['All', 'Mobiles', 'Vehicles', 'Home', 'Fashion', 'Property', 'Services'];
const PAGE_SIZE = 20;

type SortOption = 'newest' | 'price_low' | 'price_high' | 'most_viewed';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  price_low: 'Price: Low → High',
  price_high: 'Price: High → Low',
  most_viewed: 'Most Viewed',
};

export const Listings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<string | null>(searchParams.get('category'));
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { showToast } = useToast();

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildQuery = useCallback((offset: number) => {
    let query = supabase
      .from('listings')
      .select('id, title, price, city, created_at, is_featured, views_count, images:listing_images(image_url)')
      .eq('status', 'active');

    const q = searchParams.get('q');
    const cat = searchParams.get('category');

    if (cat && cat !== 'all') {
      query = query.eq('category_id', cat);
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Price filters
    if (minPrice && !isNaN(Number(minPrice))) {
      query = query.gte('price', Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      query = query.lte('price', Number(maxPrice));
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        query = query.order('price', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false });
        break;
      case 'most_viewed':
        query = query.order('views_count', { ascending: false, nullsFirst: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);
    return query;
  }, [searchParams, sortBy, minPrice, maxPrice]);

  const fetchListings = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : (page + 1) * PAGE_SIZE;
      const { data, error } = await buildQuery(offset);

      if (error) throw error;

      const results = data || [];
      if (reset) {
        setListings(results);
      } else {
        setListings(prev => [...prev, ...results]);
      }

      setHasMore(results.length === PAGE_SIZE);
      if (!reset) setPage(prev => prev + 1);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQuery, page]);

  useEffect(() => {
    fetchListings(true);
    fetchFavorites();
  }, [activeCategory, searchParams.get('q'), sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchListings(false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchListings]);

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id);

    if (data) {
      setFavorites(new Set(data.map(f => f.listing_id)));
    }
  };

  const handleCategorySelect = (cat: string) => {
    const slug = cat === 'All' ? null : cat.toLowerCase();
    setActiveCategory(slug);

    const newParams = new URLSearchParams(searchParams);
    if (slug) newParams.set('category', slug);
    else newParams.delete('category');
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) newParams.set('q', searchQuery.trim());
    else newParams.delete('q');
    setSearchParams(newParams);
  };

  const handleApplyPriceFilter = () => {
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      showToast('Min price cannot be greater than max price.', 'warning');
      return;
    }
    fetchListings(true);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setShowFilters(false);
    handleCategorySelect('All');
  };

  const toggleFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Sign in to save items to your favorites.', 'info');
      return;
    }

    const isFav = favorites.has(listingId);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
      setFavorites(prev => { const n = new Set(prev); n.delete(listingId); return n; });
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
      setFavorites(prev => { const n = new Set(prev); n.add(listingId); return n; });
    }
  };

  const hasActiveFilters = minPrice || maxPrice || sortBy !== 'newest';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12 space-y-8">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in the Islands..."
            className="w-full py-6 px-8 pl-14 rounded-[32px] bg-white border-2 border-slate-200 focus:border-ocean-600 focus:ring-4 focus:ring-ocean-50 transition-all duration-300 text-lg font-bold text-slate-900 shadow-md"
          />
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-ocean-600 transition-colors">
            <Search size={22} />
          </div>
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); handleCategorySelect('All'); }} type="button" className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
              <X size={20} />
            </button>
          )}
        </form>

        {/* Category + Filter/Sort Row */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-3 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 flex-shrink-0 ${(activeCategory?.toLowerCase() === cat.toLowerCase() || (cat === 'All' && !activeCategory))
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105'
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:text-slate-900'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort & Filter Controls */}
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 hover:border-slate-400 transition-all"
              >
                <ArrowUpDown size={14} />
                <span>{SORT_LABELS[sortBy]}</span>
                <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl z-30 overflow-hidden min-w-[220px] animate-in slide-in-from-top-2 duration-200">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setShowSortDropdown(false); }}
                      className={`w-full text-left px-5 py-3.5 text-xs font-bold transition-colors ${sortBy === key ? 'bg-ocean-50 text-ocean-700 font-black' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${hasActiveFilters
                ? 'bg-ocean-50 border-ocean-300 text-ocean-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
            >
              <Filter size={14} />
              <span>Price Filter</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-ocean-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Price Filter Panel */}
          {showFilters && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">Price Range</h4>
                <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-900">
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Min (₹)</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-900 focus:border-ocean-600 focus:ring-2 focus:ring-ocean-50 outline-none transition-all"
                  />
                </div>
                <span className="text-slate-300 font-black mt-6">—</span>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Max (₹)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Any"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-900 focus:border-ocean-600 focus:ring-2 focus:ring-ocean-50 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClearFilters}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleApplyPriceFilter}
                  className="flex-[2] py-3 rounded-xl bg-ocean-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-ocean-700/20 hover:bg-ocean-800 active:scale-95 transition-all"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!loading && listings.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {listings.length} items{hasMore ? '+' : ''} found
          </p>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading ? (
          [1, 2, 3, 4, 5, 6, 7, 8].map(n => <ListingSkeleton key={n} />)
        ) : listings.length === 0 ? (
          <div className="col-span-full py-24 text-center space-y-6 bg-slate-50 rounded-[48px] border-4 border-dashed border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-4xl">🏝️</div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">No results</h3>
              <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto">Island network is active, but no items match your search.</p>
            </div>
            <button onClick={handleClearFilters} className="bg-ocean-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Reset Filters</button>
          </div>
        ) : (
          listings.map((listing) => (
            <ListingItem
              key={listing.id}
              listing={listing}
              isFavorited={favorites.has(listing.id)}
              onToggleFavorite={(e) => toggleFavorite(listing.id, e)}
            />
          ))
        )}
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasMore && !loading && (
        <div ref={sentinelRef} className="flex items-center justify-center py-12">
          {loadingMore && (
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-ocean-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ListingSkeleton: React.FC = () => (
  <div className="bg-white border-2 border-slate-100 rounded-[32px] flex flex-col h-96 overflow-hidden p-3 space-y-4">
    <div className="relative aspect-square bg-slate-100 rounded-[24px] animate-pulse"></div>
    <div className="p-2 space-y-3">
      <div className="h-6 w-3/4 bg-slate-100 rounded animate-pulse"></div>
      <div className="h-4 w-1/2 bg-slate-50 rounded animate-pulse"></div>
      <div className="mt-4 flex justify-between">
        <div className="h-4 w-12 bg-slate-50 rounded"></div>
        <div className="h-4 w-12 bg-slate-50 rounded"></div>
      </div>
    </div>
  </div>
);

const ListingItem: React.FC<{ listing: any, isFavorited: boolean, onToggleFavorite: (e: React.MouseEvent) => void }> = ({ listing, isFavorited, onToggleFavorite }) => {
  const imageUrl = listing.images && listing.images.length > 0
    ? listing.images[0].image_url
    : `https://picsum.photos/seed/list-${listing.id}/600/600`;

  return (
    <Link to={`/listings/${listing.id}`} className="bg-white rounded-[32px] border-2 border-slate-100 flex flex-col h-full overflow-hidden group hover:border-ocean-400 hover:shadow-2xl transition-all duration-500 p-2">
      <div className="relative aspect-square bg-slate-50 rounded-[28px] overflow-hidden">
        <img
          src={imageUrl}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          alt={listing.title}
        />
        <button
          onClick={onToggleFavorite}
          className={`absolute top-4 right-4 w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white transition-all duration-300 shadow-lg z-10 ${isFavorited ? 'text-coral-500 scale-110 border-coral-50' : 'text-slate-400 hover:text-slate-600 hover:scale-110'}`}
        >
          <Heart size={22} fill={isFavorited ? "currentColor" : "none"} strokeWidth={2.5} />
        </button>
        {listing.is_featured && (
          <div className="absolute top-4 left-4 bg-ocean-700 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg border border-ocean-800 flex items-center z-10">
            <Sparkles size={10} className="mr-1.5" /> Featured
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <span className="text-xl font-heading font-black text-slate-900 tracking-tight">₹ {listing.price.toLocaleString('en-IN')}</span>
        </div>
        <h3 className="font-bold text-slate-800 line-clamp-2 leading-snug mb-3 text-sm group-hover:text-ocean-700 transition-colors">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <MapPin size={10} className="text-ocean-500" />
            <span>{listing.city}</span>
          </div>
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{new Date(listing.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
};
