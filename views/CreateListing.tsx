
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { Camera, MapPin, ChevronRight, ChevronLeft, Check, PlusCircle, AlertCircle, Loader2, Rocket, ShieldCheck, Terminal } from 'lucide-react';

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

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/webp', data: base64 } },
            { text: "Analyze this image for a general public marketplace. Is it safe (no nudity, gore, violence, or hate)? Return results in JSON format." }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSafe: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
            },
            required: ['isSafe'],
          },
        }
      });

      const result = JSON.parse(response.text || '{}');
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
    <div className="h-screen flex flex-col items-center justify-center bg-abyss space-y-6">
      <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-emerald-500 rounded-full"></div>
      <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500 animate-pulse">Pulling_Unit_Data...</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in bg-abyss">
      <div className="bg-carbon rounded-lg shadow-elevation-high overflow-hidden border border-warm">
        <div className="h-1 bg-abyss">
          <div className="h-full bg-emerald-500 transition-all duration-700 shadow-glow" style={{ width: `${(step/5)*100}%` }}></div>
        </div>
        
        <div className="p-8 md:p-16">
          {step === 1 && (
            <div className="space-y-12 text-center animate-slide-up">
              <div className="space-y-4">
                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">step_01 // identify_class</p>
                <h2 className="text-4xl font-heading font-black text-snow uppercase tracking-tighter">{editId ? 'Modify Cluster' : 'Initialize Unit'}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['Mobiles', 'Vehicles', 'Home', 'Fashion', 'Property', 'Services'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { setCategory(cat); nextStep(); }} 
                    className={`p-6 rounded border transition-all group flex flex-col items-center space-y-4 ${
                      category === cat 
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-glow' 
                      : 'bg-abyss border-warm hover:border-emerald-500/50'
                    }`}
                  >
                    <span className={`font-mono uppercase text-[10px] tracking-widest ${category === cat ? 'text-emerald-500' : 'text-slate-500 group-hover:text-emerald-400'}`}>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 animate-slide-up">
              <div className="space-y-4 border-l-4 border-emerald-500 pl-8">
                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">step_02 // data_injection</p>
                <h2 className="text-3xl font-black text-snow uppercase tracking-tighter">Metadata Input</h2>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var unit_title</label>
                   <input type="text" placeholder="e.g. CORE_TRANS_UNIT_01" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 bg-abyss border border-warm rounded focus:border-emerald-500 outline-none font-mono text-snow text-sm transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var valuation (₹)</label>
                   <input type="number" placeholder="Enter Amount" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-4 bg-abyss border border-warm rounded focus:border-emerald-500 outline-none font-mono text-snow text-sm transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var specifications.log</label>
                   <textarea placeholder="Append condition, history, and modules..." rows={5} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-abyss border border-warm rounded focus:border-emerald-500 outline-none font-mono text-snow text-sm leading-relaxed transition-all"></textarea>
                </div>
              </div>
              <div className="flex flex-col gap-4 pt-8">
                <button onClick={nextStep} disabled={!title || !price || !description} className="btn-premium w-full text-xs font-mono tracking-widest py-5">CONTINUE_TO_MEDIA</button>
                <button onClick={prevStep} className="btn-ghost w-full text-[10px] font-mono tracking-widest">GO_BACK</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10 animate-slide-up">
              <div className="space-y-4 border-l-4 border-emerald-500 pl-8">
                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">step_03 // signal_capture</p>
                <h2 className="text-3xl font-black text-snow uppercase tracking-tighter">Media & Origin</h2>
              </div>
              
              <div 
                onClick={() => !processingImages && fileInputRef.current?.click()} 
                className={`h-56 border-2 border-dashed border-warm rounded-lg flex flex-col items-center justify-center bg-abyss hover:border-emerald-500/50 transition-all cursor-pointer p-6 group ${processingImages ? 'opacity-50 cursor-wait' : ''}`}
              >
                <input type="file" multiple hidden ref={fileInputRef} onChange={e => handleFiles(e.target.files)} disabled={processingImages} />
                
                {processingImages ? (
                   <div className="flex flex-col items-center space-y-4">
                     <Loader2 size={32} className="text-emerald-500 animate-spin" />
                     <span className="font-mono text-emerald-500 uppercase text-[10px] tracking-[0.3em] animate-pulse">Compressing_Packets...</span>
                   </div>
                ) : photos.length === 0 ? (
                  <div className="flex flex-col items-center space-y-4"> 
                    <Camera size={40} className="text-slate-600 group-hover:text-emerald-500 transition-colors" /> 
                    <span className="font-mono text-slate-500 uppercase text-[9px] tracking-[0.3em] text-center max-w-xs leading-loose">Upload Visual Proof (Up to 8 Fragments)</span> 
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto w-full p-2 no-scrollbar">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-24 h-24 rounded border border-warm overflow-hidden flex-shrink-0 shadow-glow">
                        <img src={p.preview} className="w-full h-full object-cover" />
                        <button onClick={e => removePhoto(i, e)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-glow hover:bg-red-600 transition-colors">×</button>
                      </div>
                    ))}
                    {photos.length < 8 && (
                      <div className="w-24 h-24 flex items-center justify-center bg-carbon rounded border border-warm text-emerald-500 flex-shrink-0 hover:border-emerald-500 transition-all">
                         <PlusCircle size={24} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var node_loc</label>
                    <select value={city} onChange={e => setCity(e.target.value)} className="w-full p-4 bg-abyss border border-warm rounded font-mono text-snow text-xs outline-none focus:border-emerald-500 appearance-none transition-all">
                        <option>Port Blair</option><option>Havelock</option><option>Neil Island</option><option>Diglipur</option><option>Mayabunder</option><option>Rangat</option><option>Campbell Bay</option>
                    </select>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var area_tag</label>
                    <input placeholder="e.g. SECTOR_07" value={area} onChange={e => setArea(e.target.value)} className="w-full p-4 bg-abyss border border-warm rounded font-mono text-snow text-xs outline-none focus:border-emerald-500 transition-all" />
                 </div>
              </div>

              <div className="flex flex-col gap-4 pt-8">
                <button onClick={nextStep} disabled={photos.length === 0 || !area || processingImages} className="btn-premium w-full text-xs font-mono tracking-widest py-5">VERIFY_INTEGRITY</button>
                <button onClick={prevStep} className="btn-ghost w-full text-[10px] font-mono tracking-widest">BACK_TO_DATA</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-12 animate-slide-up text-center">
              <div className="space-y-4">
                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">step_04 // final_handshake</p>
                <h2 className="text-3xl font-black text-snow uppercase tracking-tighter">System Audit</h2>
              </div>
              
              <div className="p-8 bg-abyss rounded border border-warm flex items-center space-x-8 text-left shadow-glow">
                {photos[0] && <img src={photos[0].preview} className="w-24 h-24 rounded border border-warm object-cover shadow-elevation-low" />}
                <div className="flex-1 overflow-hidden space-y-2">
                    <p className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">class::{category}</p>
                    <p className="font-mono font-bold text-snow truncate text-lg uppercase tracking-tight">{title}</p>
                    <p className="text-2xl font-heading font-black text-emerald-500">₹ {parseFloat(price).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="space-y-4">
                  {!isVerified && (
                    <button onClick={handleVerifyLocation} disabled={isVerifying} className="w-full p-6 bg-carbon rounded border border-warm flex items-center justify-between group hover:border-emerald-500 transition-all shadow-elevation-low">
                      <div className="flex items-center space-x-6">
                        <Terminal size={24} className="text-emerald-500 logo-glow" /> 
                        <div className="text-left space-y-1">
                          <p className="font-mono font-bold text-snow text-xs uppercase tracking-widest">Run Residency_Check</p>
                          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Improve visibility throughput by 40%</p>
                        </div>
                      </div>
                      {isVerifying ? <Loader2 className="animate-spin text-emerald-500" size={20} /> : <ChevronRight size={18} className="text-slate-600 group-hover:text-emerald-500" />}
                    </button>
                  )}
                  {isVerified && (
                    <div className="p-6 bg-emerald-500/5 text-emerald-500 rounded border border-emerald-500/30 flex items-center justify-center space-x-4 font-mono font-bold text-xs uppercase tracking-[0.3em] shadow-glow">
                      <ShieldCheck size={20} /> 
                      <span>Protocol_Verified :: Local_Node</span>
                    </div>
                  )}
              </div>
              
              <div className="flex flex-col gap-4 pt-8">
                <button onClick={handleSave} disabled={loading} className="w-full btn-premium py-6 font-mono text-xs tracking-[0.4em] shadow-glow">
                  {loading ? 'DEPLOYING...' : (editId ? 'UPDATE_REGISTRY' : 'PUBLISH_TO_CLUSTER')}
                </button>
                {!isVerified && <p className="text-[9px] font-mono text-red-500 uppercase tracking-[0.2em] flex items-center justify-center animate-pulse"><AlertCircle size={10} className="mr-2"/> System_Warning: Unverified signals throttled</p>}
                <button onClick={prevStep} className="btn-ghost w-full text-[10px] font-mono tracking-widest">EDIT_PARAMETERS</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-20 space-y-12 animate-in zoom-in-95">
               <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/30 flex items-center justify-center mx-auto shadow-glow">
                  <Rocket size={40} className="logo-glow" />
               </div>
               <div className="space-y-4">
                 <h2 className="text-4xl font-heading font-black text-snow uppercase tracking-tighter leading-none">{editId ? 'Update_Success' : 'Signal_Deployed'}</h2>
                 <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.2em] leading-loose">Unit is now broadcasting to the island mesh.</p>
               </div>
               <div className="flex flex-col gap-4 pt-8">
                 <button onClick={() => navigate('/listings')} className="btn-premium w-full font-mono text-[10px] tracking-widest">LS /MARKETPLACE</button>
                 <button onClick={() => navigate('/profile')} className="btn-ghost w-full font-mono text-[10px] tracking-widest">CAT /MY_IDENTITY</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
