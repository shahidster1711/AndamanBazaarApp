
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { Listing } from '../types';
import { Car, Smartphone, Home as HomeIcon, Sofa, Shirt, Briefcase, Sparkles, MapPin, Search, ArrowRight, CheckCircle2, ArrowUpRight } from 'lucide-react';

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
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingItems(true);
    try {
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
    <div className="space-y-24 pb-24 bg-slate-50 overflow-x-hidden">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center px-4 pt-20 overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] bg-ocean-100 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-coral-100 rounded-full blur-[120px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="max-w-6xl mx-auto w-full relative z-10 text-center space-y-12">
          <div className="space-y-6 animate-slide-up">
            <div className="inline-flex items-center space-x-2 bg-white/50 backdrop-blur-md border border-white px-4 py-2 rounded-2xl shadow-sm">
               <Sparkles size={16} className="text-ocean-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">The Islands' #1 Marketplace</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-heading font-black tracking-tighter text-slate-950 leading-[0.9]">
              Trade with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ocean-600 to-ocean-400">Paradise.</span>
            </h1>
            <p className="text-lg md:text-2xl font-medium text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Buy, sell, and discover unique items across the Andaman & Nicobar archipelago.
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-8 flex items-center text-slate-400 group-focus-within:text-ocean-500 transition-colors">
                <Search size={28} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for mobiles, cars, or furniture..." 
                className="w-full py-8 pl-20 pr-48 rounded-[32px] bg-white border border-slate-200 focus:border-ocean-300 focus:ring-[12px] focus:ring-ocean-50/50 transition-all duration-500 outline-none text-xl font-bold text-slate-900 shadow-premium"
              />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 btn-premium px-10 py-4 text-sm uppercase tracking-widest">
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
             {['Fast Shipping', 'Verified Sellers', 'Local Pickup'].map(tag => (
               <div key={tag} className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <CheckCircle2 size={14} className="text-ocean-500" />
                  <span>{tag}</span>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Modern Categories */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col space-y-12">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-ocean-600">Browse by type</p>
              <h2 className="text-4xl font-heading font-black text-slate-950 tracking-tighter">Popular Categories</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            {categories.map((cat, idx) => (
              <Link 
                key={cat.slug} 
                to={`/listings?category=${cat.slug}`}
                className="group relative flex flex-col items-center p-8 bg-white rounded-[32px] border border-slate-100 hover:border-ocean-200 hover:shadow-premium transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 shadow-sm`}>
                  {cat.icon}
                </div>
                <span className="mt-6 font-black text-[11px] text-slate-900 uppercase tracking-widest text-center">{cat.name}</span>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowUpRight size={14} className="text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items - Horizontal Scroll on Mobile */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="flex items-end justify-between">
           <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-coral-600">Staff Picks</p>
              <h2 className="text-4xl font-heading font-black text-slate-950 tracking-tighter">Featured Listings</h2>
           </div>
           <Link to="/listings" className="group flex items-center space-x-3 text-[10px] font-black text-ocean-600 uppercase tracking-widest bg-white px-6 py-3 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
            <span>Explore All</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loadingItems ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-[40px] border border-slate-100 h-[450px] animate-pulse p-4 space-y-6">
                <div className="aspect-[4/5] bg-slate-50 rounded-[32px]"></div>
                <div className="space-y-4 px-2">
                   <div className="h-6 bg-slate-50 rounded-full w-3/4"></div>
                   <div className="h-10 bg-slate-50 rounded-full w-1/2"></div>
                </div>
              </div>
            ))
          ) : featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} featured />
          ))}
        </div>
      </section>

      {/* Recent Grid */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-heading font-black text-slate-950 tracking-tighter">New Arrivals</h2>
            <div className="h-px flex-1 bg-slate-200 mx-8"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {loadingItems ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-[32px] border border-slate-100 h-64 animate-pulse"></div>
            ))
          ) : recentListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
      
      {/* Call to Action Section */}
      <section className="max-w-7xl mx-auto px-6">
         <div className="relative rounded-[48px] bg-slate-950 p-12 md:p-24 overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-ocean-900/20 to-transparent"></div>
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
               <h2 className="text-4xl md:text-6xl font-heading font-black text-white tracking-tighter leading-none">
                  Got something to sell?
               </h2>
               <p className="text-lg text-slate-400 font-medium">
                  Join thousands of islanders trading daily. It takes less than a minute to list your item.
               </p>
               <Link to="/post" className="inline-flex btn-premium px-12 py-5 text-sm uppercase tracking-[0.2em]">
                  Start Selling Now
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
};

interface ListingCardData {
  id: string;
  title: string;
  price: number;
  city: string;
  is_featured: boolean;
  images: { image_url: string }[];
}

const ListingCard: React.FC<{ listing: ListingCardData, featured?: boolean }> = ({ listing, featured = false }) => {
  const imageUrl = listing.images && listing.images.length > 0 
    ? listing.images[0].image_url 
    : `https://picsum.photos/seed/item-${listing.id}/600/600`;

  return (
    <Link 
      to={`/listings/${listing.id}`} 
      className={`group flex flex-col bg-white overflow-hidden transition-all duration-500 hover:-translate-y-2 ${featured ? 'rounded-[40px] border border-slate-100 p-3 hover:shadow-premium' : 'rounded-[32px] hover:shadow-lg'}`}
    >
      <div className={`relative overflow-hidden ${featured ? 'aspect-[4/5] rounded-[32px]' : 'aspect-square rounded-t-[32px]'} bg-slate-100`}>
        <img 
          src={imageUrl} 
          alt={listing.title} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
          <div className="glass px-4 py-2 rounded-2xl text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm flex items-center">
            <MapPin size={12} className="mr-2 text-ocean-600" /> {listing.city}
          </div>
        </div>
        {listing.is_featured && (
          <div className="absolute bottom-6 right-6 z-10">
             <div className="bg-coral-500 text-white p-2 rounded-xl shadow-lg">
                <Sparkles size={16} />
             </div>
          </div>
        )}
      </div>
      <div className={`${featured ? 'p-6 pb-4' : 'p-6'} flex flex-col flex-1 space-y-4`}>
        <div className="space-y-2">
          <h3 className="font-black text-slate-900 text-base line-clamp-2 leading-tight group-hover:text-ocean-600 transition-colors uppercase tracking-tight">{listing.title}</h3>
        </div>
        <div className="mt-auto flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asking Price</span>
              <span className="text-2xl font-heading font-black text-slate-950 tracking-tighter">₹ {listing.price.toLocaleString('en-IN')}</span>
           </div>
           <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-ocean-50 group-hover:text-ocean-500 transition-all">
              <ArrowRight size={18} />
           </div>
        </div>
      </div>
    </Link>
  );
};
