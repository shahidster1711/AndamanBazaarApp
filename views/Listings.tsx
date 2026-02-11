
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Listing } from '../types';
import { Search, MapPin, Heart, Sparkles, Filter, X } from 'lucide-react';

const CATEGORIES = ['All', 'Mobiles', 'Vehicles', 'Home', 'Fashion', 'Property', 'Services'];

export const Listings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<string | null>(searchParams.get('category'));
  // Fix: Changed state type to any[] to allow partial listing data from optimized query
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchListings();
    fetchFavorites();
  }, [activeCategory, searchParams.get('q')]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Optimized select: fetch only what's needed for the card
      let query = supabase
        .from('listings')
        .select('id, title, price, city, created_at, is_featured, images:listing_images(image_url)')
        .eq('status', 'active');
      
      const q = searchParams.get('q');
      const cat = searchParams.get('category');

      if (cat && cat !== 'all') {
        query = query.ilike('category_id', `%${cat}%`);
      }

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const toggleFavorite = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Please sign in to save items!"); return; }

    const isFav = favorites.has(listingId);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
      setFavorites(prev => { const n = new Set(prev); n.delete(listingId); return n; });
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
      setFavorites(prev => { const n = new Set(prev); n.add(listingId); return n; });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-12 space-y-8">
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
            <button onClick={() => {setSearchQuery(''); handleCategorySelect('All');}} type="button" className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                <X size={20} />
            </button>
          )}
        </form>
        
        <div className="flex items-center justify-center space-x-3 overflow-x-auto pb-4 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 flex-shrink-0 ${
                (activeCategory?.toLowerCase() === cat.toLowerCase() || (cat === 'All' && !activeCategory))
                ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105'
                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

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
            <button onClick={() => handleCategorySelect('All')} className="bg-ocean-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Reset Filters</button>
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

// Fix: Changed listing prop type to any to accommodate partial data from query
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
