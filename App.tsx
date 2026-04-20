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
  <div className="min-h-screen flex items-center justify-center bg-arches p-6">
    <div className="max-w-md w-full bg-white rounded-airbnb-lg shadow-airbnb border border-gray-200 overflow-hidden text-center p-10 space-y-8 animate-slide-up">
      <div className="w-20 h-20 bg-rausch-50 text-rausch rounded-full flex items-center justify-center mx-auto border border-rausch-100">
        <AlertTriangle size={40} />
      </div>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-hof tracking-tight">
          Configuration <br/>Required
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed px-4">
          AndamanBazaar needs your Supabase keys to connect to the database.
        </p>
      </div>
      
      <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4 border border-gray-100">
        <div className="flex items-center space-x-2 text-hof">
          <Terminal size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Setup Instructions</span>
        </div>
        <ol className="text-xs text-gray-600 font-medium space-y-3 list-decimal list-inside">
          <li>Create a project at <a href="https://supabase.com" className="text-rausch underline hover:text-rausch-600">supabase.com</a></li>
          <li>Copy your <span className="text-hof font-bold">Project URL</span> and <span className="text-hof font-bold">Anon Key</span></li>
          <li>Create a <code className="bg-gray-200 px-1.5 py-0.5 rounded text-hof">.env</code> file in your root folder</li>
          <li>Add the variables as shown in <code className="bg-gray-200 px-1.5 py-0.5 rounded">.env.example</code></li>
        </ol>
      </div>

      <div className="pt-4 flex flex-col gap-3">
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3.5 airbnb-button shadow-md active:scale-95 transition-all text-sm"
        >
          I've added the keys, reload!
        </button>
        <a 
          href="https://supabase.com/docs/guides/getting-started/quickstarts/reactjs" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-rausch transition-colors"
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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rausch"></div>
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
