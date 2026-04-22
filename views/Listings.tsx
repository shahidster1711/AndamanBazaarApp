
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
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-16 animate-fade-in bg-abyss">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-warm pb-12">
           <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500">ls /market_data</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-snow uppercase">Registry</h1>
           </div>
           <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative group">
             <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
               <Search size={22} />
             </div>
             <input 
               type="text" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="grep -r islands *" 
               className="w-full py-6 pl-16 pr-12 rounded-xl bg-carbon border border-warm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-lg font-mono text-snow shadow-elevation-low outline-none"
             />
             {searchQuery && (
               <button onClick={() => {setSearchQuery(''); handleCategorySelect('All');}} type="button" className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-snow transition-colors">
                   <X size={20} />
               </button>
             )}
           </form>
        </div>
        
        <div className="flex items-center space-x-3 overflow-x-auto pb-6 no-scrollbar mask-fade-right">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-8 py-4 rounded-lg text-[10px] font-mono uppercase tracking-[0.2em] transition-all flex-shrink-0 border ${
                (activeCategory?.toLowerCase() === cat.toLowerCase() || (cat === 'All' && !activeCategory))
                ? 'bg-emerald-500 text-abyss border-emerald-500 shadow-glow scale-105 font-bold'
                : 'bg-carbon text-slate-500 border-warm hover:border-emerald-500/50 hover:text-emerald-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [1, 2, 3, 4, 5, 6, 7, 8].map(n => <ListingSkeleton key={n} />)
        ) : listings.length === 0 ? (
          <div className="col-span-full py-32 text-center space-y-8 bg-carbon rounded-lg border-2 border-dashed border-warm animate-slide-up">
            <div className="w-24 h-24 bg-abyss rounded-full flex items-center justify-center mx-auto shadow-elevation-low border border-warm text-4xl">📡</div>
            <div className="space-y-4">
                <h3 className="text-3xl font-black text-snow uppercase tracking-tighter">Zero Match Found</h3>
                <p className="text-slate-500 font-mono text-xs max-w-xs mx-auto uppercase tracking-[0.2em] leading-loose">No active units detected for given parameters.</p>
            </div>
            <button onClick={() => handleCategorySelect('All')} className="btn-premium px-10 py-4 text-[10px] font-mono uppercase tracking-widest">RESET_FILTERS</button>
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
  <div className="bg-carbon border border-warm rounded-lg h-[450px] p-4 space-y-6 animate-pulse">
    <div className="aspect-[4/5] bg-abyss rounded-md"></div>
    <div className="space-y-4 px-2">
       <div className="h-4 bg-abyss rounded w-3/4"></div>
       <div className="h-8 bg-abyss rounded w-1/2"></div>
    </div>
  </div>
);

interface ListingCardData {
  id: string;
  title: string;
  price: number;
  city: string;
  created_at: string;
  is_featured: boolean;
  images: { image_url: string }[];
}

const ListingItem: React.FC<{ listing: ListingCardData, isFavorited: boolean, onToggleFavorite: (e: React.MouseEvent) => void }> = ({ listing, isFavorited, onToggleFavorite }) => {
  const imageUrl = listing.images && listing.images.length > 0 
    ? listing.images[0].image_url 
    : `https://picsum.photos/seed/list-${listing.id}/600/600`;

  return (
    <Link 
      to={`/listings/${listing.id}`} 
      className="group flex flex-col bg-carbon rounded-lg border border-warm p-3 hover:border-emerald-500 hover:-translate-y-1 transition-all duration-300 shadow-elevation-low"
    >
      <div className="relative aspect-[4/5] bg-abyss rounded-md overflow-hidden">
        <img 
          src={imageUrl} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          loading="lazy"
          alt={listing.title} 
        />
        <button 
          onClick={onToggleFavorite}
          className={`absolute top-4 right-4 w-10 h-10 glass rounded-lg flex items-center justify-center transition-all duration-300 z-10 ${isFavorited ? 'text-emerald-500 scale-110 shadow-glow border-emerald-500/50' : 'text-slate-400 hover:text-emerald-400'}`}
        >
          <Heart size={18} fill={isFavorited ? "currentColor" : "none"} strokeWidth={2.5} />
        </button>
        {listing.is_featured && (
            <div className="absolute top-4 left-4 bg-emerald-500 text-abyss px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest shadow-glow flex items-center z-10">
                <Sparkles size={10} className="mr-1.5" /> PRIORITY
            </div>
        )}
        <div className="absolute bottom-4 left-4 z-10">
           <div className="bg-carbon/80 backdrop-blur-md px-3 py-1.5 rounded border border-warm text-[9px] font-mono text-parchment uppercase tracking-widest flex items-center">
             <MapPin size={10} className="mr-2 text-emerald-500" /> {listing.city}
           </div>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 space-y-4">
        <div className="space-y-1">
          <h3 className="font-bold text-snow line-clamp-2 leading-tight text-sm uppercase font-mono tracking-tight group-hover:text-emerald-400 transition-colors">{listing.title}</h3>
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-warm/50 pt-4">
           <div className="flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Value</span>
              <span className="text-2xl font-heading font-black text-snow tracking-tighter">₹ {listing.price.toLocaleString('en-IN')}</span>
           </div>
           <div className="w-10 h-10 rounded border border-warm flex items-center justify-center text-slate-500 group-hover:border-emerald-500 group-hover:text-emerald-500 transition-all">
              <ArrowRight size={18} />
           </div>
        </div>
      </div>
    </Link>
  );
};
