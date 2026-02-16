
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
        .select('buyer_id, seller_id, buyer_unread_count, seller_unread_count')
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
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md border-b-2 border-slate-100 py-3' : 'bg-white py-6 border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          {/* Left Actions - Hidden on mobile, spaced for center branding on desktop */}
          <div className="hidden md:flex flex-1 items-center space-x-6">
            <Link to="/listings" className={`text-sm font-black uppercase tracking-widest transition-all ${location.pathname === '/listings' ? 'text-ocean-700 underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'}`}>Explore</Link>
          </div>

          {/* Centered Brand Identity - Upsized */}
          <Link to="/" className="flex items-center space-x-4 group justify-center">
            <Logo size={56} className="text-ocean-700 group-hover:scale-105 transition-transform duration-300" />
            <div className="flex flex-col">
              <span className="text-3xl md:text-4xl font-heading font-black tracking-tighter text-slate-950 leading-none">
                Andaman<span className="text-coral-600">Bazaar</span>
              </span>
              <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1.5 ml-0.5">Local. Trusted.</span>
            </div>
          </Link>

          {/* Right Actions - Desktop Only */}
          <div className="hidden md:flex flex-1 justify-end items-center space-x-6">
            {user ? (
              <>
                <Link to="/chats" className="relative text-slate-500 hover:text-ocean-700 transition-colors">
                  <MessageCircle size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center border-2 border-slate-200 overflow-hidden hover:border-ocean-300 transition-colors">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="User" />
                </Link>
              </>
            ) : (
              <Link to="/auth" className="text-xs font-black uppercase tracking-widest text-ocean-700 hover:text-ocean-900 transition-colors">Sign In</Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-28 pb-28 md:pb-12">
        {children}
      </main>

      {/* Bottom Nav - Mobile Only - High Contrast & Explicit Labels */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t-2 border-slate-200 flex items-center justify-around h-20 px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <Link to="/" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/' ? activeTabClass : inactiveTabClass}`}>
          <Home size={24} strokeWidth={location.pathname === '/' ? 3 : 2} />
          <span className="text-[10px] mt-1 font-bold">Home</span>
        </Link>
        <Link to="/listings" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/listings' ? activeTabClass : inactiveTabClass}`}>
          <Search size={24} strokeWidth={location.pathname === '/listings' ? 3 : 2} />
          <span className="text-[10px] mt-1 font-bold">Search</span>
        </Link>
        
        <Link to="/post" className="relative -top-6">
          <div className="w-16 h-16 bg-ocean-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-ocean-700/30 border-4 border-white active:scale-95 transition-transform">
             <PlusCircle size={32} strokeWidth={3} />
          </div>
          <span className="absolute -bottom-5 w-full text-center text-[10px] font-black text-ocean-700 uppercase tracking-wide">Sell</span>
        </Link>

        <Link to="/chats" className={`relative flex flex-col items-center justify-center w-full h-full ${location.pathname.startsWith('/chats') ? activeTabClass : inactiveTabClass}`}>
          <div className="relative">
            <MessageCircle size={24} strokeWidth={location.pathname.startsWith('/chats') ? 3 : 2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center bg-red-600 text-white text-[8px] font-black rounded-full border border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold">Chats</span>
        </Link>
        <Link to="/dashboard" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/dashboard' || location.pathname === '/profile' ? activeTabClass : inactiveTabClass}`}>
          <UserIcon size={24} strokeWidth={location.pathname === '/dashboard' || location.pathname === '/profile' ? 3 : 2} />
          <span className="text-[10px] mt-1 font-bold">Profile</span>
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
