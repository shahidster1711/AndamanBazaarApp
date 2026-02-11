
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Camera, MapPin, ChevronRight, ChevronLeft, Check, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';

export const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!editId);
  const [category, setCategory] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Port Blair');
  const [area, setArea] = useState('');

  const [photos, setPhotos] = useState<{ file?: File; preview: string; id?: string }[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_location_verified, city, area').eq('id', user.id).single();
        if (profile?.is_location_verified) setIsVerified(true);

        if (!editId) {
          if (profile?.city) setCity(profile.city);
          if (profile?.area) setArea(profile.area);
        }

        if (editId) {
          try {
            const { data: listing, error } = await supabase
              .from('listings')
              .select('id, title, price, description, city, area, category_id, images:listing_images(id, image_url, display_order)')
              .eq('id', editId)
              .single();

            if (listing) {
              setTitle(listing.title);
              setPrice(listing.price.toString());
              setDescription(listing.description);
              setCity(listing.city);
              setArea(listing.area || '');

              if (listing.category_id) {
                const normalizedCat = listing.category_id.charAt(0).toUpperCase() + listing.category_id.slice(1).toLowerCase();
                setCategory(normalizedCat);
              }

              if (listing.images) {
                const existingPhotos = listing.images
                  .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                  .map((img: any) => ({ preview: img.image_url, id: img.id }));
                setPhotos(existingPhotos);
              }
              setStep(2);
            }
          } catch (err) {
            console.error("Fetch listing error:", err);
          } finally {
            setFetching(false);
          }
        }
      }
    };
    init();
  }, [editId]);

  const nextStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => s + 1);
  };

  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => s - 1);
  };

  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Optimized for 2G/3G connections: slightly smaller max resolution and WebP
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Use WebP with 60% quality for aggressive compression
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Image resizing failed'));
              return;
            }
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          }, 'image/webp', 0.6);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const checkImageSafety = async (file: File): Promise<{ safe: boolean; reason?: string }> => {
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenerativeAI(process.env.API_KEY || '');
      const model = ai.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              isSafe: { type: SchemaType.BOOLEAN },
              reason: { type: SchemaType.STRING },
            },
            required: ['isSafe'],
          },
        }
      });
      const response = await model.generateContent([
        { inlineData: { mimeType: 'image/webp', data: base64 } },
        { text: "Analyze this image for a general public marketplace. Is it safe (no nudity, gore, violence, or hate)? Return results in JSON format." }
      ]);

      const result = JSON.parse(response.response.text() || '{}');
      return { safe: result.isSafe === true, reason: result.reason };

    } catch (error) {
      console.error("Moderation error:", error);
      return { safe: true };
    }
  };

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const files = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'));

    if (photos.length + files.length > 8) {
      alert("Max 8 photos allowed.");
      return;
    }

    setProcessingImages(true);

    try {
      const processedPhotos: { file: File; preview: string }[] = [];

      for (const file of files) {
        try {
          const resizedFile = await resizeImage(file);
          const safetyCheck = await checkImageSafety(resizedFile);

          if (safetyCheck.safe) {
            processedPhotos.push({
              file: resizedFile,
              preview: URL.createObjectURL(resizedFile)
            });
          } else {
            alert(`Photo "${file.name}" was blocked: ${safetyCheck.reason || 'Unsafe content detected.'}`);
          }
        } catch (err) {
          console.error(`Failed to process ${file.name}`, err);
          alert(`Could not process image ${file.name}`);
        }
      }

      setPhotos(prev => [...prev, ...processedPhotos]);
    } finally {
      setProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const photoToRemove = photos[index];
    if (photoToRemove.id) {
      setDeletedPhotoIds(prev => [...prev, photoToRemove.id!]);
    }
    setPhotos(prev => {
      const newArr = [...prev];
      if (newArr[index].file) URL.revokeObjectURL(newArr[index].preview);
      newArr.splice(index, 1);
      return newArr;
    });
  };

  const handleVerifyLocation = async () => {
    if (isVerifying || isVerified) return;
    setIsVerifying(true);
    if (!navigator.geolocation) { alert("Geolocation not supported."); setIsVerifying(false); return; }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const inAndamans = latitude >= 6.0 && latitude <= 14.5 && longitude >= 92.0 && longitude <= 94.5;
        if (inAndamans) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').update({ is_location_verified: true, city, area }).eq('id', user.id);
            setIsVerified(true);
          }
        } else {
          alert(`You appear to be outside the Islands. Verification is for local residents only.`);
        }
        setIsVerifying(false);
      },
      () => { alert("Location access denied."); setIsVerifying(false); },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first.");

      const payload = {
        user_id: user.id,
        title,
        price: parseFloat(price),
        description,
        city,
        area,
        category_id: category?.toLowerCase(),
        status: 'active'
      };

      let listingId = editId;
      if (editId) {
        const { error: updateError } = await supabase.from('listings').update(payload).eq('id', editId);
        if (updateError) throw updateError;
        if (deletedPhotoIds.length > 0) {
          await supabase.from('listing_images').delete().in('id', deletedPhotoIds);
        }
      } else {
        const { data, error: insertError } = await supabase.from('listings').insert(payload).select('id').single();
        if (insertError) throw insertError;
        listingId = data.id;
      }

      const newPhotos = photos.filter(p => p.file);
      for (const photo of newPhotos) {
        const fileExt = 'webp';
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('listings').upload(fileName, photo.file!, {
          contentType: 'image/webp'
        });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName);
          await supabase.from('listing_images').insert({
            listing_id: listingId,
            image_url: publicUrl,
            display_order: photos.indexOf(photo)
          });
        }
      }

      const existingPhotosRemaining = photos.filter(p => p.id);
      for (const photo of existingPhotosRemaining) {
        await supabase.from('listing_images')
          .update({ display_order: photos.indexOf(photo) })
          .eq('id', photo.id);
      }

      setStep(5);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4">
      <div className="animate-spin h-10 w-10 border-t-2 border-ocean-600 rounded-full"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Listing Data...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
        <div className="h-2 bg-slate-100"><div className="h-full bg-ocean-600 transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div></div>
        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-black">{editId ? 'Modify Category' : 'Choose Category'}</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Step 1 of 4</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['Mobiles', 'Vehicles', 'Home', 'Fashion', 'Property', 'Services'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); nextStep(); }}
                    className={`p-8 rounded-3xl border-2 transition-all group ${category === cat
                      ? 'bg-ocean-50 border-ocean-600 shadow-lg'
                      : 'bg-slate-50 border-transparent hover:border-ocean-300'
                      }`}
                  >
                    <span className={`font-black uppercase text-[10px] tracking-widest ${category === cat ? 'text-ocean-700' : 'text-slate-400 group-hover:text-ocean-700'}`}>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-black">Ad Information</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Step 2 of 4</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Listing Title</label>
                  <input type="text" placeholder="e.g. Royal Enfield Classic 350" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-ocean-600 outline-none font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                  <input type="number" placeholder="Enter Amount" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-ocean-600 outline-none font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea placeholder="Describe item details, condition, and inclusions..." rows={4} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-ocean-600 outline-none font-medium text-sm leading-relaxed"></textarea>
                </div>
              </div>
              <button onClick={nextStep} disabled={!title || !price || !description} className="w-full py-4 bg-ocean-700 text-white rounded-2xl font-black shadow-lg shadow-ocean-700/20 active:scale-95 disabled:opacity-50 transition-all uppercase text-[10px] tracking-widest">Continue</button>
              <button onClick={prevStep} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest">Back</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-black">Media & Location</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Step 3 of 4</p>
              </div>

              <div
                onClick={() => !processingImages && fileInputRef.current?.click()}
                className={`h-48 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50 hover:bg-white transition-colors cursor-pointer p-4 group ${processingImages ? 'opacity-50 cursor-wait' : ''}`}
              >
                <input type="file" multiple hidden ref={fileInputRef} onChange={e => handleFiles(e.target.files)} disabled={processingImages} />

                {processingImages ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <Loader2 size={40} className="text-ocean-600 animate-spin mb-2" />
                    <span className="font-bold text-ocean-700 uppercase text-[10px] tracking-widest">Compressing for Island Data...</span>
                  </div>
                ) : photos.length === 0 ? (
                  <>
                    <Camera size={40} className="text-slate-300 mb-2 group-hover:text-ocean-400 transition-colors" />
                    <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center px-4">Optimized photo uploads (up to 8)</span>
                  </>
                ) : (
                  <div className="flex gap-2 overflow-x-auto w-full p-2 scrollbar-hide">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm border-2 border-white">
                        <img src={p.preview} className="w-full h-full object-cover" />
                        <button onClick={e => removePhoto(i, e)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition-colors">×</button>
                      </div>
                    ))}
                    {photos.length < 8 && (
                      <div className="w-24 h-24 flex items-center justify-center bg-slate-100 rounded-2xl border-2 border-slate-200 text-slate-300 flex-shrink-0 hover:bg-slate-200 transition-colors">
                        <PlusCircle size={32} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Island/City</label>
                  <select value={city} onChange={e => setCity(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold outline-none">
                    <option>Port Blair</option><option>Havelock</option><option>Neil Island</option><option>Diglipur</option><option>Mayabunder</option><option>Rangat</option><option>Campbell Bay</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Local Area</label>
                  <input placeholder="e.g. Garacharma" value={area} onChange={e => setArea(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold outline-none" />
                </div>
              </div>
              <button onClick={nextStep} disabled={photos.length === 0 || !area || processingImages} className="w-full py-4 bg-ocean-700 text-white rounded-2xl font-black shadow-lg shadow-ocean-700/20 active:scale-95 disabled:opacity-50 transition-all uppercase text-[10px] tracking-widest">Review Listing</button>
              <button onClick={prevStep} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest">Back</button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in zoom-in-95 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-black">Final Confirmation</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Step 4 of 4</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100 flex items-center space-x-6 text-left shadow-inner">
                {photos[0] && <img src={photos[0].preview} className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-white" />}
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-ocean-700 uppercase tracking-widest mb-1">{category}</p>
                  <p className="font-heading font-black text-slate-900 truncate text-lg">{title}</p>
                  <p className="text-2xl font-heading font-black text-slate-950 mt-1">₹ {parseFloat(price).toLocaleString('en-IN')}</p>
                </div>
              </div>

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
                {loading ? 'Processing...' : (editId ? 'Update Ad Now' : 'Publish Ad Now')}
              </button>

              {!isVerified && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center"><AlertCircle size={10} className="mr-2" /> Unverified accounts have limited visibility.</p>}
              <button onClick={prevStep} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest">Edit Details</button>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-12 space-y-8 animate-in zoom-in-90">
              <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-[48px] flex items-center justify-center mx-auto shadow-inner border-4 border-white"><Check size={64} strokeWidth={4} /></div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter">{editId ? 'Ad Updated!' : 'Published!'}</h2>
                <p className="text-slate-500 font-bold text-sm">Your item is now live for the island community.</p>
              </div>
              <div className="flex flex-col gap-4">
                <button onClick={() => navigate('/listings')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Browse Marketplace</button>
                <button onClick={() => navigate('/profile')} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl font-black uppercase text-[11px] tracking-widest">My Account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
