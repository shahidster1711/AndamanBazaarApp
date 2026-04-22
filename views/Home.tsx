
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
    <div className="space-y-24 pb-24 bg-abyss overflow-x-hidden">
      {/* High-Powered Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4 pt-20 overflow-hidden">
        {/* Decorative Background Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#3d3a39_1px,transparent_1px)] [background-size:40px_40px] opacity-20"></div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="max-w-6xl mx-auto w-full relative z-10 text-center space-y-12">
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center space-x-3 bg-carbon/50 backdrop-blur-md border border-warm px-4 py-2 rounded-lg shadow-elevation-low">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
               <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-emerald-500">Node_Andaman :: ACTIVE</span>
            </div>
            <h1 className="hero-heading font-black text-snow uppercase">
              The Island <br />
              <span className="text-emerald-500 logo-glow">Terminal.</span>
            </h1>
            <p className="text-lg md:text-xl font-medium text-parchment max-w-2xl mx-auto leading-relaxed">
              Hyper-local commerce engineered for speed. Zero delays. Absolute connectivity.
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-8 flex items-center text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                <Search size={24} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search --target listings" 
                className="w-full py-7 pl-20 pr-48 rounded-xl bg-carbon border border-warm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 outline-none text-xl font-mono text-snow placeholder:text-slate-600 shadow-elevation-high"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn-premium">
                EXECUTE
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-8 animate-slide-up font-mono text-[10px] text-slate-500 tracking-[0.2em]" style={{ animationDelay: '0.4s' }}>
             {['[ protocol: LOCAL ]', '[ secure: VERIFIED ]', '[ latency: MINIMAL ]'].map(tag => (
               <div key={tag} className="flex items-center space-x-2">
                  <span>{tag}</span>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Terminal Categories */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col space-y-12">
          <div className="flex items-end justify-between border-b border-warm pb-6">
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500">cat /categories</p>
              <h2 className="text-3xl font-heading font-black text-snow uppercase tracking-tighter">System Clusters</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map((cat, idx) => (
              <Link 
                key={cat.slug} 
                to={`/listings?category=${cat.slug}`}
                className="group relative flex flex-col items-center p-8 bg-carbon rounded-lg border border-warm hover:border-emerald-500 transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-emerald-500 group-hover:scale-110 transition-transform duration-500 logo-glow">
                  {cat.icon}
                </div>
                <span className="mt-6 font-mono text-[10px] text-slate-400 uppercase tracking-widest text-center group-hover:text-emerald-400">{cat.name}</span>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowUpRight size={12} className="text-emerald-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items Terminal */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="flex items-end justify-between border-b border-warm pb-6">
           <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500">ls -la /featured</p>
              <h2 className="text-3xl font-heading font-black text-snow uppercase tracking-tighter">Priority Units</h2>
           </div>
           <Link to="/listings" className="btn-ghost text-[10px] font-mono uppercase tracking-widest flex items-center space-x-3">
            <span>view_all --full</span>
            <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingItems ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="bg-carbon border border-warm rounded-lg h-[400px] animate-pulse p-4 space-y-6">
                <div className="aspect-[4/5] bg-abyss rounded-md"></div>
                <div className="space-y-4 px-2">
                   <div className="h-4 bg-abyss rounded w-3/4"></div>
                   <div className="h-8 bg-abyss rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} featured />
          ))}
        </div>
      </section>

      {/* Recent Registry */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-heading font-black text-snow uppercase tracking-tighter border-l-4 border-emerald-500 pl-4">Recently Initialized</h2>
            <div className="h-px flex-1 bg-warm/50 mx-8"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {loadingItems ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="bg-carbon border border-warm h-64 animate-pulse rounded-lg"></div>
            ))
          ) : recentListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
      
      {/* Call to Action Terminal */}
      <section className="max-w-7xl mx-auto px-6">
         <div className="relative rounded-lg bg-carbon border-2 border-emerald-500/20 p-12 md:p-24 overflow-hidden text-center shadow-glow">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,217,146,0.05),transparent)]"></div>
            <div className="relative z-10 max-w-2xl mx-auto space-y-10">
               <h2 className="text-4xl md:text-5xl font-heading font-black text-snow tracking-tighter uppercase leading-none">
                  Ready to stream <br /> your items?
               </h2>
               <p className="text-lg text-parchment font-medium max-w-md mx-auto">
                  Deploy your inventory to the cluster. Initialization takes &lt; 60 seconds.
               </p>
               <Link to="/post" className="inline-flex btn-premium px-12 py-5 text-xs font-mono">
                  INITIALIZE_NEW_UNIT
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
};

const ListingCard: React.FC<{ listing: ListingCardData, featured?: boolean }> = ({ listing, featured = false }) => {
  const imageUrl = listing.images && listing.images.length > 0 
    ? listing.images[0].image_url 
    : `https://picsum.photos/seed/item-${listing.id}/600/600`;

  return (
    <Link 
      to={`/listings/${listing.id}`} 
      className={`group flex flex-col bg-carbon border border-warm transition-all duration-300 hover:border-emerald-500 hover:-translate-y-1 ${featured ? 'p-3 rounded-lg' : 'rounded-lg'}`}
    >
      <div className={`relative overflow-hidden ${featured ? 'aspect-[4/5] rounded-md' : 'aspect-square rounded-t-lg'} bg-abyss`}>
        <img 
          src={imageUrl} 
          alt={listing.title} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <div className="bg-carbon/80 backdrop-blur-md px-3 py-1.5 rounded border border-warm text-[9px] font-mono text-parchment uppercase tracking-widest shadow-elevation-low flex items-center">
            <MapPin size={10} className="mr-2 text-emerald-500" /> {listing.city}
          </div>
        </div>
        {listing.is_featured && (
          <div className="absolute bottom-4 right-4 z-10">
             <div className="bg-emerald-500 text-abyss p-2 rounded shadow-glow">
                <Sparkles size={14} />
             </div>
          </div>
        )}
      </div>
      <div className={`${featured ? 'p-5 pb-3' : 'p-5'} flex flex-col flex-1 space-y-4`}>
        <div className="space-y-1">
          <h3 className="font-bold text-snow text-sm line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors uppercase font-mono tracking-tight">{listing.title}</h3>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-warm/50 pt-4">
           <div className="flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Value</span>
              <span className="text-xl font-heading font-black text-snow tracking-tighter">₹ {listing.price.toLocaleString('en-IN')}</span>
           </div>
           <div className="w-8 h-8 rounded border border-warm flex items-center justify-center text-slate-500 group-hover:border-emerald-500 group-hover:text-emerald-500 transition-all">
              <ArrowRight size={14} />
           </div>
        </div>
      </div>
    </Link>
  );
};
