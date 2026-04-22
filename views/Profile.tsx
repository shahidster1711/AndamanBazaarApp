
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Profile as ProfileType, Listing } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { ReportModal } from '../components/ReportModal';
import { 
  Edit3, 
  CheckCircle, 
  Rocket, 
  Share2, 
  Trash2, 
  MoreVertical, 
  Heart, 
  Globe, 
  ShoppingBag, 
  Calendar, 
  Camera,
  Eye,
  Save,
  X,
  Loader2,
  MapPin,
  ShieldCheck,
  Award,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'sold' | 'saved'>('active');
  const [selectedForReport, setSelectedForReport] = useState<{ id: string, title: string } | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [boostConfirmationId, setBoostConfirmationId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [boostedListings, setBoostedListings] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [lifecycleStats, setLifecycleStats] = useState({
    draft: 0,
    active: 0,
    sold: 0,
    expired: 0
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchLifecycleStats();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedItems();
    } else {
      fetchUserListings();
    }
    setActiveMenuId(null);
  }, [activeTab]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditCity(profile.city || '');
      setEditPhone(profile.phone_number || '');
      setAvatarPreview(profile.profile_photo_url || null);
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      let avatarUrl = profile?.profile_photo_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(`avatars/${fileName}`, avatarFile);
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('listings')
          .getPublicUrl(`avatars/${fileName}`);
        
        avatarUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: editName,
          city: editCity,
          phone_number: editPhone,
          profile_photo_url: avatarUrl
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await fetchProfile();
      setIsEditing(false);
      setAvatarFile(null);

    } catch (err: any) {
      alert("Failed to save profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const fetchLifecycleStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('status')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const stats = { draft: 0, active: 0, sold: 0, expired: 0 };
      data.forEach((l: any) => {
        if (l.status in stats) {
          stats[l.status as keyof typeof stats]++;
        }
      });
      setLifecycleStats(stats);
    } catch (err) {
      console.error("Error fetching lifecycle stats:", err);
    }
  };

  const fetchUserListings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', activeTab)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error("Error fetching user listings:", err);
    }
  };

  const fetchSavedItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, listing:listings(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const savedItems = (data || [])
        .map(f => f.listing)
        .filter(Boolean) as Listing[];
      
      setListings(savedItems);
    } catch (err) {
      console.error("Error fetching saved items:", err);
    }
  };

  const handleUnfavorite = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', id);
    
    if (!error) {
      setListings(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleMarkAsSold = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', id);
      
      if (error) throw error;
      
      setListings(prev => prev.filter(l => l.id !== id));
      fetchLifecycleStats();
      setActiveMenuId(null);
    } catch (err) {
      alert("Could not update listing status.");
    }
  };

  const handleBoostListing = (id: string) => {
    setBoostedListings(prev => new Set(prev).add(id));
    setBoostConfirmationId(null);
    setActiveMenuId(null);
  };

  const handleDeleteListing = async () => {
    if (!deleteConfirmationId) return;
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', deleteConfirmationId);
      
      if (error) throw error;
      
      setListings(prev => prev.filter(l => l.id !== deleteConfirmationId));
      fetchLifecycleStats();
      setDeleteConfirmationId(null);
      setActiveMenuId(null);
    } catch (err) {
      alert("Could not delete listing.");
    }
  };

  const handleShareListing = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/#/listings/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this listing on AndamanBazaar!',
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard! 📋");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
    setActiveMenuId(null);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-mono uppercase tracking-widest text-[10px] text-emerald-500 animate-pulse">Loading_Identity_Shell...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 animate-fade-in bg-abyss">
      {/* Delete Confirmation Terminal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-abyss/80 backdrop-blur-md" onClick={() => setDeleteConfirmationId(null)}></div>
          <div className="bg-carbon p-8 md:p-10 rounded-lg shadow-elevation-high max-w-md w-full relative overflow-hidden border border-red-500/30 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center text-3xl mx-auto border border-red-500/20 shadow-glow">
                <Trash2 size={32} />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-heading font-black text-snow uppercase tracking-tighter">Purge Data?</h2>
                <p className="text-slate-500 font-mono text-xs leading-loose uppercase tracking-widest">
                  IRREVERSIBLE_ACTION: ALL_ASSOCIATED_BUFFERS_WILL_BE_CLEARED
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setDeleteConfirmationId(null)}
                  className="flex-1 btn-ghost text-[10px] font-mono tracking-widest"
                >
                  ABORT
                </button>
                <button 
                  onClick={handleDeleteListing}
                  className="flex-[1.5] py-4 rounded bg-red-600 text-white font-mono text-[10px] tracking-widest shadow-glow active:scale-95 transition-all"
                >
                  CONFIRM_PURGE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boost Modal Terminal */}
      {boostConfirmationId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-abyss/80 backdrop-blur-md" onClick={() => setBoostConfirmationId(null)}></div>
          <div className="bg-carbon p-8 md:p-10 rounded-lg shadow-elevation-high max-w-md w-full relative overflow-hidden border border-emerald-500/30 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center text-3xl mx-auto border border-emerald-500/20 shadow-glow">
                <Rocket size={32} />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-heading font-black text-snow uppercase tracking-tighter">Amplify Signal</h2>
                <p className="text-slate-500 font-mono text-xs leading-loose uppercase tracking-widest">
                  GET_FEATURED: 3X_THROUGHPUT_ESTIMATED
                </p>
              </div>
              <div className="flex flex-col gap-4 pt-4">
                <button 
                  onClick={() => handleBoostListing(boostConfirmationId)}
                  className="w-full btn-premium py-5 font-mono text-[10px] tracking-widest"
                >
                  EXECUTE_BOOST --VAL=₹99
                </button>
                <button 
                  onClick={() => setBoostConfirmationId(null)}
                  className="w-full btn-ghost py-3 font-mono text-[10px] tracking-widest"
                >
                  DECLINE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header Terminal */}
      <section className="mb-12">
        <div className="relative h-56 md:h-72 bg-carbon rounded-lg shadow-elevation-high overflow-hidden border border-warm">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(#3d3a39_1px,transparent_1px)] [background-size:20px_20px]"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
          </div>
          
          <div className="absolute top-6 right-6 z-20">
             {!isEditing ? (
                 <button 
                    onClick={() => setIsEditing(true)}
                    className="btn-ghost text-[10px] font-mono tracking-widest flex items-center gap-3"
                 >
                     <Edit3 size={14} /> [ MOD_PROFILE ]
                 </button>
             ) : (
                 <div className="flex gap-4">
                     <button 
                        onClick={() => { setIsEditing(false); setAvatarPreview(profile?.profile_photo_url || null); }}
                        className="btn-ghost text-[10px] font-mono tracking-widest"
                        disabled={isSaving}
                     >
                         ABORT
                     </button>
                     <button 
                        onClick={handleSaveProfile}
                        className="btn-premium text-[10px] font-mono tracking-widest"
                        disabled={isSaving}
                     >
                         {isSaving ? 'SYNCING...' : 'SAVE_CHANGES'}
                     </button>
                 </div>
             )}
          </div>

          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 md:left-12 md:translate-x-0">
            <div className="relative group">
              <div className={`w-36 h-36 md:w-40 md:h-40 rounded border-[6px] border-abyss bg-carbon shadow-glow overflow-hidden flex items-center justify-center transition-all duration-500 ${isEditing ? 'border-emerald-500' : 'border-warm'}`}>
                <img 
                  src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
                
                {isEditing && (
                    <div 
                      className="absolute inset-0 bg-abyss/60 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera size={24} className="text-emerald-500" />
                    </div>
                )}
                
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />
              </div>
              
              {profile?.is_location_verified && !isEditing && (
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-emerald-500 text-abyss rounded flex items-center justify-center shadow-glow border-2 border-abyss">
                   <ShieldCheck size={18} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 md:mt-8 md:ml-60 px-4 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-6 text-center md:text-left">
              {isEditing ? (
                  <div className="space-y-6 max-w-md mx-auto md:mx-0">
                      <input 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full text-3xl font-heading font-black text-snow bg-abyss border border-warm focus:border-emerald-500 outline-none p-4 rounded font-mono"
                        placeholder="NAME_TOKEN"
                      />
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input 
                            value={editCity}
                            onChange={e => setEditCity(e.target.value)}
                            className="flex-1 p-4 bg-abyss border border-warm focus:border-emerald-500 rounded outline-none font-mono text-xs text-snow"
                            placeholder="LOC_ID"
                        />
                        <input 
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="flex-1 p-4 bg-abyss border border-warm focus:border-emerald-500 rounded outline-none font-mono text-xs text-snow"
                            placeholder="COMM_LINK"
                        />
                      </div>
                  </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-4xl md:text-5xl font-heading font-black text-snow tracking-tighter uppercase leading-none border-l-4 border-emerald-500 pl-6">
                    {profile?.name || 'ISLANDER_NULL'}
                  </h3>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <div className="flex items-center space-x-3 px-4 py-2 bg-carbon border border-warm rounded text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      <Calendar size={14} className="text-emerald-500" />
                      <span>EPOCH: {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2024'}</span>
                    </div>

                    {profile?.is_location_verified && (
                      <div className="flex items-center space-x-3 px-4 py-2 bg-emerald-500/5 text-emerald-500 border border-emerald-500/20 rounded text-[10px] font-mono uppercase tracking-widest shadow-glow">
                        <ShieldCheck size={14} />
                        <span>VERIFIED_NODE</span>
                      </div>
                    )}

                    {profile?.trust_level === 'legend' && (
                      <div className="flex items-center space-x-3 px-4 py-2 bg-emerald-500/5 text-emerald-500 border border-emerald-500/20 rounded text-[10px] font-mono uppercase tracking-widest shadow-glow">
                        <Award size={14} />
                        <span>LEGEND_CLASS</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-10 bg-carbon p-6 rounded-lg border border-warm shadow-elevation-low">
              <div className="text-center group cursor-pointer" onClick={() => setActiveTab('active')}>
                <p className="text-3xl font-heading font-black text-snow leading-none group-hover:text-emerald-500 transition-colors uppercase">{lifecycleStats.active}</p>
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mt-3">ACTIVE_UNITS</p>
              </div>
              <div className="w-px h-10 bg-warm/50"></div>
              <div className="text-center group cursor-pointer" onClick={() => setActiveTab('sold')}>
                <p className="text-3xl font-heading font-black text-snow leading-none group-hover:text-emerald-500 transition-colors uppercase">{lifecycleStats.sold}</p>
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mt-3">PROCESSED_OPS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Terminal */}
      <div className="flex items-center justify-center mb-12">
        <div className="inline-flex bg-carbon p-1.5 rounded border border-warm">
          {[
            { id: 'active', label: 'INVENTORY', icon: <Globe size={14} /> },
            { id: 'sold', label: 'ARCHIVE', icon: <ShoppingBag size={14} /> },
            { id: 'saved', label: 'WATCHLIST', icon: <Heart size={14} /> }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-8 py-3 rounded text-[10px] font-mono uppercase tracking-widest transition-all flex items-center space-x-3 ${
                activeTab === tab.id 
                  ? 'bg-abyss text-emerald-500 border border-emerald-500/30 shadow-glow font-bold' 
                  : 'text-slate-600 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Registry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-carbon rounded-lg border-2 border-dashed border-warm animate-fade-in">
            <div className="text-5xl mb-8 opacity-20">📡</div>
            <h3 className="text-2xl font-heading font-black text-snow uppercase tracking-tighter">Empty Buffer</h3>
            <p className="text-slate-600 font-mono text-xs max-w-xs mx-auto mt-4 uppercase tracking-[0.2em] leading-loose">
              No active data streams detected. Initialize a new unit to begin.
            </p>
            <Link to="/post" className="mt-10 btn-premium inline-block px-12 font-mono text-[10px] tracking-widest">
              DEPLOY_FIRST_UNIT
            </Link>
          </div>
        ) : (
          listings.map((item) => {
            const isBoosted = boostedListings.has(item.id!);
            const isMenuOpen = activeMenuId === item.id;

            return (
              <div key={item.id} className="relative group/card">
                <div 
                  className={`bg-carbon border rounded transition-all duration-300 relative h-full flex flex-col ${
                    isBoosted ? 'border-emerald-500 shadow-glow' : 'border-warm hover:border-emerald-500/50'
                  }`}
                >
                  <Link to={`/listings/${item.id}`} className="block overflow-hidden relative">
                    <div className="h-64 bg-abyss relative">
                      <img src={`https://picsum.photos/seed/list-${item.id}/800/600`} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-1000" alt="" />
                      
                      {isBoosted && (
                        <div className="absolute top-4 left-4 bg-emerald-500 text-abyss px-3 py-1.5 rounded font-mono font-bold text-[9px] uppercase tracking-widest shadow-glow z-20">
                          PRIORITY_BOOSTED
                        </div>
                      )}

                      {item.status === 'sold' && (
                        <div className="absolute inset-0 bg-abyss/80 backdrop-blur-[2px] flex items-center justify-center z-10 border-2 border-warm m-2">
                            <span className="text-snow px-6 py-2 font-mono font-black text-2xl uppercase tracking-tighter -rotate-6 border-2 border-emerald-500 shadow-glow">PROCESSED</span>
                        </div>
                      )}
                      
                      <div className="absolute top-4 right-4 z-20">
                        {activeTab === 'saved' ? (
                          <button 
                            onClick={(e) => handleUnfavorite(item.id!, e)}
                            className="w-10 h-10 glass rounded flex items-center justify-center text-red-500 shadow-glow transition-all"
                          >
                            <Heart size={18} fill="currentColor" />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              setActiveMenuId(isMenuOpen ? null : item.id); 
                            }}
                            className={`w-10 h-10 rounded flex items-center justify-center transition-all border ${
                              isMenuOpen ? 'bg-emerald-500 text-abyss border-emerald-400' : 'glass text-slate-400 border-warm'
                            }`}
                          >
                            <MoreVertical size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="p-6 flex flex-col flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <h3 className="font-mono font-bold text-snow text-base uppercase tracking-tight truncate flex-1 mr-4">{item.title}</h3>
                      <span className="font-heading font-black text-snow text-lg">₹{item.price?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-warm/30">
                       <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                         <MapPin size={10} className="text-emerald-500" />
                         <span>{item.city}</span>
                       </div>
                       <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                         <Eye size={10} />
                         <span>{item.views_count || 0} PINGS</span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Action Menu Dropdown Terminal */}
                {isMenuOpen && (
                  <div 
                    ref={menuRef}
                    className="absolute top-16 right-4 w-60 bg-abyss rounded border border-emerald-500/50 shadow-elevation-high p-2 z-[60] animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1">
                      <button 
                        onClick={() => navigate(`/post?edit=${item.id}`)}
                        className="w-full flex items-center space-x-4 p-3 hover:bg-carbon rounded transition-colors group text-left"
                      >
                        <Edit3 size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-snow">MOD_UNIT</span>
                      </button>
                      
                      {activeTab === 'active' && (
                        <>
                          <button 
                            onClick={(e) => handleMarkAsSold(item.id!, e)}
                            className="w-full flex items-center space-x-4 p-3 hover:bg-carbon rounded transition-colors group text-left"
                          >
                            <CheckCircle size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-snow">SET_SOLDOUT</span>
                          </button>

                          {!isBoosted && (
                            <button 
                              onClick={() => setBoostConfirmationId(item.id!)}
                              className="w-full flex items-center space-x-4 p-3 hover:bg-carbon rounded transition-colors group text-left"
                            >
                              <Rocket size={16} className="text-emerald-500" />
                              <span className="text-[10px] font-mono uppercase tracking-widest text-snow">BOOST_SIGNAL</span>
                            </button>
                          )}
                        </>
                      )}

                      <button 
                        onClick={(e) => handleShareListing(item.id!, e)}
                        className="w-full flex items-center space-x-4 p-3 hover:bg-carbon rounded transition-colors group text-left"
                      >
                        <Share2 size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-snow">FORK_LINK</span>
                      </button>

                      <div className="h-px bg-warm/30 my-2 mx-2"></div>

                      <button 
                        onClick={() => setDeleteConfirmationId(item.id!)}
                        className="w-full flex items-center space-x-4 p-3 hover:bg-red-500/10 rounded transition-colors group text-red-500 text-left"
                      >
                        <Trash2 size={16} />
                        <span className="text-[10px] font-mono uppercase tracking-widest">RM_-RF_UNIT</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ReportModal
        isOpen={!!selectedForReport}
        onClose={() => setSelectedForReport(null)}
        listingId={selectedForReport?.id || ''}
        listingTitle={selectedForReport?.title || ''}
      />
    </div>
  );
};
