import React, { useState, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth as firebaseAuth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { Home } from './pages/Home';
import { Listings } from './pages/Listings';
import { ListingDetail } from './pages/ListingDetail';
import { SellerProfile } from './pages/SellerProfile';
import { CreateListing } from './pages/CreateListing';
import { ChatList } from './pages/ChatList';
import { ChatRoom } from './pages/ChatRoom';
import { Profile } from './pages/Profile';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { AuthView } from './pages/AuthView';
import { BoostSuccess } from './pages/BoostSuccess';
import { Todos } from './pages/Todos';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { About } from './pages/About';
import { Pricing } from './pages/Pricing';
import { ContactUs } from './pages/ContactUs';
import { NotFound } from './pages/NotFound';

import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

type LayoutUser = React.ComponentProps<typeof Layout>['user'];
type User = NonNullable<LayoutUser>;
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const bypassAuth =
    import.meta.env.VITE_E2E_BYPASS_AUTH === 'true' ||
    new URLSearchParams(window.location.search).get('e2e') === '1';

  useEffect(() => {
    if (bypassAuth) {
      setUser(({ id: 'e2e-user', email: 'e2e@example.com' } as unknown) as User);
      setLoading(false);
      return;
    }

    const ensureProfileExists = async (firebaseUser: any) => {
      try {
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Island User',
            profilePhotoUrl: firebaseUser.photoURL || '',
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (err) {
        console.error('Profile fallback error:', err);
      }
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const mapped = { id: firebaseUser.uid, email: firebaseUser.email || '' } as unknown as User;
        setUser(mapped);
        await ensureProfileExists(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bypassAuth]);

  const RequireAuth = ({ children, user, loading }: { children: React.ReactNode, user: User | null, loading: boolean }) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
        </div>
      );
    }
    return user ? <>{children}</> : <Navigate to="/auth" />;
  };

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ToastProvider>
          <BrowserRouter>
          <Layout user={user}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/seller/:sellerId" element={<SellerProfile />} />
              <Route path="/post" element={<RequireAuth user={user} loading={loading}><CreateListing /></RequireAuth>} />
              <Route path="/chats" element={<RequireAuth user={user} loading={loading}><ChatList /></RequireAuth>} />
              <Route path="/chats/:chatId" element={<RequireAuth user={user} loading={loading}><ChatRoom /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth user={user} loading={loading}><Profile /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth user={user} loading={loading}><Dashboard /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth user={user} loading={loading}><Admin /></RequireAuth>} />
              <Route path="/auth" element={<AuthView />} />
              <Route path="/boost-success" element={<RequireAuth user={user} loading={loading}><BoostSuccess /></RequireAuth>} />
              <Route path="/todos" element={<Todos />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/about" element={<About />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </HelmetProvider>
  </ErrorBoundary>
  );

};

export default App;
