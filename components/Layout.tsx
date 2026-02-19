
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Logo } from './Logo';
import { supabase } from '../lib/supabase';
import { Home, Search, PlusCircle, MessageCircle, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Initial Fetch
    const fetchUnread = async () => {
      const { data: chats } = await supabase
        .from('chats')
        .select('id, buyer_id, seller_id, buyer_unread_count, seller_unread_count')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (chats) {
        let count = 0;
        chats.forEach(chat => {
          if (chat.buyer_id === user.id) count += chat.buyer_unread_count || 0;
          if (chat.seller_id === user.id) count += chat.seller_unread_count || 0;
        });
        setUnreadCount(count);
      }
    };

    fetchUnread();

    // Realtime Subscription
    const channel = supabase
      .channel('layout_unread_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // High contrast active state
  const activeTabClass = "text-ocean-700 font-extrabold";
  const inactiveTabClass = "text-slate-500 font-medium hover:text-slate-900";

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-slate-900">
      {/* Header - Centered Branding */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-panel border-b border-ocean-100 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          {/* Left Actions - Hidden on mobile, spaced for center branding on desktop */}
          <div className="hidden md:flex flex-1 items-center space-x-6">
            <Link to="/listings" className={`text-sm font-black uppercase tracking-widest transition-all ${location.pathname === '/listings' ? 'text-ocean-600 underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'}`}>Explore</Link>
            <Link to="/todos" className={`text-sm font-black uppercase tracking-widest transition-all ${location.pathname === '/todos' ? 'text-ocean-600 underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'}`}>Tasks</Link>
          </div>

          {/* Centered Brand Identity - Upsized */}
          <Link to="/" className="flex items-center space-x-3 group justify-center">
            <div className="bg-gradient-to-br from-ocean-500 to-teal-500 text-white p-2 rounded-xl shadow-lg shadow-ocean-500/20 group-hover:rotate-3 transition-transform duration-300">
              <Logo size={28} className="text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-heading font-black tracking-tight text-slate-900 leading-none">
                Andaman<span className="text-transparent bg-clip-text bg-gradient-to-r from-ocean-500 to-teal-500">Bazaar</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">Local. Trusted.</span>
            </div>
          </Link>

          {/* Right Actions - Desktop Only */}
          <div className="hidden md:flex flex-1 justify-end items-center space-x-6">
            {user ? (
              <>
                <Link to="/chats" className="relative text-slate-500 hover:text-ocean-600 transition-colors p-2 hover:bg-slate-50 rounded-full">
                  <MessageCircle size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-coral-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="w-10 h-10 rounded-full bg-white p-0.5 border-2 border-slate-100 overflow-hidden hover:border-ocean-300 hover:shadow-md transition-all">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="User" className="w-full h-full rounded-full bg-slate-50" />
                </Link>
              </>
            ) : (
              <Link to="/auth" className="text-xs font-black uppercase tracking-widest text-ocean-600 hover:text-white hover:bg-ocean-600 px-4 py-2 rounded-full border border-ocean-100 transition-all">Sign In</Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-28 pb-32 md:pb-12 px-safe">
        {children}
      </main>

      {/* Bottom Nav - Mobile Only - Glassmorphic */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full glass border-t border-white/20 flex flex-row items-center justify-around h-[88px] px-2 z-[9999] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] safe-bottom pb-safe backdrop-blur-xl bg-white/80">
        <Link to="/" className={`flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform ${location.pathname === '/' ? activeTabClass : inactiveTabClass}`}>
          <Home size={24} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">Home</span>
        </Link>
        <Link to="/listings" className={`flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform ${location.pathname === '/listings' ? activeTabClass : inactiveTabClass}`}>
          <Search size={24} strokeWidth={location.pathname === '/listings' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">Search</span>
        </Link>

        <Link to="/post" className="relative -top-8 group">
          <div className="w-16 h-16 bg-gradient-to-br from-ocean-500 to-ocean-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-ocean-500/40 border-[6px] border-white group-active:scale-95 transition-all duration-300">
            <PlusCircle size={30} strokeWidth={2.5} />
          </div>
          <span className="absolute -bottom-5 w-full text-center text-[10px] font-black text-ocean-600 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">Sell</span>
        </Link>

        <Link to="/chats" className={`relative flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform ${location.pathname.startsWith('/chats') ? activeTabClass : inactiveTabClass}`}>
          <div className="relative">
            <MessageCircle size={24} strokeWidth={location.pathname.startsWith('/chats') ? 2.5 : 2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] flex items-center justify-center bg-coral-500 text-white text-[9px] font-black rounded-full border-2 border-white shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold">Chats</span>
        </Link>
        <Link to={user ? "/profile" : "/auth"} className={`flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform ${location.pathname === '/profile' || location.pathname === '/auth' ? activeTabClass : inactiveTabClass}`}>
          <UserIcon size={24} strokeWidth={location.pathname === '/profile' || location.pathname === '/auth' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-bold">{user ? 'Profile' : 'Sign In'}</span>
        </Link>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden md:block py-12 bg-slate-50 border-t border-slate-200 text-slate-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Logo size={32} className="text-ocean-700" />
              <span className="font-heading font-black text-xl">AndamanBazaar</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-semibold">
              Hyperlocal marketplace exclusively for the Andaman & Nicobar Islands. Built by islanders, for islanders.
            </p>
          </div>
          <div>
            <h4 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest">Quick Links</h4>
            <ul className="space-y-2 text-sm font-semibold text-slate-600">
              <li><Link to="/listings" className="hover:text-ocean-700 hover:underline">Browse Items</Link></li>
              <li><Link to="/post" className="hover:text-ocean-700 hover:underline">Start Selling</Link></li>
              <li><Link to="/todos" className="hover:text-ocean-700 hover:underline">Dev Tasks</Link></li>
              <li><Link to="/auth" className="hover:text-ocean-700 hover:underline">Account Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-2 text-sm font-semibold text-slate-600">
              <li><Link to="/terms" className="hover:text-ocean-700 hover:underline">Trust & Safety</Link></li>
              <li><Link to="/terms" className="hover:text-ocean-700 hover:underline">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-ocean-700 hover:underline">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest">Island Locations</h4>
            <ul className="space-y-2 text-sm font-semibold text-slate-600">
              <li>Port Blair</li>
              <li>Havelock (Swaraj Dweep)</li>
              <li>Neil (Shaheed Dweep)</li>
              <li>Diglipur</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};
