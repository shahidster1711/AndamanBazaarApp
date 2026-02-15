import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Native Polish - Status Bar & Keyboard
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#ffffff' });
      Keyboard.setAccessoryBarVisible({ isVisible: true });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="text-center bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-2xl w-full border border-yellow-500/30">
          <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-6" />
          <h1 className="text-4xl font-bold mb-4 text-gray-100">Supabase Not Configured</h1>
          <p className="text-lg text-gray-400 mb-6">
            Your Supabase environment variables are missing. Please create a <code className="bg-gray-700 text-yellow-400 font-mono px-2 py-1 rounded-md text-base">.env</code> file
            and add your Supabase URL and anonymous key.
          </p>
          <div className="bg-gray-900/50 text-left p-6 rounded-lg font-mono text-sm text-gray-300 border border-gray-700">
            <p><span className="text-green-400">VITE_SUPABASE_URL</span>="your-supabase-url"</p>
            <p><span className="text-green-400">VITE_SUPABASE_ANON_KEY</span>="your-supabase-anon-key"</p>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            If you need help finding these, check the <a href="https://supabase.com/docs/guides/getting-started/quickstarts/reactjs#get-the-api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors duration-200 flex items-center justify-center gap-1">
              Supabase documentation <ExternalLink size={14} />
            </a>.
          </p>
        </div>
        <div className="mt-8 flex items-center text-gray-500">
          <Terminal size={16} className="mr-2" />
          <p>This is a mock terminal. Run commands in the real terminal below.</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Layout user={user}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/create" element={user ? <CreateListing /> : <Navigate to="/auth" />} />
            <Route path="/chat" element={user ? <ChatList /> : <Navigate to="/auth" />} />
            <Route path="/chat/:chatId" element={user ? <ChatRoom /> : <Navigate to="/auth" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
            <Route path="/auth" element={<AuthView />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
