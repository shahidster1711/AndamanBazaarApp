
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
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 bg-abyss py-12">
      <div className="w-full max-w-md bg-carbon rounded-lg shadow-elevation-high overflow-hidden border border-warm">
        <div className="bg-abyss p-10 text-white text-center relative overflow-hidden border-b border-warm">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl translate-x-12 -translate-y-12 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -translate-x-8 translate-y-8 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <h2 className="text-3xl font-heading font-black tracking-tight relative z-10 uppercase">Andaman<span className="text-emerald-500 logo-glow">Bazaar</span></h2>
            <p className="mt-4 text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em] relative z-10 animate-pulse">SYSTEM_ACCESS_PROTOCOL</p>
        </div>
        
        <div className="p-8 md:p-10">
          <div className="flex bg-abyss p-1.5 rounded-lg mb-10 border border-warm">
            {['login', 'signup'].map((m) => (
              <button 
                key={m}
                onClick={() => { setMode(m as any); clearState(); }}
                className={`flex-1 py-3 text-[10px] font-mono uppercase tracking-[0.2em] rounded transition-all ${mode === m ? 'bg-carbon text-emerald-500 shadow-glow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-500/5 text-red-500 text-xs font-mono rounded border border-red-500/30 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
               <AlertCircle size={16} className="shrink-0 mt-0.5" />
               <div className="leading-loose flex-1 uppercase tracking-widest">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-8 p-5 bg-emerald-500/5 text-emerald-500 text-xs font-mono rounded border border-emerald-500/30 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <p className="leading-loose uppercase tracking-widest">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-6">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var display_name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. USER_01" className="w-full p-4 bg-abyss border border-warm focus:border-emerald-500 rounded outline-none font-mono text-snow text-sm transition-all" required />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var email_address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="root@island.net" className="w-full p-4 bg-abyss border border-warm focus:border-emerald-500 rounded outline-none font-mono text-snow text-sm transition-all" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] ml-1">var secret_key</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-abyss border border-warm focus:border-emerald-500 rounded outline-none font-mono text-snow text-sm transition-all" required />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-premium py-5 font-mono text-[10px] tracking-[0.3em] shadow-glow">
              {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : mode === 'login' ? 'INITIALIZE_SESSION' : 'GENERATE_IDENTITY'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 text-center">
               <button 
                onClick={handleResendEmail}
                disabled={resending || !email}
                className="text-[9px] font-mono text-slate-600 uppercase tracking-widest hover:text-emerald-500 disabled:opacity-30 transition-colors"
               >
                 {resending ? 'sending_handshake...' : "PROTOCOL_RECOVERY: RESEND_EMAIL"}
               </button>
            </div>
          )}

          <div className="mt-12">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-warm"></div></div>
              <div className="relative flex justify-center text-[9px] uppercase font-mono text-slate-600 tracking-[0.4em]"><span className="bg-carbon px-6">OAuth Handshake</span></div>
            </div>

            <button 
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-4 py-4 border border-warm rounded hover:border-emerald-500 transition-all active:scale-95 disabled:opacity-50 group bg-abyss"
            >
              <svg className="w-4 h-4 group-hover:logo-glow transition-all" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity="0.8" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" opacity="0.6" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity="0.9" />
              </svg>
              <span className="font-mono text-snow text-[10px] uppercase tracking-[0.2em]">tunnel@google</span>
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-dashed border-warm space-y-6">
            <div className="bg-abyss p-6 rounded border border-emerald-500/20 space-y-4 shadow-glow">
              <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest flex items-center">
                <Info size={12} className="mr-3" /> REDIRECT_CONFIG_NOTICE
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium font-sans">
                If the handshake link targets <code className="bg-carbon px-1 text-snow border border-warm">localhost:3000</code>, update your <b>Site URL</b> in the cluster dashboard.
              </p>
            </div>

            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em] hover:text-emerald-500 transition-colors py-2"
            >
              <div className="flex items-center space-x-3">
                <HelpCircle size={14} className="text-emerald-500" />
                <span>DEBUG_403_ERRORS</span>
              </div>
              {showHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showHelp && (
              <div className="mt-2 p-6 bg-abyss rounded border border-warm space-y-6 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-4">
                  <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest flex items-center">
                    <Settings size={12} className="mr-3" /> SHELL_ORIGIN_SYNC
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Inject this origin into your cluster <b>Redirect URIs</b>:</p>
                  <div className="group relative">
                    <div className="bg-carbon border border-warm rounded p-4 pr-12 text-[10px] font-mono text-snow break-all select-all">
                      {window.location.origin}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(window.location.origin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-emerald-500/10 rounded transition-colors text-slate-600 hover:text-emerald-500"
                    >
                      {copied ? <CheckCircle size={14} className="text-emerald-500 shadow-glow" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <a 
                    href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/auth/url-configuration`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-3 w-full py-3 bg-carbon text-emerald-500 border border-warm rounded text-[10px] font-mono uppercase tracking-widest hover:border-emerald-500 transition-all shadow-glow"
                  >
                    <span>CONFIG_DASHBOARD</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-12 text-[10px] font-mono text-slate-700 uppercase tracking-[0.4em] animate-pulse">NODE_VERSION: 1.0.0 :: STABLE</p>
    </div>
  );
};
