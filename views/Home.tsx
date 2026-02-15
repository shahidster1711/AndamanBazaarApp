
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { Listing } from '../types';
import { Car, Smartphone, Home as HomeIcon, Sofa, Shirt, Briefcase, Sparkles, MapPin, Search, ArrowRight, Loader2, Download, X, Zap } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const categories = [
  { name: 'Mobiles', slug: 'mobiles', icon: <Smartphone size={28} />, gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-200' },
  { name: 'Vehicles', slug: 'vehicles', icon: <Car size={28} />, gradient: 'from-cyan-400 to-cyan-600', shadow: 'shadow-cyan-200' },
  { name: 'Home', slug: 'home', icon: <Sofa size={28} />, gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-200' },
  { name: 'Fashion', slug: 'fashion', icon: <Shirt size={28} />, gradient: 'from-pink-400 to-pink-600', shadow: 'shadow-pink-200' },
  { name: 'Property', slug: 'property', icon: <HomeIcon size={28} />, gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-200' },
  { name: 'Services', slug: 'services', icon: <Briefcase size={28} />, gradient: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-200' },
  { name: 'Other', slug: 'other', icon: <Sparkles size={28} />, gradient: 'from-slate-400 to-slate-600', shadow: 'shadow-slate-200' },
];

const RECENT_PAGE_SIZE = 8;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fix: Changed state type to any[] to allow partial listing data from optimized query
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchFeatured();
    fetchRecent(0);
  }, []);

  const [showAppBanner, setShowAppBanner] = useState(!Capacitor.isNativePlatform());

  const fetchFeatured = async () => {
    try {
      const { data } = await supabase
        .from('listings')
        .select('id, title, price, city, is_featured, images:listing_images(image_url)')
        .eq('status', 'active')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(4);

      // If not enough featured items, fall back to recent items to fill the gap
      if (!data || data.length < 4) {
        const { data: fallback } = await supabase
          .from('listings')
          .select('id, title, price, city, is_featured, images:listing_images(image_url)')
          .eq('status', 'active')
          .order('views_count', { ascending: false })
          .limit(4);
        setFeaturedListings(fallback || []);
      } else {
        setFeaturedListings(data);
      }
    } catch (err) {
      console.error("Featured fetch error:", err);
    } finally {
      setLoadingFeatured(false);
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
        if (pageIndex === 0) {
          setRecentListings(data);
        } else {
          setRecentListings(prev => [...prev, ...data]);
        }
        setHasMore(data.length === RECENT_PAGE_SIZE);
        setPage(pageIndex);
      }
    } catch (err) {
      console.error("Recent fetch error:", err);
    } finally {
      setLoadingRecent(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchRecent(page + 1);
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
    <div className="space-y-12 pb-24 md:pb-12 bg-slate-50 min-h-screen">
      {/* Web-Only App Download Banner */}
      {showAppBanner && (
        <div className="bg-slate-900 text-white px-4 py-3 relative overflow-hidden animate-fade-in-up">
          <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-ocean-400 to-ocean-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-ocean-500/20">
                <Smartphone size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ocean-300">Experience the best</p>
                <p className="font-heading font-bold text-sm leading-tight">Download the App</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-white text-slate-900 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-ocean-50 transition-colors shadow-sm">
                Get It
              </button>
              <button onClick={() => setShowAppBanner(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Hero Section */}
      <section className="relative px-4 pt-8 pb-12 md:py-20 text-center overflow-hidden">
        {/* Abstract Background Blobs - Refined */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-center bg-no-repeat opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, rgba(248,250,252,0) 70%)' }}></div>

        <div className="max-w-4xl mx-auto space-y-8 relative z-10 animate-fade-in-up">
          <div className="flex flex-col items-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-ocean-100 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.15em] text-ocean-700 shadow-sm animate-fade-in-up delay-100">
              <Zap size={12} className="fill-ocean-500 text-ocean-500" />
              <span>Andaman's Own Marketplace</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tight text-slate-900 leading-[0.9] animate-fade-in-up delay-200">
              Buy & Sell <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ocean-500 to-teal-500">in Paradise.</span>
            </h1>

            <p className="text-lg md:text-xl font-medium text-slate-500 max-w-lg mx-auto leading-relaxed animate-fade-in-up delay-300">
              Join thousands of islanders trading safely. From Port Blair to Diglipur, we've got you covered.
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto w-full relative group animate-fade-in-up delay-300">
            <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 pointer-events-none group-focus-within:text-ocean-500 transition-colors">
              <Search size={22} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mobiles, scooters..."
              className="w-full h-14 md:h-16 pl-14 pr-32 rounded-full bg-white border border-slate-200 focus:border-ocean-300 focus:ring-4 focus:ring-ocean-50 transition-all duration-300 outline-none text-base md:text-lg font-bold text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg placeholder:font-normal placeholder:text-slate-400"
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-full font-bold shadow-lg hover:bg-ocean-600 active:scale-95 transition-all text-xs md:text-sm tracking-wide">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Modern Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 overflow-x-auto hide-scrollbar pb-4 -mt-4 animate-fade-in-up delay-200">
        <div className="flex md:grid md:grid-cols-7 gap-4 min-w-max md:min-w-0 px-2">
          {categories.map((cat, i) => (
            <Link
              key={cat.slug}
              to={`/listings?category=${cat.slug}`}
              className="group flex flex-col items-center gap-3 w-20 md:w-auto"
            >
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[24px] bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg ${cat.shadow} group-hover:-translate-y-2 group-hover:scale-105 group-active:scale-95 transition-all duration-300 ring-2 ring-white`}>
                <div className="text-white drop-shadow-md">
                  {cat.icon}
                </div>
              </div>
              <span className="font-heading font-bold text-xs text-slate-600 group-hover:text-slate-900 transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Items */}
      <section className="max-w-7xl mx-auto px-4 space-y-6 animate-fade-in-up delay-300">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-0.5">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">Today's <span className="text-coral-500">Hot Picks</span></h2>
            <p className="text-sm font-medium text-slate-400">Handpicked deals just for you</p>
          </div>
          <Link to="/listings" className="group flex items-center gap-1 text-xs font-bold text-ocean-600 bg-ocean-50 px-3 py-1.5 rounded-full hover:bg-ocean-100 transition-colors">
            <span>View All</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingFeatured ? (
            [1, 2, 3, 4].map(n => <ListingSkeleton key={n} />)
          ) : featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} featured />
          ))}
        </div>
      </section>

      {/* Recent Grid */}
      <section className="max-w-7xl mx-auto px-4 space-y-6 pb-8 animate-fade-in-up delay-300">
        <div className="flex items-center px-2">
          <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Fresh Arrivals</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {loadingRecent ? (
            [1, 2, 3, 4].map(n => <ListingSkeleton key={n} small />)
          ) : recentListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        {hasMore && !loadingRecent && (
          <div className="flex justify-center pt-8">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              {loadingMore && <Loader2 size={18} className="animate-spin" />}
              {loadingMore ? 'Loading Items...' : 'Load More Listing'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

// Extracted Components for cleaner code

const ListingSkeleton = ({ small = false }: { small?: boolean }) => (
  <div className={`bg-white border border-slate-100 rounded-3xl overflow-hidden ${small ? 'h-64' : 'h-80'} flex flex-col p-3 space-y-3`}>
    <div className="aspect-square bg-slate-100 rounded-2xl skeleton"></div>
    <div className="space-y-2 px-1">
      <div className="h-4 bg-slate-100 rounded w-3/4 skeleton"></div>
      <div className="h-3 bg-slate-100 rounded w-1/2 skeleton"></div>
    </div>
  </div>
);

const ListingCard: React.FC<{ listing: any, featured?: boolean }> = ({ listing, featured = false }) => {
  const imageUrl = listing.images && listing.images.length > 0
    ? listing.images[0].image_url
    : `https://picsum.photos/seed/item-${listing.id}/600/600`;

  return (
    <Link to={`/listings/${listing.id}`} className="premium-card group flex flex-col h-full relative overflow-hidden">
      {/* Image Container */}
      <div className={`relative ${featured ? 'aspect-[4/3]' : 'aspect-square'} overflow-hidden bg-slate-100 m-2 rounded-2xl`}>
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />

        {/* City Badge - Top Left */}
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-slate-700 shadow-sm flex items-center gap-1">
            <MapPin size={10} className="text-ocean-500" /> {listing.city}
          </div>
        </div>

        {/* Featured Badge (if applicable) */}
        {listing.is_featured && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles size={10} /> PRO
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-1 flex flex-col flex-1 gap-1">
        <h3 className="font-medium text-slate-800 text-sm line-clamp-2 leading-snug group-hover:text-ocean-600 transition-colors">
          {listing.title}
        </h3>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-lg font-heading font-bold text-slate-900 tracking-tight">
            ₹{listing.price?.toLocaleString('en-IN') || '0'}
          </span>
          {/* Action Button (Visual only) */}
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-ocean-500 group-hover:text-white transition-all duration-300">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
};
