import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Camera, PlusCircle, Check, MapPin, ChevronRight, AlertCircle, Loader2, X, Sparkles } from 'lucide-react';
import { listingSchema, sanitizePlainText, detectPromptInjection, validateFileUpload } from '../lib/validation';
import { logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { ItemCondition, ItemAge, ContactPreferences, AiSuggestion } from '../types';
import {
  saveDraft, loadDraft, clearDraft, hasDraft, generateIdempotencyKey, debounce,
  ANDAMAN_CITIES, ITEM_AGE_OPTIONS, CONDITION_OPTIONS, CATEGORIES,
  loadContactPreferences, saveContactPreferences, DEFAULT_CONTACT_PREFERENCES,
} from '../lib/postAdUtils';
import { useToast } from '../components/Toast';

// ===== STEP COMPONENTS =====

interface StepHeaderProps {
  title: string;
  stepLabel: string;
}

const StepHeader: React.FC<StepHeaderProps> = ({ title, stepLabel }) => (
  <div className="space-y-2">
    <h2 className="text-3xl font-black text-primary">{title}</h2>
    <p className="text-secondary font-bold text-xs uppercase tracking-widest">{stepLabel}</p>
  </div>
);

const ContinueButton: React.FC<{ onClick: () => void; disabled?: boolean; label?: string; loading?: boolean }> = ({ onClick, disabled, label = 'Continue', loading }) => (
  <button onClick={onClick} disabled={disabled || loading} className="w-full py-4 bg-accent text-primary rounded-2xl font-black shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50 transition-all uppercase text-sm tracking-widest flex items-center justify-center">
    {loading ? <Loader2 className="animate-spin" /> : label}
  </button>
);

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="w-full text-secondary font-black uppercase text-xs tracking-widest">Back</button>
);

// ===== MAIN COMPONENT =====

export const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const preCategory = searchParams.get('cat');

  // Step management
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!editId);
  const [showDraftSheet, setShowDraftSheet] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Form state
  const [photos, setPhotos] = useState<{ file?: File; preview: string; id?: string }[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string | null>(preCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [city, setCity] = useState('Port Blair');
  const [area, setArea] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [contactPrefs, setContactPrefs] = useState<ContactPreferences>(DEFAULT_CONTACT_PREFERENCES);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [idempotencyKey] = useState(generateIdempotencyKey());

  const debouncedSave = useCallback(
    debounce((uid: string) => {
      saveDraft(uid, {
        step, category: category || undefined, title, description, price, condition, is_negotiable: isNegotiable, city, area, contact_preferences: contactPrefs,
        image_previews: photos.map(p => p.preview).slice(0, 3), idempotency_key: idempotencyKey, accessories: [],
      });
    }, 3000),
    [step, category, title, description, price, condition, isNegotiable, city, area, contactPrefs, photos, idempotencyKey]
  );

  useEffect(() => {
    if (userId && !editId && step < 6) debouncedSave(userId);
  }, [userId, step, title, description, price, category, condition, city, area, debouncedSave, editId]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('is_location_verified, city, area').eq('id', user.id).single();
      if (profile?.is_location_verified) setIsVerified(true);

      setContactPrefs(loadContactPreferences());

      if (editId) {
        try {
          const { data: listing } = await supabase.from('listings').select('*, images:listing_images(id, image_url, display_order)').eq('id', editId).single();
          if (listing) {
            setTitle(listing.title);
            setPrice(listing.price.toString());
            setDescription(listing.description || '');
            setCity(listing.city);
            setArea(listing.area || '');
            setCondition(listing.condition || 'good');
            setIsNegotiable(listing.is_negotiable ?? true);
            setContactPrefs(listing.contact_preferences || DEFAULT_CONTACT_PREFERENCES);
            if (listing.category_id) {
              const cat = CATEGORIES.find(c => c.id === listing.category_id);
              setCategory(cat ? cat.name : listing.category_id);
            }
            if (listing.images) {
              setPhotos(listing.images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((img: any) => ({ preview: img.image_url, id: img.id })));
            }
            setStep(1);
          }
        } catch (err) { console.error('Fetch listing error:', err); }
        setFetching(false);
      } else {
        if (profile?.city) setCity(profile.city);
        if (profile?.area) setArea(profile.area || '');
        if (hasDraft(user.id)) {
          setShowDraftSheet(true);
        }
        if (preCategory) {
          const cat = CATEGORIES.find(c => c.id === preCategory);
          if (cat) setCategory(cat.name);
        }
      }
    };
    init();
  }, [editId, navigate, preCategory]);

  const resumeDraft = () => {
    if (!userId) return;
    const draft = loadDraft(userId);
    if (!draft) { setShowDraftSheet(false); return; }
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    setPrice(draft.price || '');
    setCategory(draft.category || null);
    setCondition(draft.condition || 'good');
    setIsNegotiable(draft.is_negotiable ?? true);
    setCity(draft.city || 'Port Blair');
    setArea(draft.area || '');
    setContactPrefs(draft.contact_preferences || DEFAULT_CONTACT_PREFERENCES);
    setStep(draft.step || 1);
    setShowDraftSheet(false);
  };

  const discardDraft = () => {
    if (userId) clearDraft(userId);
    setShowDraftSheet(false);
  };

  const TOTAL_STEPS = 5;
  const nextStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
  const prevStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };
  const goToStep = (s: number) => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s); };

  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 1280;
          let w = img.width, h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) { h = (h / w) * MAX_DIM; w = MAX_DIM; } else { w = (w / h) * MAX_DIM; h = MAX_DIM; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => {
            resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
          }, 'image/webp', 0.85);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const remaining = 8 - photos.length;
    if (remaining <= 0) { showToast('Maximum 8 photos allowed', 'error'); return; }
    setProcessingImages(true);
    const files = Array.from(selectedFiles).slice(0, remaining);
    const newPhotos: typeof photos = [];
    for (const file of files) {
      const validation = validateFileUpload(file, { maxSizeMB: 10, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] });
      if (!validation.valid) { showToast(validation.error, 'error'); continue; }
      const resized = await resizeImage(file);
      const preview = URL.createObjectURL(resized);
      newPhotos.push({ file: resized, preview });
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    setProcessingImages(false);

    const firstFile = newPhotos[0]?.file;
    if (photos.length === 0 && firstFile && !aiSuggestion) {
      getAiSuggestion(firstFile);
    }
  };

  const removePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const photo = photos[index];
    if (photo.id) setDeletedPhotoIds(prev => [...prev, photo.id!]);
    if (photo.preview.startsWith('blob:')) URL.revokeObjectURL(photo.preview);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getAiSuggestion = async (imageFile: File) => {
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) return;
      setAiLoading(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const reader = new FileReader();
      const base64 = await new Promise<string>(res => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.readAsDataURL(imageFile); });
      const result = await model.generateContent([
        { inlineData: { mimeType: 'image/webp', data: base64 } },
        'Analyze this product image for a local marketplace listing in the Andaman Islands, India. Return ONLY valid JSON: {"suggested_title":"concise title max 80 chars","suggested_description":"2-3 sentences","suggested_category":"one of: mobiles,vehicles,home,fashion,property,services,other"}'
      ]);
      const text = result.response.text();
      const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim()) as AiSuggestion;
      setAiSuggestion(json);
    } catch (e) { console.warn('AI suggestion failed:', e); }
    finally { setAiLoading(false); }
  };

  const handleVerifyLocation = async () => {
    setIsVerifying(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
      const { latitude: lat, longitude: lng } = pos.coords;
      const isAndaman = lat >= 6.5 && lat <= 14.0 && lng >= 92.0 && lng <= 94.5;
      if (isAndaman && userId) {
        await supabase.from('profiles').update({ is_location_verified: true }).eq('id', userId);
        setIsVerified(true);
        showToast('Island residency verified!', 'success');
      } else {
        showToast('Location could not be verified as Andaman & Nicobar Islands.', 'error');
      }
    } catch { showToast('Could not access location. Please enable GPS.', 'error'); }
    setIsVerifying(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please login first.');

      const sanitizedTitle = sanitizePlainText(title);
      const sanitizedDescription = sanitizePlainText(description);
      const sanitizedArea = sanitizePlainText(area);

      if (detectPromptInjection(sanitizedTitle) || detectPromptInjection(sanitizedDescription)) {
        showToast('Your listing contains suspicious content. Please revise and try again.', 'error');
        await logAuditEvent({ action: 'listing_creation_blocked', status: 'blocked', metadata: { reason: 'prompt_injection_detected' } });
        setLoading(false);
        return;
      }

      const catId = category ? CATEGORIES.find(c => c.name === category)?.id || category.toLowerCase() : '';
      const validationResult = listingSchema.safeParse({ title: sanitizedTitle, description: sanitizedDescription, price: parseFloat(price), category_id: catId, condition, city, area: sanitizedArea, is_negotiable: isNegotiable, contact_preferences: contactPrefs });

      if (!validationResult.success) {
        showToast(validationResult.error.issues[0].message, 'error');
        setLoading(false);
        return;
      }

      const payload: Record<string, any> = { user_id: user.id, title: sanitizedTitle, price: parseFloat(price), description: sanitizedDescription, city, area: sanitizedArea, category_id: catId, condition, status: 'active', is_negotiable: isNegotiable, contact_preferences: contactPrefs, idempotency_key: editId ? undefined : idempotencyKey };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      let listingId = editId;
      if (editId) {
        const { error: updateError } = await supabase.from('listings').update(payload).eq('id', editId);
        if (updateError) throw updateError;
        if (deletedPhotoIds.length > 0) await supabase.from('listing_images').delete().in('id', deletedPhotoIds);
        if (editId) {
          await logAuditEvent({ action: 'listing_updated', resource_type: 'listing', resource_id: editId, status: 'success' });
        }
      } else {
        const { data, error: insertError } = await supabase.from('listings').insert(payload).select('id').single();
        if (insertError) throw insertError;
        listingId = data.id;
        await logAuditEvent({ action: 'listing_created', resource_type: 'listing', resource_id: data.id, status: 'success', metadata: { category: catId, city } });
      }

      const newPhotos = photos.filter(p => p.file);
      for (const photo of newPhotos) {
        const fileName = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage.from('listings').upload(fileName, photo.file!, { contentType: 'image/webp' });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('listings').getPublicUrl(fileName);
          if (listingId && urlData?.publicUrl) {
            await supabase.from('listing_images').insert({ listing_id: listingId, image_url: urlData.publicUrl, display_order: photos.indexOf(photo) });
          }
        }
      }
      for (const photo of photos.filter(p => p.id)) {
        await supabase.from('listing_images').update({ display_order: photos.indexOf(photo) }).eq('id', photo.id!);
      }

      saveContactPreferences(contactPrefs);
      if (userId) clearDraft(userId);

      setStep(6);
    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast(safeError, 'error');
      await logAuditEvent({ action: editId ? 'listing_update_failed' : 'listing_creation_failed', status: 'failed', metadata: { error: safeError } });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-neutral">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
      <p className="text-sm font-black uppercase tracking-widest text-secondary">Loading Listing...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 bg-neutral">
      {showDraftSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in">
          <div className="bg-base-100 w-full max-w-lg rounded-t-[32px] p-8 space-y-6 animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-secondary/20 rounded-full mx-auto"></div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-primary">Continue Your Ad?</h3>
              <p className="text-secondary text-sm">You have an unsaved ad. Pick up where you left off?</p>
            </div>
            <div className="space-y-3">
              <ContinueButton onClick={resumeDraft} label="Continue Editing" />
              <button onClick={discardDraft} className="w-full py-4 bg-secondary/10 text-secondary rounded-2xl font-black uppercase text-xs tracking-widest">Start Fresh</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-base-100 rounded-[40px] shadow-2xl overflow-hidden border border-primary/5">
        {step <= TOTAL_STEPS && (
          <div className="h-2 bg-secondary/10">
            <div className="h-full bg-accent transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}></div>
          </div>
        )}

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <StepHeader title={editId ? 'Update Photos' : 'Add Photos'} stepLabel={`Step 1 of ${TOTAL_STEPS}`} />
              <div onClick={() => !processingImages && fileInputRef.current?.click()} className={`min-h-[250px] border-4 border-dashed border-secondary/20 rounded-3xl flex flex-col items-center justify-center bg-secondary/5 hover:bg-base-100 transition-colors cursor-pointer p-6 group ${processingImages ? 'opacity-50 cursor-wait' : ''}`}>
                <input type="file" multiple accept="image/*" hidden ref={fileInputRef} onChange={e => handleFiles(e.target.files)} disabled={processingImages} />
                {processingImages ? (
                  <div className="flex flex-col items-center animate-pulse space-y-2">
                    <Loader2 size={40} className="text-accent animate-spin" />
                    <span className="font-bold text-primary uppercase text-xs tracking-widest">Optimizing Images...</span>
                  </div>
                ) : photos.length === 0 ? (
                  <>
                    <Camera size={52} className="text-secondary/30 mb-3 group-hover:text-accent transition-colors" />
                    <span className="font-black text-primary text-lg">Tap to add photos</span>
                    <span className="font-bold text-secondary uppercase text-xs tracking-widest mt-1">Up to 8 · High-contrast optimized</span>
                  </>
                ) : (
                  <div className="flex gap-3 overflow-x-auto w-full p-1">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg border-2 border-base-100">
                        <img src={p.preview} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                        {i === 0 && <div className="absolute top-1.5 left-1.5 bg-accent text-primary rounded-full px-2 py-0.5 text-[9px] font-black uppercase">Cover</div>}
                        <button onClick={e => removePhoto(i, e)} className="absolute top-1.5 right-1.5 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg hover:bg-red-500 transition-colors"><X size={14} /></button>
                      </div>
                    ))}
                    {photos.length < 8 && (
                      <div className="w-28 h-28 flex items-center justify-center bg-secondary/10 rounded-2xl border-2 border-dashed border-secondary/20 text-secondary/30 flex-shrink-0">
                        <PlusCircle size={32} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-center text-secondary text-sm font-bold">{photos.length} of 8 photos</p>
              {aiLoading && (
                <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl border border-secondary/20 animate-pulse">
                  <Sparkles size={20} className="text-accent" />
                  <span className="text-primary text-sm font-bold">AI is analyzing your photo...</span>
                </div>
              )}
              <ContinueButton onClick={nextStep} disabled={photos.length === 0 || processingImages} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <StepHeader title="Category & Details" stepLabel={`Step 2 of ${TOTAL_STEPS}`} />
              <div className="space-y-2">
                <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCategory(cat.name)} className={`p-5 rounded-2xl border-2 transition-all text-left ${category === cat.name ? 'bg-accent/10 border-accent' : 'bg-secondary/5 border-transparent hover:border-accent/50'}`}>
                      <span className="text-2xl mr-2">{cat.icon}</span>
                      <span className={`font-black uppercase text-sm tracking-widest ${category === cat.name ? 'text-primary' : 'text-secondary'}`}>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Title</label>
                  <span className="text-xs font-bold text-secondary/50">{title.length}/100</span>
                </div>
                <input type="text" placeholder="e.g. Royal Enfield Classic 350" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="w-full p-4 bg-secondary/5 rounded-2xl border-2 border-secondary/10 focus:border-accent outline-none font-bold text-lg" />
                {aiSuggestion?.suggested_title && title !== aiSuggestion.suggested_title && (
                  <button onClick={() => setTitle(aiSuggestion.suggested_title!)} className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full text-primary text-sm font-bold border border-secondary/20 hover:bg-secondary/20 transition-colors">
                    <Sparkles size={14} className="text-accent"/> Use AI Suggestion
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Description</label>
                  <span className="text-xs font-bold text-secondary/50">{description.length}/2000</span>
                </div>
                <textarea placeholder="Describe item details, condition, and inclusions..." rows={5} value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} className="w-full p-4 bg-secondary/5 rounded-2xl border-2 border-secondary/10 focus:border-accent outline-none font-medium text-base leading-relaxed" />
                {aiSuggestion?.suggested_description && description !== aiSuggestion.suggested_description && (
                  <button onClick={() => setDescription(aiSuggestion.suggested_description!)} className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full text-primary text-sm font-bold border border-secondary/20 hover:bg-secondary/20 transition-colors">
                    <Sparkles size={14} className="text-accent"/> Use AI Description
                  </button>
                )}
              </div>
              <ContinueButton onClick={nextStep} disabled={!category || !title || !description} />
              <BackButton onClick={prevStep} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <StepHeader title="Price & Condition" stepLabel={`Step 3 of ${TOTAL_STEPS}`} />
              <div className="space-y-2">
                <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Price (₹)</label>
                <input type="number" placeholder="Enter Amount" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-4 bg-secondary/5 rounded-2xl border-2 border-secondary/10 focus:border-accent outline-none font-bold text-2xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Price Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: true, l: 'Negotiable' }, { v: false, l: 'Fixed Price' }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setIsNegotiable(opt.v)} className={`p-4 rounded-2xl border-2 font-black uppercase text-sm tracking-widest transition-all ${isNegotiable === opt.v ? 'bg-accent/10 border-accent text-primary' : 'bg-secondary/5 border-secondary/10 text-secondary'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Condition</label>
                <div className="grid grid-cols-2 gap-3">
                  {CONDITION_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setCondition(opt.value as ItemCondition)} className={`p-4 rounded-2xl border-2 text-left transition-all ${condition === opt.value ? 'bg-accent/10 border-accent' : 'bg-secondary/5 border-secondary/10 hover:border-accent/50'}`}>
                      <span className={`font-black text-base ${condition === opt.value ? 'text-primary' : 'text-secondary'}`}>{opt.label}</span>
                      <p className="text-xs text-secondary/70 mt-1">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <ContinueButton onClick={nextStep} disabled={!price} />
              <BackButton onClick={prevStep} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <StepHeader title="Location & Contact" stepLabel={`Step 4 of ${TOTAL_STEPS}`} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Island/City</label>
                  <select value={city} onChange={e => setCity(e.target.value)} className="w-full p-4 bg-secondary/5 rounded-2xl border-2 border-secondary/10 font-bold outline-none text-lg">
                    {ANDAMAN_CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Local Area</label>
                  <input placeholder="e.g. Garacharma" value={area} onChange={e => setArea(e.target.value)} className="w-full p-4 bg-secondary/5 rounded-2xl border-2 border-secondary/10 font-bold outline-none text-lg" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Contact Options</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-4 p-4 bg-secondary/5 rounded-2xl cursor-pointer">
                    <input type="checkbox" checked={true} disabled className="w-6 h-6 rounded accent-accent" />
                    <span className="font-bold text-base text-primary">In-app Chat</span>
                    <span className="text-xs text-secondary font-bold ml-auto">Always on</span>
                  </label>
                  <label className="flex items-center gap-4 p-4 bg-secondary/5 rounded-2xl cursor-pointer">
                    <input type="checkbox" checked={contactPrefs.phone || false} onChange={e => setContactPrefs(p => ({ ...p, phone: e.target.checked }))} className="w-6 h-6 rounded accent-accent" />
                    <span className="font-bold text-base text-primary">Show My Phone</span>
                  </label>
                  <label className="flex items-center gap-4 p-4 bg-secondary/5 rounded-2xl cursor-pointer">
                    <input type="checkbox" checked={contactPrefs.whatsapp || false} onChange={e => setContactPrefs(p => ({ ...p, whatsapp: e.target.checked }))} className="w-6 h-6 rounded accent-accent" />
                    <span className="font-bold text-base text-primary">Receive WhatsApp Msgs</span>
                  </label>
                </div>
                <p className="text-xs text-secondary/70 font-bold text-center">Your email is never shown to buyers.</p>
              </div>
              <ContinueButton onClick={nextStep} disabled={!area} label="Review Listing" />
              <BackButton onClick={prevStep} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-in zoom-in-95 text-center">
              <StepHeader title="Review & Publish" stepLabel={`Step 5 of ${TOTAL_STEPS}`} />
              <div className="p-6 bg-secondary/5 rounded-[32px] border-2 border-secondary/10 flex items-center space-x-6 text-left shadow-inner">
                {photos[0] && <img src={photos[0].preview} className="w-28 h-28 rounded-2xl object-cover shadow-lg border-2 border-base-100" alt="Cover" />}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-black text-accent uppercase tracking-widest mb-1">{category}</p>
                  <p className="font-heading font-black text-primary truncate text-2xl">{title}</p>
                  <p className="text-3xl font-heading font-black text-primary mt-1">₹ {parseFloat(price || '0').toLocaleString('en-IN')}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs font-bold bg-secondary/20 text-primary px-3 py-1 rounded-full uppercase">{condition.replace('_', ' ')}</span>
                    {isNegotiable && <span className="text-xs font-bold bg-green-500/20 text-green-800 px-3 py-1 rounded-full uppercase">Negotiable</span>}
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center p-4 bg-secondary/5 rounded-xl">
                  <span className="text-sm font-bold text-secondary">Photos</span>
                  <button onClick={() => goToStep(1)} className="text-accent text-sm font-black flex items-center gap-1">{photos.length} photos ✏️</button>
                </div>
                <div className="flex justify-between items-center p-4 bg-secondary/5 rounded-xl">
                  <span className="text-sm font-bold text-secondary">Location</span>
                  <button onClick={() => goToStep(4)} className="text-accent text-sm font-black flex items-center gap-1">{city}{area ? `, ${area}` : ''} ✏️</button>
                </div>
              </div>
              <div className="space-y-4">
                {!isVerified && (
                  <button onClick={handleVerifyLocation} disabled={isVerifying} className="w-full p-5 bg-accent/20 text-primary rounded-3xl border-2 border-accent/30 flex items-center justify-between group hover:bg-accent/30 transition-colors">
                    <div className="flex items-center space-x-4"><MapPin size={28} /> <div className="text-left"><p className="font-black text-sm uppercase tracking-widest">Verify Island Residency</p><p className="text-xs font-bold opacity-80">Boost trust with a verified badge</p></div></div>
                    {isVerifying ? <Loader2 className="animate-spin h-6 w-6" /> : <ChevronRight size={24} />}
                  </button>
                )}
                {isVerified && <div className="p-5 bg-green-500/20 text-green-800 rounded-3xl border-2 border-green-500/30 flex items-center justify-center space-x-3 font-black text-sm uppercase tracking-widest"><Check size={24} /> <span>Island Verified Resident</span></div>}
              </div>
              <button onClick={handleSave} disabled={loading} className="w-full py-6 bg-primary text-base-100 rounded-[32px] font-black text-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-tighter flex items-center justify-center gap-3">
                {loading ? <><Loader2 className="animate-spin" /> Please Wait...</> : (editId ? 'Update Ad Now' : 'Publish Ad Now')}
              </button>
              {!isVerified && <p className="text-xs text-secondary/70 font-bold uppercase tracking-widest flex items-center justify-center"><AlertCircle size={12} className="mr-2" /> Unverified accounts may have limited visibility.</p>}
              <BackButton onClick={prevStep} />
            </div>
          )}

          {step === 6 && (
            <div className="text-center py-12 space-y-8 animate-in zoom-in-90">
              <div className="w-32 h-32 bg-green-500/20 text-green-700 rounded-[48px] flex items-center justify-center mx-auto shadow-inner border-4 border-base-100"><Check size={64} strokeWidth={3} /></div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">{editId ? 'Ad Updated!' : 'Published!'}</h2>
                <p className="text-secondary font-bold text-lg">Your item is now live for the island community.</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-800 rounded-full text-sm font-black mt-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Now
                </div>
              </div>
              <div className="flex flex-col gap-4 pt-4">
                <button onClick={() => navigate('/listings')} className="w-full py-5 bg-primary text-base-100 rounded-2xl font-black uppercase text-base tracking-widest shadow-xl">Browse Marketplace</button>
                <button onClick={() => { setStep(1); setPhotos([]); setTitle(''); setDescription(''); setPrice(''); setCategory(null); setCondition('good'); }} className="w-full py-4 bg-secondary/10 text-primary rounded-2xl font-black uppercase text-base tracking-widest">Post Another Ad</button>
                <button onClick={() => navigate('/profile')} className="w-full py-4 bg-base-100 border-2 border-secondary/10 text-primary rounded-2xl font-black uppercase text-base tracking-widest">My Account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};