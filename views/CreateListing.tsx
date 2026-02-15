import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Camera, PlusCircle, Check, MapPin, ChevronRight, AlertCircle, Loader2, X, Star, GripVertical, Sparkles, Tag, DollarSign, Shield } from 'lucide-react';
import { listingSchema, sanitizePlainText, detectPromptInjection, validateFileUpload } from '../lib/validation';
import { logAuditEvent, sanitizeErrorMessage } from '../lib/security';
import { ItemCondition, ItemAge, ContactPreferences, AiSuggestion, DraftListing } from '../types';
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
    <h2 className="text-2xl font-black">{title}</h2>
    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stepLabel}</p>
  </div>
);

const ContinueButton: React.FC<{ onClick: () => void; disabled?: boolean; label?: string }> = ({ onClick, disabled, label = 'Continue' }) => (
  <button onClick={onClick} disabled={disabled} className="w-full py-4 bg-ocean-700 text-white rounded-2xl font-black shadow-lg shadow-ocean-700/20 active:scale-95 disabled:opacity-50 transition-all uppercase text-[10px] tracking-widest">{label}</button>
);

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest">Back</button>
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

  // Step 1: Photos
  const [photos, setPhotos] = useState<{ file?: File; preview: string; id?: string }[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Category + Details
  const [category, setCategory] = useState<string | null>(preCategory);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 3: Pricing + Condition
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [itemAge, setItemAge] = useState<ItemAge | ''>('');
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [hasInvoice, setHasInvoice] = useState(false);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [accessoryInput, setAccessoryInput] = useState('');

  // Step 4: Location + Contact
  const [city, setCity] = useState('Port Blair');
  const [area, setArea] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [contactPrefs, setContactPrefs] = useState<ContactPreferences>(DEFAULT_CONTACT_PREFERENCES);

  // Smart features
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<{ low: number; high: number } | null>(null);
  const [idempotencyKey] = useState(generateIdempotencyKey());

  // ===== DRAFT AUTOSAVE =====
  const debouncedSave = useCallback(
    debounce((uid: string) => {
      saveDraft(uid, {
        step, category: category || undefined, subcategory: subcategory || undefined,
        title, description, price, condition, is_negotiable: isNegotiable,
        min_price: minPrice || undefined, item_age: (itemAge as ItemAge) || undefined,
        has_warranty: hasWarranty, warranty_expiry: warrantyExpiry || undefined,
        has_invoice: hasInvoice, accessories, city, area,
        contact_preferences: contactPrefs,
        image_previews: photos.map(p => p.preview).slice(0, 3),
        idempotency_key: idempotencyKey,
      });
    }, 3000),
    [step, category, subcategory, title, description, price, condition, isNegotiable, minPrice, itemAge, hasWarranty, warrantyExpiry, hasInvoice, accessories, city, area, contactPrefs, photos, idempotencyKey]
  );

  useEffect(() => {
    if (userId && !editId && step < 6) debouncedSave(userId);
  }, [userId, step, title, description, price, category, condition, city, area, debouncedSave, editId]);

  // ===== INITIALIZATION =====
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('is_location_verified, city, area, phone_number').eq('id', user.id).single();
      if (profile?.is_location_verified) setIsVerified(true);

      // Load contact prefs from cache
      setContactPrefs(loadContactPreferences());

      if (editId) {
        // Edit mode: load existing listing
        try {
          const { data: listing } = await supabase
            .from('listings')
            .select('*, images:listing_images(id, image_url, display_order)')
            .eq('id', editId).single();
          if (listing) {
            setTitle(listing.title);
            setPrice(listing.price.toString());
            setDescription(listing.description || '');
            setCity(listing.city);
            setArea(listing.area || '');
            setCondition(listing.condition || 'good');
            setIsNegotiable(listing.is_negotiable ?? true);
            setMinPrice(listing.min_price?.toString() || '');
            setItemAge(listing.item_age || '');
            setHasWarranty(listing.has_warranty || false);
            setWarrantyExpiry(listing.warranty_expiry || '');
            setHasInvoice(listing.has_invoice || false);
            setAccessories(listing.accessories || []);
            setContactPrefs(listing.contact_preferences || DEFAULT_CONTACT_PREFERENCES);
            if (listing.category_id) {
              const cat = CATEGORIES.find(c => c.id === listing.category_id);
              setCategory(cat ? cat.name : listing.category_id);
            }
            if (listing.images) {
              setPhotos(listing.images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                .map((img: any) => ({ preview: img.image_url, id: img.id })));
            }
            setStep(1); // Start at photos for edit
          }
        } catch (err) { console.error("Fetch listing error:", err); }
        setFetching(false);
      } else {
        // New ad: check for drafts
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

  // ===== DRAFT RECOVERY =====
  const resumeDraft = () => {
    if (!userId) return;
    const draft = loadDraft(userId);
    if (!draft) { setShowDraftSheet(false); return; }
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    setPrice(draft.price || '');
    setCategory(draft.category || null);
    setSubcategory(draft.subcategory || null);
    setCondition(draft.condition || 'good');
    setIsNegotiable(draft.is_negotiable ?? true);
    setMinPrice(draft.min_price || '');
    setItemAge((draft.item_age as ItemAge) || '');
    setHasWarranty(draft.has_warranty || false);
    setHasInvoice(draft.has_invoice || false);
    setAccessories(draft.accessories || []);
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

  // ===== NAVIGATION =====
  const TOTAL_STEPS = 5;
  const nextStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
  const prevStep = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };
  const goToStep = (s: number) => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s); };

  // ===== IMAGE HANDLING =====
  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 1920;
          let w = img.width, h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) { h = (h / w) * MAX_DIM; w = MAX_DIM; }
            else { w = (w / h) * MAX_DIM; h = MAX_DIM; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => {
            resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
          }, 'image/webp', 0.80);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const checkImageSafety = async (file: File): Promise<{ safe: boolean; reason?: string }> => {
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) return { safe: true };
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const reader = new FileReader();
      const base64 = await new Promise<string>(res => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
      const result = await model.generateContent([
        { inlineData: { mimeType: 'image/webp', data: base64 } },
        'Is this image safe for a marketplace listing? Reply with JSON: {"safe": true/false, "reason": "explanation if unsafe"}'
      ]);
      const text = result.response.text();
      const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      return json;
    } catch { return { safe: true }; }
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
      const safety = await checkImageSafety(resized);
      if (!safety.safe) { showToast(`Image rejected: ${safety.reason || 'Content policy violation'}`, 'error'); continue; }
      const preview = URL.createObjectURL(resized);
      newPhotos.push({ file: resized, preview });
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    setProcessingImages(false);

    // Trigger AI suggestion after first images uploaded
    if (photos.length === 0 && newPhotos.length > 0 && !aiSuggestion) {
      getAiSuggestion(newPhotos[0].file!);
    }
  };

  const removePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const photo = photos[index];
    if (photo.id) setDeletedPhotoIds(prev => [...prev, photo.id!]);
    if (photo.preview.startsWith('blob:')) URL.revokeObjectURL(photo.preview);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ===== AI SUGGESTIONS =====
  const getAiSuggestion = async (imageFile: File) => {
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) return;
      setAiLoading(true);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const reader = new FileReader();
      const base64 = await new Promise<string>(res => { reader.onload = () => res((reader.result as string).split(',')[1]); reader.readAsDataURL(imageFile); });
      const result = await model.generateContent([
        { inlineData: { mimeType: 'image/webp', data: base64 } },
        `Analyze this product image for a local marketplace listing in the Andaman Islands, India. Return ONLY valid JSON: {"suggested_title":"concise title max 80 chars","suggested_description":"2-3 sentences","suggested_category":"one of: mobiles,vehicles,home,fashion,property,services,other","suggested_condition":"one of: new,like_new,good,fair","estimated_price_range":{"low":number,"high":number}}`
      ]);
      const text = result.response.text();
      const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim()) as AiSuggestion;
      setAiSuggestion(json);
    } catch (e) { console.warn('AI suggestion failed:', e); }
    finally { setAiLoading(false); }
  };

  // ===== PRICE SUGGESTION =====
  const fetchPriceSuggestion = async (catId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_price_suggestion', {
        p_category_id: catId, p_condition: condition
      });
      if (data && data.length > 0 && data[0].listing_count > 2) {
        setPriceSuggestion({ low: data[0].min_price, high: data[0].max_price });
      }
    } catch { /* silent */ }
  };

  // ===== LOCATION VERIFY =====
  const handleVerifyLocation = async () => {
    setIsVerifying(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
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

  // ===== ACCESSORIES CHIP INPUT =====
  const addAccessory = () => {
    const val = accessoryInput.trim();
    if (val && accessories.length < 10 && !accessories.includes(val)) {
      setAccessories(prev => [...prev, val]);
      setAccessoryInput('');
    }
  };

  // ===== PUBLISH =====
  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first.");

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
      const validationResult = listingSchema.safeParse({
        title: sanitizedTitle, description: sanitizedDescription,
        price: parseFloat(price), category_id: catId, condition,
        city, area: sanitizedArea, is_negotiable: isNegotiable,
        min_price: minPrice ? parseFloat(minPrice) : null,
        item_age: itemAge || null, has_warranty: hasWarranty,
        warranty_expiry: warrantyExpiry || null, has_invoice: hasInvoice,
        accessories, contact_preferences: contactPrefs,
      });

      if (!validationResult.success) {
        showToast(validationResult.error.issues[0].message, 'error');
        setLoading(false);
        return;
      }

      const payload: Record<string, any> = {
        user_id: user.id, title: sanitizedTitle, price: parseFloat(price),
        description: sanitizedDescription, city, area: sanitizedArea,
        category_id: catId, subcategory_id: subcategory?.toLowerCase() || null,
        condition, status: 'active', is_negotiable: isNegotiable,
        min_price: minPrice ? parseFloat(minPrice) : null,
        item_age: itemAge || null, has_warranty: hasWarranty,
        warranty_expiry: warrantyExpiry || null, has_invoice: hasInvoice,
        accessories, contact_preferences: contactPrefs,
        idempotency_key: editId ? undefined : idempotencyKey,
        ai_metadata: aiSuggestion ? { ...aiSuggestion, title_accepted: title === aiSuggestion.suggested_title, description_accepted: description === aiSuggestion.suggested_description } : {},
      };
      // Remove undefined keys
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      let listingId = editId;
      if (editId) {
        const { error: updateError } = await supabase.from('listings').update(payload).eq('id', editId);
        if (updateError) throw updateError;
        if (deletedPhotoIds.length > 0) await supabase.from('listing_images').delete().in('id', deletedPhotoIds);
        await logAuditEvent({ action: 'listing_updated', resource_type: 'listing', resource_id: editId, status: 'success' });
      } else {
        const { data, error: insertError } = await supabase.from('listings').insert(payload).select('id').single();
        if (insertError) throw insertError;
        listingId = data.id;
        await logAuditEvent({ action: 'listing_created', resource_type: 'listing', resource_id: data.id, status: 'success', metadata: { category: catId, city } });
      }

      // Upload new photos
      const newPhotos = photos.filter(p => p.file);
      for (const photo of newPhotos) {
        const fileName = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage.from('listings').upload(fileName, photo.file!, { contentType: 'image/webp' });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName);
          await supabase.from('listing_images').insert({ listing_id: listingId, image_url: publicUrl, display_order: photos.indexOf(photo) });
        }
      }
      // Update display order for existing photos
      for (const photo of photos.filter(p => p.id)) {
        await supabase.from('listing_images').update({ display_order: photos.indexOf(photo) }).eq('id', photo.id);
      }

      // Save contact preferences for next time
      saveContactPreferences(contactPrefs);
      // Clear draft
      if (userId) clearDraft(userId);

      setStep(6); // Success
    } catch (err: any) {
      const safeError = sanitizeErrorMessage(err);
      showToast(safeError, 'error');
      await logAuditEvent({ action: editId ? 'listing_update_failed' : 'listing_creation_failed', status: 'failed', metadata: { error: safeError } });
    } finally {
      setLoading(false);
    }
  };

  // ===== LOADING STATE =====
  if (fetching) return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4">
      <div className="animate-spin h-10 w-10 border-t-2 border-ocean-600 rounded-full"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Listing Data...</p>
    </div>
  );

  // ===== RENDER =====
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      {/* Draft Recovery Sheet */}
      {showDraftSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-[32px] p-8 space-y-6 animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto"></div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black">Continue Your Ad?</h3>
              <p className="text-slate-500 text-sm">You have an unsaved ad. Pick up where you left off?</p>
            </div>
            <div className="space-y-3">
              <button onClick={resumeDraft} className="w-full py-4 bg-ocean-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Continue Editing</button>
              <button onClick={discardDraft} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest">Start Fresh</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
        {/* Progress Bar */}
        {step <= TOTAL_STEPS && (
          <div className="h-2 bg-slate-100">
            <div className="h-full bg-ocean-600 transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}></div>
          </div>
        )}

        <div className="p-8 md:p-12">
          {/* ===== STEP 1: PHOTOS FIRST ===== */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <StepHeader title={editId ? 'Update Photos' : 'Add Photos'} stepLabel="Step 1 of 5 · Photos First" />

              <div
                onClick={() => !processingImages && fileInputRef.current?.click()}
                className={`min-h-[200px] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50 hover:bg-white transition-colors cursor-pointer p-6 group ${processingImages ? 'opacity-50 cursor-wait' : ''}`}
              >
                <input type="file" multiple accept="image/*" hidden ref={fileInputRef} onChange={e => handleFiles(e.target.files)} disabled={processingImages} />

                {processingImages ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <Loader2 size={40} className="text-ocean-600 animate-spin mb-2" />
                    <span className="font-bold text-ocean-700 uppercase text-[10px] tracking-widest">Compressing for Island Data...</span>
                  </div>
                ) : photos.length === 0 ? (
                  <>
                    <Camera size={48} className="text-slate-300 mb-3 group-hover:text-ocean-400 transition-colors" />
                    <span className="font-black text-slate-500 text-sm">Tap to add photos</span>
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mt-1">Up to 8 · Auto-compressed</span>
                  </>
                ) : (
                  <div className="flex gap-3 overflow-x-auto w-full p-1 scrollbar-hide">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 shadow-md border-2 border-white">
                        <img src={p.preview} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                        {i === 0 && <div className="absolute top-1.5 left-1.5 bg-ocean-600 text-white rounded-full px-2 py-0.5 text-[8px] font-black uppercase">Cover</div>}
                        <button onClick={e => removePhoto(i, e)} className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition-colors"><X size={14} /></button>
                      </div>
                    ))}
                    {photos.length < 8 && (
                      <div className="w-28 h-28 flex items-center justify-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 flex-shrink-0">
                        <PlusCircle size={32} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-center text-slate-400 text-xs font-bold">{photos.length} of 8 photos</p>

              {/* AI Loading hint */}
              {aiLoading && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-2xl border border-purple-100 animate-pulse">
                  <Sparkles size={16} className="text-purple-500" />
                  <span className="text-purple-600 text-xs font-bold">AI is analyzing your photo for suggestions...</span>
                </div>
              )}

              <ContinueButton onClick={nextStep} disabled={photos.length === 0 || processingImages} />
            </div>
          )}

          {/* ===== STEP 2: CATEGORY + DETAILS ===== */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <StepHeader title="Category & Details" stepLabel="Step 2 of 5" />

              {/* Category Grid */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => { setCategory(cat.name); fetchPriceSuggestion(cat.id); }}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${category === cat.name ? 'bg-ocean-50 border-ocean-600 shadow-md' : 'bg-slate-50 border-transparent hover:border-ocean-300'}`}>
                      <span className="text-xl mr-2">{cat.icon}</span>
                      <span className={`font-black uppercase text-[10px] tracking-widest ${category === cat.name ? 'text-ocean-700' : 'text-slate-400'}`}>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Listing Title</label>
                  <span className="text-[9px] font-bold text-slate-300">{title.length}/100</span>
                </div>
                <input type="text" placeholder="e.g. Royal Enfield Classic 350" value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-ocean-600 outline-none font-bold" />
                {aiSuggestion?.suggested_title && title !== aiSuggestion.suggested_title && (
                  <button onClick={() => setTitle(aiSuggestion.suggested_title!)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full text-purple-600 text-xs font-bold border border-purple-100 hover:bg-purple-100 transition-colors">
                    <Sparkles size={12} /> Use AI suggestion: "{aiSuggestion.suggested_title.substring(0, 40)}..."
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <span className="text-[9px] font-bold text-slate-300">{description.length}/2000</span>
                </div>
                <textarea placeholder="Describe item details, condition, and inclusions..." rows={4} value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-ocean-600 outline-none font-medium text-sm leading-relaxed" />
                {aiSuggestion?.suggested_description && description !== aiSuggestion.suggested_description && (
                  <button onClick={() => setDescription(aiSuggestion.suggested_description!)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full text-purple-600 text-xs font-bold border border-purple-100 hover:bg-purple-100 transition-colors">
                    <Sparkles size={12} /> Use AI description
                  </button>
                )}
              </div>

              <ContinueButton onClick={nextStep} disabled={!category || !title || !description} />
              <BackButton onClick={prevStep} />
            </div>
          )}

          {/* ===== STEP 3: PRICING + CONDITION ===== */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <StepHeader title="Pricing & Condition" stepLabel="Step 3 of 5" />

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                <input type="number" placeholder="Enter Amount" value={price} onChange={e => setPrice(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-ocean-600 outline-none font-bold text-lg" />
                {priceSuggestion && (
                  <button onClick={() => setPrice(Math.round((priceSuggestion.low + priceSuggestion.high) / 2).toString())}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full text-amber-700 text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-colors">
                    💡 Similar items: ₹{priceSuggestion.low.toLocaleString('en-IN')} – ₹{priceSuggestion.high.toLocaleString('en-IN')}
                  </button>
                )}
                {aiSuggestion?.estimated_price_range && !priceSuggestion && (
                  <button onClick={() => setPrice(Math.round((aiSuggestion.estimated_price_range!.low + aiSuggestion.estimated_price_range!.high) / 2).toString())}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full text-purple-600 text-xs font-bold border border-purple-100">
                    <Sparkles size={12} /> AI estimate: ₹{aiSuggestion.estimated_price_range.low.toLocaleString('en-IN')} – ₹{aiSuggestion.estimated_price_range.high.toLocaleString('en-IN')}
                  </button>
                )}
              </div>

              {/* Negotiable */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Price Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: true, l: 'Negotiable' }, { v: false, l: 'Fixed Price' }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setIsNegotiable(opt.v)}
                      className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${isNegotiable === opt.v ? 'bg-ocean-50 border-ocean-600 text-ocean-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
                {isNegotiable && (
                  <div className="mt-2">
                    <input type="number" placeholder="Min acceptable price (optional, hidden)" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 outline-none font-medium text-sm" />
                  </div>
                )}
              </div>

              {/* Condition */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Condition</label>
                <div className="grid grid-cols-2 gap-3">
                  {CONDITION_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setCondition(opt.value as ItemCondition)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${condition === opt.value ? 'bg-ocean-50 border-ocean-600' : 'bg-slate-50 border-slate-100 hover:border-ocean-300'}`}>
                      <span className={`font-black text-xs ${condition === opt.value ? 'text-ocean-700' : 'text-slate-500'}`}>{opt.label}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Age */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Age (Optional)</label>
                <select value={itemAge} onChange={e => setItemAge(e.target.value as ItemAge)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold outline-none">
                  <option value="">Select age...</option>
                  {ITEM_AGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {/* Extras */}
              <details className="group">
                <summary className="text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2">
                  <ChevronRight size={14} className="group-open:rotate-90 transition-transform" /> Optional Extras
                </summary>
                <div className="mt-4 space-y-4 pl-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={hasWarranty} onChange={e => setHasWarranty(e.target.checked)} className="w-5 h-5 rounded accent-ocean-600" />
                    <span className="font-bold text-sm text-slate-600">Has Warranty</span>
                  </label>
                  {hasWarranty && (
                    <input type="date" value={warrantyExpiry} onChange={e => setWarrantyExpiry(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 outline-none font-medium text-sm" placeholder="Warranty expiry" />
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={hasInvoice} onChange={e => setHasInvoice(e.target.checked)} className="w-5 h-5 rounded accent-ocean-600" />
                    <span className="font-bold text-sm text-slate-600">Has Invoice/Bill</span>
                  </label>
                  <div className="space-y-2">
                    <span className="font-bold text-sm text-slate-600">Accessories</span>
                    <div className="flex gap-2">
                      <input type="text" value={accessoryInput} onChange={e => setAccessoryInput(e.target.value)} placeholder="e.g. Charger"
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAccessory())}
                        className="flex-1 p-3 bg-slate-50 rounded-xl border-2 border-slate-100 outline-none font-medium text-sm" />
                      <button onClick={addAccessory} className="px-4 py-3 bg-ocean-600 text-white rounded-xl font-black text-xs">Add</button>
                    </div>
                    {accessories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {accessories.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                            {a}
                            <button onClick={() => setAccessories(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <ContinueButton onClick={nextStep} disabled={!price} />
              <BackButton onClick={prevStep} />
            </div>
          )}

          {/* ===== STEP 4: LOCATION + CONTACT ===== */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <StepHeader title="Location & Contact" stepLabel="Step 4 of 5" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Island/City</label>
                  <select value={city} onChange={e => setCity(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold outline-none">
                    {ANDAMAN_CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Local Area</label>
                  <input placeholder="e.g. Garacharma" value={area} onChange={e => setArea(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold outline-none" />
                </div>
              </div>

              {/* Contact Preferences */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Preferences</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                    <input type="checkbox" checked={true} disabled className="w-5 h-5 rounded accent-ocean-600" />
                    <span className="font-bold text-sm text-slate-600">💬 In-app Chat</span>
                    <span className="text-[9px] text-slate-400 font-bold ml-auto">Always on</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                    <input type="checkbox" checked={contactPrefs.phone || false} onChange={e => setContactPrefs(p => ({ ...p, phone: e.target.checked }))} className="w-5 h-5 rounded accent-ocean-600" />
                    <span className="font-bold text-sm text-slate-600">📞 Show Phone Number</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                    <input type="checkbox" checked={contactPrefs.whatsapp || false} onChange={e => setContactPrefs(p => ({ ...p, whatsapp: e.target.checked }))} className="w-5 h-5 rounded accent-ocean-600" />
                    <span className="font-bold text-sm text-slate-600">💚 WhatsApp</span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 font-bold">Your email is never shown to buyers.</p>
              </div>

              <ContinueButton onClick={nextStep} disabled={!area} label="Review Listing" />
              <BackButton onClick={prevStep} />
            </div>
          )}

          {/* ===== STEP 5: REVIEW & PUBLISH ===== */}
          {step === 5 && (
            <div className="space-y-8 animate-in zoom-in-95 text-center">
              <StepHeader title="Review & Publish" stepLabel="Step 5 of 5" />

              {/* Preview Card */}
              <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100 flex items-center space-x-6 text-left shadow-inner">
                {photos[0] && <img src={photos[0].preview} className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-white" alt="Cover" />}
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-ocean-700 uppercase tracking-widest mb-1">{category}</p>
                  <p className="font-heading font-black text-slate-900 truncate text-lg">{title}</p>
                  <p className="text-2xl font-heading font-black text-slate-950 mt-1">₹ {parseFloat(price || '0').toLocaleString('en-IN')}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase">{condition.replace('_', ' ')}</span>
                    {isNegotiable && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Negotiable</span>}
                  </div>
                </div>
              </div>

              {/* Summary Sections */}
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold text-slate-500">📸 Photos</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{photos.length} photos</span>
                    <button onClick={() => goToStep(1)} className="text-ocean-600 text-xs font-black">✏️</button>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold text-slate-500">📍 Location</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{city}{area ? `, ${area}` : ''}</span>
                    <button onClick={() => goToStep(4)} className="text-ocean-600 text-xs font-black">✏️</button>
                  </div>
                </div>
                {accessories.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-xs font-bold text-slate-500">🎁 Extras</span>
                    <span className="text-xs font-bold text-slate-700">{accessories.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Verification CTA */}
              <div className="space-y-4">
                {!isVerified && (
                  <button onClick={handleVerifyLocation} disabled={isVerifying} className="w-full p-5 bg-amber-50 text-amber-700 rounded-3xl border-2 border-amber-100 flex items-center justify-between group hover:bg-amber-100 transition-colors">
                    <div className="flex items-center space-x-4"><MapPin size={24} /> <div className="text-left"><p className="font-black text-xs uppercase tracking-widest">Verify Island Residency</p><p className="text-[10px] font-bold opacity-80">Boost trust by 40% with local verification</p></div></div>
                    {isVerifying ? <div className="animate-spin h-5 w-5 border-2 border-amber-700 border-t-transparent rounded-full"></div> : <ChevronRight size={20} />}
                  </button>
                )}
                {isVerified && <div className="p-5 bg-emerald-50 text-emerald-700 rounded-3xl border-2 border-emerald-100 flex items-center justify-center space-x-3 font-black text-xs uppercase tracking-widest"><Check size={20} /> <span>Island Verified Resident</span></div>}
              </div>

              <button onClick={handleSave} disabled={loading} className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-xl shadow-2xl active:scale-95 transition-all uppercase tracking-tighter">
                {loading ? 'Publishing...' : (editId ? 'Update Ad Now' : 'Publish Ad Now')}
              </button>

              {!isVerified && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center"><AlertCircle size={10} className="mr-2" /> Unverified accounts have limited visibility.</p>}
              <BackButton onClick={prevStep} />
            </div>
          )}

          {/* ===== STEP 6: SUCCESS ===== */}
          {step === 6 && (
            <div className="text-center py-12 space-y-8 animate-in zoom-in-90">
              <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-[48px] flex items-center justify-center mx-auto shadow-inner border-4 border-white"><Check size={64} strokeWidth={4} /></div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter">{editId ? 'Ad Updated!' : 'Published!'}</h2>
                <p className="text-slate-500 font-bold text-sm">Your item is now live for the island community.</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black mt-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live Now
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <button onClick={() => navigate('/listings')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Browse Marketplace</button>
                <button onClick={() => { setStep(1); setPhotos([]); setTitle(''); setDescription(''); setPrice(''); setCategory(null); setCondition('good'); }} className="w-full py-4 bg-ocean-50 text-ocean-700 border-2 border-ocean-100 rounded-2xl font-black uppercase text-[11px] tracking-widest">Post Another Ad</button>
                <button onClick={() => navigate('/profile')} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl font-black uppercase text-[11px] tracking-widest">My Account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
