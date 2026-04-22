
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
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 animate-fade-in bg-slate-50">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Gallery & Content */}
        <div className="lg:col-span-2 space-y-12">
          <div className="relative group">
            <div className="aspect-[4/3] bg-white rounded-[48px] overflow-hidden shadow-premium border border-slate-100">
              <img src={mainImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={listing.title} loading="eager" />
            </div>
            
            <button onClick={() => navigate(-1)} className="absolute top-8 left-8 w-14 h-14 glass rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10 text-slate-950">
              <ChevronLeft size={32} strokeWidth={2.5} />
            </button>

            <div className="absolute top-8 right-8 flex flex-col gap-4">
              <button onClick={toggleFavorite} className={`w-14 h-14 glass rounded-2xl flex items-center justify-center shadow-lg transition-all z-10 ${isFavorited ? 'text-coral-500 scale-110' : 'text-slate-900/40 hover:text-coral-500'}`}>
                <Heart fill={isFavorited ? "currentColor" : "none"} size={28} strokeWidth={2.5} />
              </button>
              <button onClick={handleShare} className="w-14 h-14 glass rounded-2xl flex items-center justify-center shadow-lg text-slate-900/40 hover:text-ocean-600 z-10">
                <Share2 size={28} strokeWidth={2.5} />
              </button>
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-4 mt-8 overflow-x-auto pb-4 no-scrollbar">
                 {images.map((img: any, idx: number) => (
                   <button 
                    key={img.id || idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-24 h-24 rounded-3xl overflow-hidden border-4 transition-all duration-300 ${activeImage === idx ? 'border-ocean-500 scale-95 shadow-md' : 'border-white shadow-sm hover:border-ocean-200'}`}
                   >
                     <img src={img.image_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                   </button>
                 ))}
              </div>
            )}
          </div>

          <div className="space-y-12 bg-white rounded-[48px] p-8 md:p-12 shadow-sm border border-slate-100">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-ocean-50 text-ocean-600 text-[10px] font-black px-6 py-2.5 rounded-2xl uppercase tracking-[0.2em] border border-ocean-100">
                  {listing.category_id || 'Premium Item'}
                </span>
                <span className="bg-coral-50 text-coral-600 text-[10px] font-black px-6 py-2.5 rounded-2xl uppercase tracking-[0.2em] border border-coral-100">
                  {listing.condition?.replace('_', ' ') || 'Pristine'}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-heading font-black text-slate-950 tracking-tighter leading-[0.9] uppercase">
                {listing.title}
              </h1>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Listing Price</span>
                 <span className="text-5xl md:text-6xl font-heading font-black text-slate-950 tracking-tighter">
                   ₹ {listing.price.toLocaleString('en-IN')}
                 </span>
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full"></div>

            <div className="space-y-6">
               <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em]">Curated Description</h3>
               <p className="text-slate-600 font-medium text-xl leading-relaxed max-w-3xl whitespace-pre-wrap">
                 {listing.description}
               </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { label: 'Location', value: listing.city, icon: <MapPin size={14} className="text-ocean-500" /> },
                { label: 'Neighborhood', value: listing.area || 'Verified Area', icon: <Shield size={14} className="text-ocean-500" /> },
                { label: 'Market Reach', value: `${listing.views_count || 0} Interactions`, icon: <Sparkles size={14} className="text-ocean-500" /> },
              ].map(spec => (
                <div key={spec.label} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col space-y-2">
                   <div className="flex items-center space-x-2">
                      {spec.icon}
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{spec.label}</span>
                   </div>
                   <span className="font-black text-slate-950 text-base tracking-tight uppercase">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seller Card */}
        <div className="lg:sticky lg:top-28 space-y-8">
          <div className="bg-white rounded-[48px] p-8 shadow-premium border border-slate-100 space-y-10">
            <div className="flex items-center space-x-6">
               <div className="w-20 h-20 rounded-[28px] bg-slate-50 border border-slate-100 overflow-hidden shadow-sm">
                 <img src={seller?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller?.id || 'User'}`} alt="Seller" className="w-full h-full object-cover" loading="lazy" />
               </div>
               <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-heading font-black text-slate-950 text-xl tracking-tight leading-none uppercase">{seller?.name || 'Verified Seller'}</h4>
                    {seller?.is_location_verified && <div className="w-5 h-5 bg-ocean-500 text-white rounded-lg flex items-center justify-center text-[10px] shadow-sm shadow-ocean-500/20">✓</div>}
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Member since {seller?.created_at ? new Date(seller.created_at).getFullYear() : '2024'}</p>
               </div>
            </div>

            <div className="space-y-4">
              {isOwner ? (
                <Link to={`/post?edit=${listing.id}`} className="w-full bg-slate-950 text-white py-6 rounded-[24px] font-black uppercase text-xs flex items-center justify-center space-x-4 shadow-xl active:scale-95 transition-all">
                  <Edit3 size={20} /> <span>Modify Listing</span>
                </Link>
              ) : (
                <Link to={`/chats/${id}`} className="w-full btn-premium py-6 rounded-[24px] font-black uppercase text-xs flex items-center justify-center space-x-4 active:scale-95 transition-all">
                  <MessageSquare size={20} /> <span>Contact Seller</span>
                </Link>
              )}
              <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Typical response time: &lt; 2 hours</p>
            </div>

            <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 flex items-center space-x-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-ocean-500 shadow-sm border border-slate-100">
                  <Shield size={20} />
               </div>
               <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-950 uppercase tracking-widest">Buyer Protection</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Verified Local Transaction</p>
               </div>
            </div>
          </div>

          <button onClick={() => setIsReportModalOpen(true)} className="w-full py-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center justify-center space-x-3 hover:text-coral-500 transition-colors">
            <AlertCircle size={16} /> <span>Anonymously Report</span>
          </button>
        </div>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} listingId={id || ''} listingTitle={listing.title} />
    </div>
  );
};
