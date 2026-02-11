
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
    <div className="max-w-7xl mx-auto px-4 py-8 animate-slide-up">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Gallery & Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative group">
            <div className="aspect-[4/3] bg-slate-100 rounded-[32px] overflow-hidden shadow-xl border-2 border-slate-100">
              <img src={mainImage} className="w-full h-full object-cover" alt={listing.title} loading="eager" />
            </div>
            
            <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg border-2 border-white active:scale-95 transition-transform z-10 text-slate-900">
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>

            <div className="absolute top-4 right-4 flex flex-col gap-3">
              <button onClick={toggleFavorite} className={`w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg border-2 border-white transition-all z-10 ${isFavorited ? 'text-coral-500 scale-105' : 'text-slate-400'}`}>
                <Heart fill={isFavorited ? "currentColor" : "none"} size={24} strokeWidth={2.5} />
              </button>
              <button onClick={handleShare} className="w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg border-2 border-white text-slate-400 z-10">
                <Share2 size={24} strokeWidth={2.5} />
              </button>
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                 {images.map((img: any, idx: number) => (
                   <button 
                    key={img.id || idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-4 transition-all ${activeImage === idx ? 'border-ocean-600 scale-95 shadow-md' : 'border-transparent'}`}
                   >
                     <img src={img.image_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                   </button>
                 ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-ocean-100 text-ocean-800 text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border border-ocean-200">
                  {listing.category_id || 'Item'}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border border-emerald-200">
                  {listing.condition?.replace('_', ' ') || 'Good'}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-heading font-black text-slate-900 tracking-tight leading-tight">
                {listing.title}
              </h1>
              <span className="text-4xl md:text-5xl font-heading font-black text-slate-900 tracking-tighter">
                ₹ {listing.price.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="space-y-4">
               <h3 className="text-xl font-heading font-black text-slate-900 tracking-tight uppercase">Description</h3>
               <p className="text-slate-800 font-medium text-lg leading-relaxed max-w-2xl whitespace-pre-wrap">
                 {listing.description}
               </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'City', value: listing.city },
                { label: 'Area', value: listing.area || 'N/A' },
                { label: 'Views', value: listing.views_count || 0 },
              ].map(spec => (
                <div key={spec.label} className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col space-y-1">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{spec.label}</span>
                   <span className="font-bold text-slate-900 text-base tracking-tight">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seller Card */}
        <div className="lg:sticky lg:top-28 space-y-6">
          <div className="bg-white rounded-[32px] p-6 shadow-xl border-2 border-slate-100 space-y-6">
            <div className="flex items-center space-x-4 pb-6 border-b-2 border-slate-100">
               <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden">
                 <img src={seller?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller?.id || 'User'}`} alt="Seller" className="w-full h-full object-cover" loading="lazy" />
               </div>
               <div>
                  <div className="flex items-center space-x-1">
                    <h4 className="font-heading font-black text-slate-900 text-lg leading-none">{seller?.name || 'Island Seller'}</h4>
                    {seller?.is_location_verified && <div className="w-5 h-5 bg-ocean-600 text-white rounded-full flex items-center justify-center text-[10px] border border-white">✓</div>}
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Member since {seller?.created_at ? new Date(seller.created_at).getFullYear() : '2024'}</p>
               </div>
            </div>

            <div className="space-y-3">
              {isOwner ? (
                <Link to={`/post?edit=${listing.id}`} className="w-full bg-slate-100 text-slate-900 py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center space-x-3 border-2 border-slate-200">
                  <Edit3 size={18} /> <span>Edit My Listing</span>
                </Link>
              ) : (
                <Link to={`/chats/${id}`} className="w-full bg-ocean-700 text-white py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center space-x-3 shadow-lg shadow-ocean-700/20 hover:bg-ocean-800 transition-all">
                  <MessageSquare size={18} /> <span>Chat Now</span>
                </Link>
              )}
            </div>
          </div>

          <button onClick={() => setIsReportModalOpen(true)} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center space-x-2 hover:text-coral-600 transition-colors">
            <AlertCircle size={14} /> <span>Report Listing</span>
          </button>
        </div>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} listingId={id || ''} listingTitle={listing.title} />
    </div>
  );
};
