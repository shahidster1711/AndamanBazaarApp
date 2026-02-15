
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
  LogOut
} from 'lucide-react';
import { profileUpdateSchema, validateFileUpload, sanitizePlainText } from '../lib/validation';
import { logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { logout } from '../lib/auth';
import { useToast } from '../components/Toast';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
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

      // Sanitize inputs
      const sanitizedName = sanitizePlainText(editName);
      const sanitizedCity = sanitizePlainText(editCity);
      const sanitizedPhone = sanitizePlainText(editPhone);

      // Validate profile data
      const validationResult = profileUpdateSchema.safeParse({
        name: sanitizedName,
        phone_number: sanitizedPhone,
        city: sanitizedCity
      });

      if (!validationResult.success) {
        showToast(validationResult.error.issues[0].message, 'error');
        await logAuditEvent({
          action: 'profile_validation_failed',
          status: 'blocked',
          metadata: { errors: validationResult.error.issues }
        });
        setIsSaving(false);
        return;
      }

      let avatarUrl = profile?.profile_photo_url;

      // Validate avatar file if provided
      if (avatarFile) {
        const fileValidation = validateFileUpload(avatarFile, {
          maxSizeMB: 5,
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
        });

        if (!fileValidation.valid) {
          showToast(fileValidation.error, 'error');
          await logAuditEvent({
            action: 'avatar_upload_blocked',
            status: 'blocked',
            metadata: { reason: fileValidation.error }
          });
          setIsSaving(false);
          return;
        }

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
          name: sanitizedName,
          city: sanitizedCity,
          phone_number: sanitizedPhone,
          profile_photo_url: avatarUrl
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Log successful profile update
      await logAuditEvent({
        action: 'profile_updated',
        resource_type: 'profile',
        resource_id: user.id,
        status: 'success',
        metadata: { updated_fields: ['name', 'city', 'phone'] }
      });

      await fetchProfile();
      showToast("Profile updated successfully!", "success");
      setIsEditing(false);
      setAvatarFile(null);

    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast("Failed to save profile: " + safeError, "error");
      await logAuditEvent({
        action: 'profile_update_failed',
        status: 'failed',
        metadata: { error: safeError }
      });
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

  const handleLogout = async () => {
    const result = await logout();

    if (result.success) {
      navigate('/auth');
    } else {
      showToast(result.error || 'Failed to logout. Please try again.', 'error');
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
      showToast("Could not update listing status.", "error");
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
      // Soft-delete: set status to 'deleted' instead of removing
      const { error } = await supabase
        .from('listings')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', deleteConfirmationId);

      if (error) throw error;

      setListings(prev => prev.filter(l => l.id !== deleteConfirmationId));
      fetchLifecycleStats();
      setDeleteConfirmationId(null);
      setActiveMenuId(null);
      showToast('Listing removed. It can be recovered within 30 days.', 'success');
    } catch (err) {
      showToast('Could not delete listing. Please try again.', 'error');
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
        showToast("Link copied to clipboard! 📋", "success");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
    setActiveMenuId(null);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-ocean-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 animate-slide-up">
      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setDeleteConfirmationId(null)}></div>
          <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl max-w-md w-full relative overflow-hidden border-2 border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-coral-50 text-coral-500 rounded-[32px] flex items-center justify-center text-3xl mx-auto shadow-inner border border-coral-100">
                <Trash2 size={40} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-heading font-black text-slate-900 tracking-tight">Permanent Removal?</h2>
                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                  This listing will be gone forever. All chats, views, and favorites associated with it will be deleted.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setDeleteConfirmationId(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-[10px] tracking-widest"
                >
                  Keep Ad
                </button>
                <button
                  onClick={handleDeleteListing}
                  className="flex-[1.5] py-4 rounded-2xl font-black bg-coral-600 text-white shadow-xl shadow-coral-500/20 hover:bg-coral-700 active:scale-95 transition-all uppercase text-[10px] tracking-widest border border-coral-700"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boost Modal */}
      {boostConfirmationId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setBoostConfirmationId(null)}></div>
          <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl max-w-md w-full relative overflow-hidden border-2 border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-[32px] flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-100">
                <Rocket size={40} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-heading font-black text-slate-900 tracking-tight">Boost Visibility</h2>
                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                  Get featured at the top of the island search results for 7 days. Our data shows 3x faster sales for boosted ads.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={() => handleBoostListing(boostConfirmationId)}
                  className="w-full py-5 rounded-2xl font-black bg-amber-500 text-black shadow-xl shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                >
                  Boost for ₹99
                </button>
                <button
                  onClick={() => setBoostConfirmationId(null)}
                  className="w-full py-3 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-[10px] tracking-widest"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header Redesign */}
      <section className="mb-12">
        {/* Prominent Cover Photo Area */}
        <div className="relative h-56 md:h-80 bg-slate-900 rounded-b-[48px] md:rounded-[48px] shadow-2xl overflow-hidden border-b-8 border-ocean-700">
          <div className="absolute inset-0 opacity-40">
            {/* Artistic Island Gradient / Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-ocean-600 via-slate-900 to-coral-600"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-ocean-400/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          </div>

          {/* Action Buttons in Cover Area */}
          <div className="absolute top-6 right-6 z-20">
            {!isEditing ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20 shadow-lg"
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-coral-600/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-coral-700 transition-all flex items-center gap-2 border border-coral-700/50 shadow-lg"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsEditing(false); setAvatarPreview(profile?.profile_photo_url || null); }}
                  className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20"
                  disabled={isSaving}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="bg-white text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center gap-2 shadow-xl"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Large Circular Profile Photo with Overlap */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 md:left-12 md:translate-x-0">
            <div className="relative group">
              <div className={`w-36 h-36 md:w-48 md:h-48 rounded-full border-[10px] border-white bg-slate-100 shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-500 ${isEditing ? 'ring-8 ring-ocean-600/20' : ''}`}>
                <img
                  src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />

                {isEditing && (
                  <div
                    className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center cursor-pointer group-hover:bg-slate-950/60 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center text-white space-y-2">
                      <Camera size={32} strokeWidth={2.5} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Update Photo</span>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Floating Verified Check (Visual Only enhancement) */}
              {profile?.is_location_verified && !isEditing && (
                <div className="absolute bottom-2 right-2 w-10 h-10 md:w-12 md:h-12 bg-ocean-600 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                  <ShieldCheck size={24} strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Info & Badges */}
        <div className="mt-20 md:mt-6 md:ml-64 px-4 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 max-w-md mx-auto md:mx-0">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full text-3xl font-heading font-black text-slate-900 border-b-4 border-slate-100 focus:border-ocean-600 outline-none pb-2 bg-transparent"
                    placeholder="Full Name"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={editCity}
                        onChange={e => setEditCity(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-xs font-bold text-slate-600 border-2 border-slate-100 rounded-2xl focus:border-ocean-600 outline-none bg-slate-50"
                        placeholder="City"
                      />
                    </div>
                    <input
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="flex-1 px-4 py-3 text-xs font-bold text-slate-600 border-2 border-slate-100 rounded-2xl focus:border-ocean-600 outline-none bg-slate-50"
                      placeholder="Phone (e.g. +91 99330...)"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-4xl md:text-5xl font-heading font-black text-slate-950 tracking-tight leading-tight">
                    {profile?.name || 'Local Islander'}
                  </h3>

                  {/* High Visibility Badges */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <div className="flex items-center space-x-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl border-2 border-slate-200 shadow-sm">
                      <Calendar size={16} className="text-ocean-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Member since {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2024'}</span>
                    </div>

                    {profile?.is_location_verified && (
                      <div className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border-2 border-emerald-100 shadow-sm">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Verified Resident</span>
                      </div>
                    )}

                    {profile?.trust_level === 'legend' && (
                      <div className="flex items-center space-x-2 px-5 py-2.5 bg-amber-50 text-amber-700 rounded-2xl border-2 border-amber-100 shadow-sm">
                        <Award size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Island Legend</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Summary */}
            <div className="flex items-center justify-center gap-10 md:bg-white md:p-6 md:rounded-[32px] md:border-2 md:border-slate-100 md:shadow-sm">
              <div className="text-center group cursor-pointer" onClick={() => setActiveTab('active')}>
                <p className="text-3xl font-heading font-black text-slate-900 leading-none group-hover:text-ocean-700 transition-colors">{lifecycleStats.active}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Active Ads</p>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
              <div className="text-center group cursor-pointer" onClick={() => setActiveTab('sold')}>
                <p className="text-3xl font-heading font-black text-slate-900 leading-none group-hover:text-emerald-700 transition-colors">{lifecycleStats.sold}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Sold items</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex bg-slate-100 p-1.5 rounded-[24px] border border-slate-200">
          {[
            { id: 'active', label: 'My Listings', icon: <Globe size={14} /> },
            { id: 'sold', label: 'Sale History', icon: <ShoppingBag size={14} /> },
            { id: 'saved', label: 'My Favorites', icon: <Heart size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center space-x-2 ${activeTab === tab.id
                ? 'bg-white shadow-xl text-ocean-700 border border-slate-100'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100 animate-in fade-in duration-700">
            <div className="text-5xl mb-6 grayscale">🏝️</div>
            <h3 className="text-xl font-heading font-black text-slate-900 uppercase tracking-tight">No Items Found</h3>
            <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto mt-2">
              It looks quiet here. Start buying or selling within our island community today!
            </p>
            <Link to="/post" className="mt-8 inline-block bg-ocean-700 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">
              Create First Listing
            </Link>
          </div>
        ) : (
          listings.map((item) => {
            const isBoosted = boostedListings.has(item.id!);
            const isMenuOpen = activeMenuId === item.id;

            return (
              <div key={item.id} className="relative group/card">
                <div
                  className={`bg-white border-2 rounded-[40px] overflow-hidden transition-all duration-300 relative h-full flex flex-col ${isBoosted ? 'border-amber-400 shadow-xl shadow-amber-500/10' : 'border-slate-100 hover:border-ocean-300 hover:shadow-2xl hover:shadow-slate-200'
                    }`}
                >
                  <Link to={`/listings/${item.id}`} className="block overflow-hidden relative">
                    <div className="h-64 bg-slate-100 relative">
                      <img src={`https://picsum.photos/seed/list-${item.id}/800/600`} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700" alt="" />

                      {isBoosted && (
                        <div className="absolute top-4 left-4 bg-amber-400 text-black px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center z-20">
                          ✨ Priority Boosted
                        </div>
                      )}

                      {item.status === 'sold' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <span className="border-4 border-white text-white px-6 py-2 font-heading font-black text-2xl uppercase tracking-tighter -rotate-6 shadow-2xl">SOLD</span>
                        </div>
                      )}

                      <div className="absolute top-4 right-4 z-20">
                        {activeTab === 'saved' ? (
                          <button
                            onClick={(e) => handleUnfavorite(item.id!, e)}
                            className="w-12 h-12 bg-white/95 backdrop-blur rounded-2xl flex items-center justify-center text-coral-500 shadow-xl hover:scale-110 active:scale-90 transition-all border-2 border-white"
                          >
                            <Heart size={22} fill="currentColor" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : item.id);
                            }}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all border-2 ${isMenuOpen ? 'bg-ocean-700 text-white border-ocean-800' : 'bg-white/95 backdrop-blur text-slate-500 border-white'
                              }`}
                          >
                            <MoreVertical size={22} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-heading font-black text-xl uppercase tracking-tight truncate flex-1 mr-4 text-slate-900">{item.title}</h3>
                      <span className="font-heading font-black text-ocean-700 text-lg">₹{item.price?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                      <div className="flex items-center space-x-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <MapPin size={10} className="text-ocean-600" />
                        <span>{item.city}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Eye size={10} />
                        <span>{item.views_count || 0} Views</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Menu Dropdown */}
                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute top-16 right-6 w-64 bg-white rounded-[32px] shadow-2xl border-2 border-slate-100 p-2 z-[60] animate-in zoom-in-95 slide-in-from-top-4 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1">
                      <button
                        onClick={() => navigate(`/post?edit=${item.id}`)}
                        className="w-full flex items-center space-x-3 p-3.5 hover:bg-slate-50 rounded-2xl transition-colors group text-left"
                      >
                        <span className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all flex-shrink-0">
                          <Edit3 size={18} strokeWidth={2.5} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 leading-none">Edit Listing</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Update details</span>
                        </div>
                      </button>

                      {activeTab === 'active' && (
                        <>
                          <button
                            onClick={(e) => handleMarkAsSold(item.id!, e)}
                            className="w-full flex items-center space-x-3 p-3.5 hover:bg-emerald-50 rounded-2xl transition-colors group text-left"
                          >
                            <span className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all flex-shrink-0">
                              <CheckCircle size={18} strokeWidth={2.5} />
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 leading-none">Mark as Sold</span>
                              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1">End the sale</span>
                            </div>
                          </button>

                          {!isBoosted && (
                            <button
                              onClick={() => setBoostConfirmationId(item.id!)}
                              className="w-full flex items-center space-x-3 p-3.5 hover:bg-amber-50 rounded-2xl transition-colors group text-left"
                            >
                              <span className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all flex-shrink-0">
                                <Rocket size={18} strokeWidth={2.5} />
                              </span>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 leading-none">Boost Ad</span>
                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1">Get noticed</span>
                              </div>
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={(e) => handleShareListing(item.id!, e)}
                        className="w-full flex items-center space-x-3 p-3.5 hover:bg-ocean-50 rounded-2xl transition-colors group text-left"
                      >
                        <span className="w-10 h-10 bg-ocean-50 text-ocean-700 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all flex-shrink-0">
                          <Share2 size={18} strokeWidth={2.5} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase tracking-widest text-ocean-800 leading-none">Share Link</span>
                          <span className="text-[9px] font-bold text-ocean-400 uppercase tracking-widest mt-1">Copy to clip</span>
                        </div>
                      </button>

                      <div className="h-px bg-slate-100 my-1 mx-2"></div>

                      <button
                        onClick={() => setDeleteConfirmationId(item.id!)}
                        className="w-full flex items-center space-x-3 p-3.5 hover:bg-coral-50 rounded-2xl transition-colors group text-coral-600 text-left"
                      >
                        <span className="w-10 h-10 bg-coral-50 text-coral-500 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all flex-shrink-0">
                          <Trash2 size={18} strokeWidth={2.5} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase tracking-widest leading-none">Delete Ad</span>
                          <span className="text-[9px] font-bold text-coral-400 uppercase tracking-widest mt-1">Remove forever</span>
                        </div>
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
