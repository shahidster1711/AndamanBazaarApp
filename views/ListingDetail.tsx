
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ReportModal } from '../components/ReportModal';
import { Listing, Profile } from '../types';
import { MapPin, Shield, Share2, MessageSquare, Heart, ChevronLeft, AlertCircle, Edit3, Loader2 } from 'lucide-react';

export const ListingDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchListingDetails();
    checkFavoriteStatus();
    incrementViews();
  }, [id]);

  const incrementViews = async () => {
    if (!id) return;
    try {
      await supabase.rpc('increment_listing_views', { listing_id: id });
    } catch (err) {
      console.warn("Failed to increment views:", err);
    }
  };

  const fetchListingDetails = async () => {
    try {
      if (!id) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data, error } = await supabase
        .from('listings')
        .select('*, images:listing_images(*), seller:profiles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setListing(data);
      if (data.seller) setSeller(data.seller);
      
      if (data.images) {
        data.images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      }

    } catch (err) {
      console.error("Error fetching listing:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .single();

      setIsFavorited(!!data);
    } catch (err) {
      console.error("Error checking favorite:", err);
    }
  };

  const toggleFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to save items.");
        return;
      }
      if (!id) return;

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', id);
        
        if (!error) setIsFavorited(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: id });
        
        if (!error) setIsFavorited(true);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing?.title || 'AndamanBazaar Listing',
          text: `Check out this ${listing?.title} on AndamanBazaar!`,
          url: window.location.href
        });
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[4/3] bg-slate-100 rounded-[32px]"></div>
          <div className="h-8 bg-slate-100 w-3/4 rounded-xl"></div>
          <div className="h-12 bg-slate-200 w-1/4 rounded-xl"></div>
          <div className="space-y-3">
             <div className="h-4 bg-slate-100 w-full rounded"></div>
             <div className="h-4 bg-slate-100 w-5/6 rounded"></div>
             <div className="h-4 bg-slate-100 w-4/6 rounded"></div>
          </div>
        </div>
        <div className="bg-slate-50 h-64 rounded-[32px]"></div>
      </div>
    </div>
  );

  if (!listing) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 p-4 text-center">
      <h2 className="text-3xl font-heading font-black text-slate-900 uppercase">Item Missing</h2>
      <Link to="/listings" className="bg-ocean-700 text-white px-8 py-3 rounded-2xl font-bold uppercase text-xs tracking-widest">Back to Market</Link>
    </div>
  );

  const mainImage = listing.images && listing.images.length > 0 
    ? listing.images[activeImage]?.image_url 
    : `https://picsum.photos/seed/item-det-${id}/1000/750`;

  const images = listing.images && listing.images.length > 0 
    ? listing.images 
    : [{ image_url: mainImage, id: 'default' }];

  const isOwner = currentUserId === listing.user_id;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 animate-fade-in bg-abyss">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Gallery & Content Terminal */}
        <div className="lg:col-span-2 space-y-12">
          <div className="relative group">
            <div className="aspect-[4/3] bg-carbon rounded-lg overflow-hidden shadow-elevation-high border border-warm">
              <img src={mainImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={listing.title} loading="eager" />
            </div>
            
            <button onClick={() => navigate(-1)} className="absolute top-8 left-8 w-12 h-12 glass rounded flex items-center justify-center shadow-glow active:scale-95 transition-transform z-10 text-snow">
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>

            <div className="absolute top-8 right-8 flex flex-col gap-4">
              <button onClick={toggleFavorite} className={`w-12 h-12 glass rounded flex items-center justify-center shadow-glow transition-all z-10 ${isFavorited ? 'text-emerald-500 scale-110 border-emerald-500/50' : 'text-slate-500 hover:text-emerald-400'}`}>
                <Heart fill={isFavorited ? "currentColor" : "none"} size={24} strokeWidth={2.5} />
              </button>
              <button onClick={handleShare} className="w-12 h-12 glass rounded flex items-center justify-center shadow-glow text-slate-500 hover:text-emerald-400 z-10">
                <Share2 size={24} strokeWidth={2.5} />
              </button>
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-4 mt-6 overflow-x-auto pb-4 no-scrollbar">
                 {images.map((img: any, idx: number) => (
                   <button 
                    key={img.id || idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 transition-all duration-300 ${activeImage === idx ? 'border-emerald-500 scale-95 shadow-glow' : 'border-warm hover:border-emerald-500/50'}`}
                   >
                     <img src={img.image_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                   </button>
                 ))}
              </div>
            )}
          </div>

          <div className="space-y-12 bg-carbon rounded-lg p-8 md:p-12 border border-warm shadow-elevation-low">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-abyss text-emerald-500 text-[10px] font-mono px-4 py-1.5 rounded border border-emerald-500/30 uppercase tracking-[0.2em]">
                  cat /type/{listing.category_id || 'unit'}
                </span>
                <span className="bg-abyss text-slate-400 text-[10px] font-mono px-4 py-1.5 rounded border border-warm uppercase tracking-[0.2em]">
                  status: {listing.condition?.replace('_', ' ') || 'nominal'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-black text-snow tracking-tighter uppercase border-l-8 border-emerald-500 pl-8">
                {listing.title}
              </h1>
              <div className="flex flex-col bg-abyss p-8 rounded-lg border border-warm/50">
                 <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em] mb-4">valuation::registry</span>
                 <span className="text-5xl md:text-6xl font-heading font-black text-snow tracking-tighter">
                   ₹ {listing.price.toLocaleString('en-IN')}
                 </span>
              </div>
            </div>

            <div className="h-px bg-warm/30 w-full"></div>

            <div className="space-y-6">
               <h3 className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">cat description.log</h3>
               <p className="text-parchment font-medium text-lg leading-relaxed max-w-3xl whitespace-pre-wrap font-sans">
                 {listing.description}
               </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'NODE_LOC', value: listing.city, icon: <MapPin size={14} className="text-emerald-500" /> },
                { label: 'NET_AREA', value: listing.area || 'GRID_SYNC', icon: <Shield size={14} className="text-emerald-500" /> },
                { label: 'INTERACT', value: `${listing.views_count || 0}_pings`, icon: <Sparkles size={14} className="text-emerald-500" /> },
              ].map(spec => (
                <div key={spec.label} className="p-6 bg-abyss rounded border border-warm flex flex-col space-y-3">
                   <div className="flex items-center space-x-3 border-b border-warm/30 pb-3">
                      {spec.icon}
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">{spec.label}</span>
                   </div>
                   <span className="font-mono font-bold text-snow text-sm tracking-widest uppercase">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Shell Terminal */}
        <div className="lg:sticky lg:top-28 space-y-8">
          <div className="bg-carbon rounded-lg p-8 border border-warm shadow-elevation-high space-y-10">
            <div className="flex items-center space-x-6">
               <div className="w-16 h-16 rounded bg-abyss border border-warm overflow-hidden shadow-glow">
                 <img src={seller?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller?.id || 'User'}`} alt="Seller" className="w-full h-full object-cover" loading="lazy" />
               </div>
               <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-mono font-black text-snow text-lg tracking-tight leading-none uppercase">{seller?.name || 'anonymous_node'}</h4>
                    {seller?.is_location_verified && <div className="w-4 h-4 bg-emerald-500 text-abyss rounded-full flex items-center justify-center text-[8px] shadow-glow">✓</div>}
                  </div>
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">EPOCH_START: {seller?.created_at ? new Date(seller.created_at).getFullYear() : '2024'}</p>
               </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-warm/30">
              {isOwner ? (
                <Link to={`/post?edit=${listing.id}`} className="w-full btn-ghost py-4 font-mono text-[10px] tracking-[0.2em] flex items-center justify-center space-x-4 active:scale-95 transition-all">
                  <Edit3 size={16} /> <span>[ MOD_REGISTRY ]</span>
                </Link>
              ) : (
                <Link to={`/chats/${id}`} className="w-full btn-premium py-4 font-mono text-[10px] tracking-[0.2em] flex items-center justify-center space-x-4 active:scale-95 transition-all">
                  <MessageSquare size={16} /> <span>[ OPEN_SHELL ]</span>
                </Link>
              )}
              <p className="text-center text-[9px] font-mono text-slate-600 uppercase tracking-widest animate-pulse">LATENCY: &lt; 120ms</p>
            </div>

            <div className="bg-abyss rounded p-6 border border-emerald-500/20 flex items-center space-x-4">
               <div className="w-8 h-8 rounded bg-carbon flex items-center justify-center text-emerald-500 border border-warm shadow-glow">
                  <Shield size={16} />
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-mono text-snow uppercase tracking-widest">Protocol Secured</p>
                  <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">End-to-End Handshake</p>
               </div>
            </div>
          </div>

          <button onClick={() => setIsReportModalOpen(true)} className="w-full py-4 text-[9px] font-mono text-slate-600 uppercase tracking-[0.4em] flex items-center justify-center space-x-3 hover:text-emerald-500 transition-colors">
            <AlertCircle size={14} /> <span>REPORT_ANOMALY</span>
          </button>
        </div>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} listingId={id || ''} listingTitle={listing.title} />
    </div>
  );
};
