
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Loader2, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Settings,
  RefreshCcw,
  Info
} from 'lucide-react';

const SUPABASE_PROJECT_ID = "msxeqzceqjatoaluempo";
const REDIRECT_URI = `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1/callback`;

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'otp' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const clearState = () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setResending(true);
    setError(null);
    try {
      // Explicitly use the current origin for redirection
      const currentOrigin = window.location.origin;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: currentOrigin
        }
      });
      if (error) throw error;
      setSuccessMsg(`Verification link resent to ${email}! Please check your inbox. If the link still points to localhost, you must update the "Site URL" in your Supabase Dashboard.`);
    } catch (err: any) {
      setError(err.message || "Failed to resend email. You might be hitting rate limits (3/hour).");
    } finally {
      setResending(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google') => {
    clearState();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("OAuth Error:", err);
      setError(
        <div className="space-y-2">
          <p className="font-bold">Authentication Failed</p>
          <p className="text-xs opacity-90">{err.message || 'Check your Supabase/Google configuration.'}</p>
        </div>
      );
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setLoading(true);

    try {
      const currentOrigin = window.location.origin;
      
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            setError(
              <div className="space-y-3">
                <p className="font-bold">Email Not Verified</p>
                <p className="text-xs opacity-90">Check your inbox for a verification link. Links default to localhost unless configured in your dashboard.</p>
                <button 
                  onClick={handleResendEmail}
                  className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-white bg-slate-800 px-4 py-2 rounded-xl hover:bg-black transition-colors"
                >
                  <RefreshCcw size={12} className={resending ? 'animate-spin' : ''} />
                  <span>{resending ? 'Sending...' : 'Resend to Current Origin'}</span>
                </button>
              </div>
            );
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              name: fullName,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            },
            emailRedirectTo: currentOrigin
          }
        });
        if (error) throw error;
        setSuccessMsg(`Success! A verification link has been sent to ${email}. Note: If the link in the email is broken (localhost), you need to set your Site URL in the Supabase Dashboard > Authentication > URL Configuration.`);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Auth action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 bg-slate-50 py-12">
      <div className="w-full max-w-md bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100 ring-1 ring-black/5">
        <div className="bg-ocean-700 p-10 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full opacity-10 blur-3xl translate-x-12 -translate-y-12"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-coral-500 rounded-full opacity-20 blur-2xl -translate-x-8 translate-y-8"></div>
            <h2 className="text-4xl font-heading font-black tracking-tight relative z-10">AndamanBazaar</h2>
            <p className="mt-3 text-ocean-100 font-bold relative z-10 text-sm tracking-wide">Community Trade Platform</p>
        </div>
        
        <div className="p-8 md:p-10">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10">
            {['login', 'signup'].map((m) => (
              <button 
                key={m}
                onClick={() => { setMode(m as any); clearState(); }}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === m ? 'bg-white shadow-lg text-ocean-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-50 text-red-600 text-sm font-medium rounded-3xl border border-red-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
               <AlertCircle size={20} className="shrink-0 mt-0.5" />
               <div className="leading-relaxed flex-1">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-8 p-5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-3xl border border-emerald-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                <CheckCircle size={20} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : mode === 'login' ? 'Sign In Securely' : 'Create Island Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-4 text-center">
               <button 
                onClick={handleResendEmail}
                disabled={resending || !email}
                className="text-[10px] font-black text-ocean-700 uppercase tracking-widest hover:underline disabled:opacity-30"
               >
                 {resending ? 'Resending link...' : "Didn't receive verification email?"}
               </button>
            </div>
          )}

          <div className="mt-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300"><span className="bg-white px-6 tracking-[0.3em]">Direct Access</span></div>
            </div>

            <button 
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-4 py-5 border-2 border-slate-100 rounded-3xl hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-black text-slate-700 text-xs uppercase tracking-widest">Continue with Google</span>
            </button>
          </div>

          <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-100 space-y-4">
            <div className="bg-blue-50 p-6 rounded-[32px] space-y-3">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center">
                <Info size={12} className="mr-2" /> Localhost Link Fix
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed font-semibold">
                If the email link starts with <code className="bg-white px-1">localhost:3000</code>, you MUST update your <b>Site URL</b> in the Supabase Dashboard to point to your current URL.
              </p>
            </div>

            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-ocean-700 transition-colors py-2"
            >
              <div className="flex items-center space-x-3">
                <HelpCircle size={14} className="text-ocean-500" />
                <span>Fixing 403 / Redirects</span>
              </div>
              {showHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showHelp && (
              <div className="mt-2 p-6 bg-slate-50 rounded-[32px] space-y-6 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-ocean-700 uppercase tracking-widest flex items-center">
                    <Settings size={12} className="mr-2" /> Site URL Configuration
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium">Add this origin to your <b>Redirect URIs</b> in Supabase Auth settings:</p>
                  <div className="group relative">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 pr-12 text-[10px] font-mono text-slate-500 break-all select-all">
                      {window.location.origin}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(window.location.origin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-50 hover:bg-ocean-100 rounded-xl transition-colors text-slate-400 hover:text-ocean-700"
                    >
                      {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <a 
                    href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/auth/url-configuration`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full py-3 bg-ocean-100 text-ocean-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-ocean-200 transition-colors"
                  >
                    <span>Supabase URL Settings</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Island Verified Technology &copy; 2024</p>
    </div>
  );
};
