
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { Listing } from '../types';
import { Car, Smartphone, Home as HomeIcon, Sofa, Shirt, Briefcase, Sparkles, MapPin, Search, ArrowRight } from 'lucide-react';

const categories = [
  { name: 'Mobiles', slug: 'mobiles', icon: <Smartphone size={24} />, color: 'bg-ocean-100 text-ocean-700' },
  { name: 'Vehicles', slug: 'vehicles', icon: <Car size={24} />, color: 'bg-blue-100 text-blue-700' },
  { name: 'Home', slug: 'home', icon: <Sofa size={24} />, color: 'bg-purple-100 text-purple-700' },
  { name: 'Fashion', slug: 'fashion', icon: <Shirt size={24} />, color: 'bg-pink-100 text-pink-700' },
  { name: 'Property', slug: 'property', icon: <HomeIcon size={24} />, color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Services', slug: 'services', icon: <Briefcase size={24} />, color: 'bg-orange-100 text-orange-700' },
  { name: 'Other', slug: 'other', icon: <Sparkles size={24} />, color: 'bg-slate-100 text-slate-700' },
];

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loadingItems, setLoadingItems] = useState(true);
  // Fix: Changed state type to any[] to allow partial listing data from optimized query
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingItems(true);
    try {
      // Optimized query: select only minimum fields for cards
      const { data: latest } = await supabase
        .from('listings')
        .select('id, title, price, city, is_featured, images:listing_images(image_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(12);
      
      if (latest) {
        setRecentListings(latest.slice(4));
        setFeaturedListings(latest.slice(0, 4));
      }
    } catch (err) {
      console.error("Home fetch error:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/listings');
    }
  };

  return (
    <div className="space-y-12 pb-12 animate-slide-up bg-white">
      {/* Premium Hero Section */}
      <section className="relative px-4 py-12 md:py-24 text-center overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-ocean-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-coral-50 rounded-full blur-3xl opacity-50"></div>
        
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-ocean-100 text-ocean-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2 border border-ocean-200">
              Trusted Island Marketplace
            </div>
            <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter text-slate-950 leading-tight">
              Trade Locally in <br/><span className="text-ocean-700">The Andamans.</span>
            </h1>
            <p className="text-lg md:text-xl font-bold text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Skip the shipping delays. Buy and sell with verified neighbors across the islands.
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto w-full relative group">
            <div className="absolute inset-y-0 left-6 flex items-center text-slate-400">
              <Search size={24} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What are you looking for?" 
              className="w-full py-6 pl-14 pr-32 rounded-3xl bg-white border-2 border-slate-300 focus:border-ocean-600 focus:ring-4 focus:ring-ocean-100 transition-all duration-200 outline-none text-lg font-bold text-slate-900 shadow-xl"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-ocean-700 text-white px-8 py-3 rounded-2xl font-black shadow-md hover:bg-ocean-800 active:scale-95 transition-all text-sm uppercase tracking-wider">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-6 md:gap-10">
          {categories.map((cat) => (
            <Link 
              key={cat.slug} 
              to={`/listings?category=${cat.slug}`}
              className="group flex flex-col items-center space-y-3"
            >
              <div className={`w-16 h-16 md:w-20 md:h-20 ${cat.color} rounded-[28px] flex items-center justify-center shadow-sm group-hover:scale-110 transition-all duration-300 border-4 border-white ring-1 ring-slate-100`}>
                {cat.icon}
              </div>
              <span className="font-black text-[10px] text-slate-700 uppercase tracking-widest text-center leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Items */}
      <section className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-heading font-black text-slate-900 tracking-tight">Handpicked for You</h2>
          </div>
          <Link to="/listings" className="group flex items-center space-x-2 text-[10px] font-black text-ocean-700 uppercase tracking-widest">
            <span>Explore All</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingItems ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden h-96 flex flex-col p-3 space-y-4">
                <div className="aspect-[4/3] bg-slate-100 rounded-2xl animate-pulse"></div>
                <div className="space-y-3 p-2">
                   <div className="h-6 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                   <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))
          ) : featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} featured />
          ))}
        </div>
      </section>

      {/* Recent Grid */}
      <section className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-heading font-black text-slate-900 tracking-tight">Just In</h2>
            <div className="h-0.5 flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {loadingItems ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden h-64 flex flex-col p-3 space-y-4">
                <div className="aspect-square bg-slate-100 rounded-2xl animate-pulse"></div>
              </div>
            ))
          ) : recentListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
};

// Fix: Changed listing prop type to any to accommodate partial data from query
const ListingCard: React.FC<{ listing: any, featured?: boolean }> = ({ listing, featured = false }) => {
  const imageUrl = listing.images && listing.images.length > 0 
    ? listing.images[0].image_url 
    : `https://picsum.photos/seed/item-${listing.id}/600/600`;

  return (
    <Link to={`/listings/${listing.id}`} className="bg-white rounded-[32px] border-2 border-slate-100 flex flex-col h-full overflow-hidden group hover:border-ocean-300 hover:shadow-2xl transition-all duration-300">
      <div className={`relative ${featured ? 'aspect-[4/3]' : 'aspect-square'} overflow-hidden bg-slate-50`}>
        <img 
          src={imageUrl} 
          alt={listing.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-900 border border-slate-200 uppercase tracking-widest shadow-sm flex items-center">
            <MapPin size={10} className="mr-1.5 text-ocean-600" /> {listing.city}
          </div>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-ocean-700 transition-colors">{listing.title}</h3>
        <div className="mt-auto flex items-end justify-between">
           <span className="text-xl font-heading font-black text-slate-950 tracking-tight">₹ {listing.price.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </Link>
  );
};
