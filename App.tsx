
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
import { ToastProvider } from './components/Toast';

const ConfigRequiredView: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden text-center p-10 space-y-8 animate-slide-up">
      <div className="w-24 h-24 bg-ocean-50 text-ocean-600 rounded-[32px] flex items-center justify-center mx-auto shadow-inner border border-ocean-100">
        <AlertTriangle size={48} />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-heading font-black text-slate-950 tracking-tight leading-tight">
          Configuration <br />Required
        </h1>
        <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
          AndamanBazaar needs your Supabase keys to connect to the database.
        </p>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-left space-y-4">
        <div className="flex items-center space-x-2 text-ocean-400">
          <Terminal size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Setup Instructions</span>
        </div>
        <ol className="text-xs text-slate-300 font-medium space-y-3 list-decimal list-inside">
          <li>Create a project at <a href="https://supabase.com" className="text-white underline hover:text-ocean-300">supabase.com</a></li>
          <li>Copy your <span className="text-white">Project URL</span> and <span className="text-white">Anon Key</span></li>
          <li>Create a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-ocean-300">.env</code> file in your root folder</li>
          <li>Add the variables as shown in <code className="bg-slate-800 px-1.5 py-0.5 rounded">.env.example</code></li>
        </ol>
      </div>

      <div className="pt-4 flex flex-col gap-3">
        <button
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-ocean-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-ocean-700/20 active:scale-95 transition-all"
        >
          I've added the keys, reload!
        </button>
        <a
          href="https://supabase.com/docs/guides/getting-started/quickstarts/reactjs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-ocean-700 transition-colors"
        >
          <span>Need help? View Docs</span>
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-600"></div>
      </div>
    );
  }

  if (!configured) {
    return <ConfigRequiredView />;
  }

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
};

export default App;
