import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './views/Home';
import { Listings } from './views/Listings';
import { ListingDetail } from './views/ListingDetail';
import { CreateListing } from './views/CreateListing';
import { ChatList } from './views/ChatList';
import { ChatRoom } from './views/ChatRoom';
import { Profile } from './views/Profile';
import { Dashboard } from './views/Dashboard';
import { AuthView } from './views/AuthView';
import { PrivacyPolicy } from './views/PrivacyPolicy';
import { TermsOfService } from './views/TermsOfService';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { AlertTriangle, Terminal, ExternalLink } from 'lucide-react';

const ConfigRequiredView: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-abyss p-6">
    <div className="max-w-md w-full bg-carbon rounded-lg shadow-elevation-high border border-warm overflow-hidden text-center p-10 space-y-10 animate-slide-up">
      <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center mx-auto border border-emerald-500/30 shadow-glow">
        <Terminal size={40} />
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-snow tracking-tighter uppercase leading-none">
          Initialization <br/>Required
        </h1>
        <p className="text-slate-500 font-mono text-[10px] leading-loose uppercase tracking-[0.3em]">
          SYSTEM_ACCESS_DENIED: MISSING_ENV_VARS
        </p>
      </div>
      
      <div className="bg-abyss rounded border border-warm p-6 text-left space-y-6">
        <div className="flex items-center space-x-3 text-emerald-500">
          <Settings size={16} />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Setup Protocol</span>
        </div>
        <ol className="text-[11px] font-mono text-parchment space-y-4 list-none">
          <li className="flex items-start space-x-3">
             <span className="text-emerald-500">01.</span>
             <span>Access project at <a href="https://supabase.com" className="text-emerald-400 underline hover:text-emerald-300">supabase.com</a></span>
          </li>
          <li className="flex items-start space-x-3">
             <span className="text-emerald-500">02.</span>
             <span>Retrieve [ PROJECT_URL ] and [ ANON_KEY ]</span>
          </li>
          <li className="flex items-start space-x-3">
             <span className="text-emerald-500">03.</span>
             <span>Inject into <code className="bg-carbon px-1.5 py-0.5 rounded text-snow">.env</code> file</span>
          </li>
        </ol>
      </div>

      <div className="pt-4 flex flex-col gap-4">
        <button 
          onClick={() => window.location.reload()}
          className="w-full btn-premium shadow-glow font-mono text-[10px] tracking-[0.2em]"
        >
          REBOOT_SYSTEM
        </button>
        <a 
          href="https://supabase.com/docs/guides/getting-started/quickstarts/reactjs" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-3 text-[9px] font-mono text-slate-600 uppercase tracking-widest hover:text-emerald-500 transition-colors"
        >
          <span>READ_DOCUMENTATION</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Session init warning:', error.message);
        }
        setUser(data?.session?.user ?? null);
      } catch (err) {
        console.error('Critical auth error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-abyss space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-6 h-6 bg-emerald-500/10 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-emerald-500 animate-pulse">Initializing_Identity_Shell...</p>
      </div>
    );
  }

  if (!configured) {
    return <ConfigRequiredView />;
  }

  return (
    <HashRouter>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route 
            path="/post" 
            element={user ? <CreateListing /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/chats" 
            element={user ? <ChatList /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/chats/:id" 
            element={user ? <ChatRoom /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/profile" 
            element={user ? <Profile /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/auth" 
            element={!user ? <AuthView /> : <Navigate to="/" />} 
          />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
