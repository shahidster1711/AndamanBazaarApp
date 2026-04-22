
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
  const activeTabClass = "text-ocean-600 font-black scale-110";
  const inactiveTabClass = "text-slate-400 font-bold hover:text-ocean-500 transition-all";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-ocean-100 selection:text-ocean-900">
      {/* Header - Glassmorphism */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'glass py-3 shadow-premium' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Left Actions */}
          <div className="hidden md:flex flex-1 items-center space-x-8">
            <Link to="/listings" className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${location.pathname === '/listings' ? 'text-ocean-600' : 'text-slate-500 hover:text-ocean-600'}`}>
              Browse
            </Link>
            <Link to="/post" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-ocean-600 transition-all">
              Sell Item
            </Link>
          </div>

          {/* Centered Brand Identity */}
          <Link to="/" className="flex items-center space-x-3 group transition-transform duration-300 active:scale-95">
            <Logo size={42} className="text-ocean-600 group-hover:rotate-12 transition-transform duration-500" />
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-heading font-black tracking-tighter text-slate-950 leading-none">
                Andaman<span className="text-coral-500">Bazaar</span>
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none mt-1 ml-0.5">Premium Marketplace</span>
            </div>
          </Link>

          {/* Right Actions */}
          <div className="hidden md:flex flex-1 justify-end items-center space-x-6">
            {user ? (
              <>
                <Link to="/chats" className="relative p-2 text-slate-500 hover:text-ocean-600 transition-colors">
                  <MessageCircle size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-coral-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="flex items-center space-x-3 group">
                   <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:border-ocean-300">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="User" />
                   </div>
                </Link>
              </>
            ) : (
              <Link to="/auth" className="btn-premium px-6 py-2.5 text-xs">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Header Icons */}
          <div className="flex md:hidden items-center space-x-4">
             {user && (
               <Link to="/chats" className="relative p-2 text-slate-700">
                 <MessageCircle size={24} />
                 {unreadCount > 0 && (
                   <span className="absolute top-1 right-1 w-5 h-5 bg-coral-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                     {unreadCount}
                   </span>
                 )}
               </Link>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-32 md:pb-20">
        {children}
      </main>

      {/* Bottom Nav - Mobile Only */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-slate-950/90 backdrop-blur-xl border border-white/10 flex items-center justify-around h-18 px-4 z-50 rounded-[28px] shadow-2xl pb-safe">
        <Link to="/" className={`flex flex-col items-center justify-center w-full h-full transition-all ${location.pathname === '/' ? 'text-white scale-110' : 'text-slate-500'}`}>
          <Home size={22} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
        </Link>
        <Link to="/listings" className={`flex flex-col items-center justify-center w-full h-full transition-all ${location.pathname === '/listings' ? 'text-white scale-110' : 'text-slate-500'}`}>
          <Search size={22} strokeWidth={location.pathname === '/listings' ? 2.5 : 2} />
        </Link>
        
        <Link to="/post" className="relative -top-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-ocean-500 to-ocean-400 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-ocean-500/30 border border-white/20 active:scale-90 transition-transform">
             <PlusCircle size={28} strokeWidth={2.5} />
          </div>
        </Link>

        <Link to="/dashboard" className={`flex flex-col items-center justify-center w-full h-full transition-all ${location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') ? 'text-white scale-110' : 'text-slate-500'}`}>
          <UserIcon size={22} strokeWidth={location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') ? 2.5 : 2} />
        </Link>
      </nav>
      
      {/* Desktop Footer */}
      <footer className="hidden md:block py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Logo size={32} className="text-ocean-600" />
                <span className="font-heading font-black text-2xl tracking-tighter">AndamanBazaar</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                The premier hyperlocal marketplace for the Andaman & Nicobar archipelago. Secure, verified, and community-driven.
              </p>
            </div>
            <div>
              <h4 className="font-black text-slate-950 mb-6 text-[10px] uppercase tracking-[0.3em]">Marketplace</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-400">
                <li><Link to="/listings" className="hover:text-ocean-600 transition-colors">Explore All Items</Link></li>
                <li><Link to="/post" className="hover:text-ocean-600 transition-colors">List Your Item</Link></li>
                <li><Link to="/auth" className="hover:text-ocean-600 transition-colors">Seller Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-950 mb-6 text-[10px] uppercase tracking-[0.3em]">Guidelines</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-400">
                <li><Link to="/terms" className="hover:text-ocean-600 transition-colors">Safe Trading Guide</Link></li>
                <li><Link to="/terms" className="hover:text-ocean-600 transition-colors">Terms of Use</Link></li>
                <li><Link to="/privacy" className="hover:text-ocean-600 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-950 mb-6 text-[10px] uppercase tracking-[0.3em]">Coverage</h4>
              <div className="flex flex-wrap gap-2">
                {['Port Blair', 'Havelock', 'Neil', 'Diglipur'].map(loc => (
                  <span key={loc} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-wider">{loc}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span>© 2026 AndamanBazaar</span>
             <div className="flex items-center space-x-6">
                <a href="#" className="hover:text-ocean-600 transition-colors">Twitter</a>
                <a href="#" className="hover:text-ocean-600 transition-colors">Instagram</a>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
