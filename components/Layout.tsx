
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
  const activeTabClass = "text-emerald-500 scale-110 logo-glow";
  const inactiveTabClass = "text-slate-500 hover:text-emerald-400 transition-all";

  return (
    <div className="min-h-screen flex flex-col bg-abyss font-sans text-snow selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Header - Terminal Style Glassmorphism */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'glass py-3 shadow-elevation-high' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Left Actions - Commands */}
          <div className="hidden md:flex flex-1 items-center space-x-8">
            <Link to="/listings" className={`text-[11px] font-mono uppercase tracking-[0.2em] transition-all ${location.pathname === '/listings' ? 'text-emerald-500' : 'text-slate-500 hover:text-emerald-500'}`}>
              [ explore_market ]
            </Link>
            <Link to="/post" className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-500 transition-all">
              [ list_inventory ]
            </Link>
          </div>

          {/* Centered Brand Identity - VoltAgent Style */}
          <Link to="/" className="flex items-center space-x-3 group transition-transform duration-300 active:scale-95">
            <div className="relative">
              <Logo size={40} className="text-emerald-500 logo-glow transition-transform duration-500 group-hover:rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-heading font-black tracking-tighter text-snow leading-none">
                Andaman<span className="text-emerald-500">Bazaar</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-500/60 uppercase tracking-[0.4em] leading-none mt-1 ml-0.5 animate-pulse">SYSTEM_ONLINE</span>
            </div>
          </Link>

          {/* Right Actions - User Shell */}
          <div className="hidden md:flex flex-1 justify-end items-center space-x-6">
            {user ? (
              <>
                <Link to="/chats" className="relative p-2 text-slate-500 hover:text-emerald-500 transition-colors">
                  <MessageCircle size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-abyss text-[9px] font-black rounded-full flex items-center justify-center border border-abyss shadow-glow">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/dashboard" className="flex items-center space-x-3 group">
                   <div className="w-10 h-10 rounded-lg bg-carbon border border-warm overflow-hidden shadow-elevation-low group-hover:border-emerald-500 transition-all duration-300">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="User" />
                   </div>
                </Link>
              </>
            ) : (
              <Link to="/auth" className="btn-premium px-6 py-2 text-[10px]">
                login --init
              </Link>
            )}
          </div>

          {/* Mobile Header Icons */}
          <div className="flex md:hidden items-center space-x-4">
             {user && (
               <Link to="/chats" className="relative p-2 text-slate-300">
                 <MessageCircle size={22} />
                 {unreadCount > 0 && (
                   <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-abyss text-[9px] font-black rounded-full flex items-center justify-center border border-abyss">
                     {unreadCount}
                   </span>
                 )}
               </Link>
             )}
          </div>
        </div>
      </header>

      {/* Main Content Terminal */}
      <main className="flex-grow pt-24 pb-32 md:pb-20">
        {children}
      </main>

      {/* Bottom Nav Shell - Mobile Only */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-carbon/90 backdrop-blur-xl border border-warm flex items-center justify-around h-18 px-4 z-50 rounded-xl shadow-elevation-high pb-safe">
        <Link to="/" className={`flex flex-col items-center justify-center w-full h-full transition-all ${location.pathname === '/' ? activeTabClass : inactiveTabClass}`}>
          <Home size={22} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
        </Link>
        <Link to="/listings" className={`flex flex-col items-center justify-center w-full h-full transition-all ${location.pathname === '/listings' ? activeTabClass : inactiveTabClass}`}>
          <Search size={22} strokeWidth={location.pathname === '/listings' ? 2.5 : 2} />
        </Link>
        
        <Link to="/post" className="relative -top-2">
          <div className="w-14 h-14 bg-emerald-500 text-abyss rounded-lg flex items-center justify-center shadow-glow border border-emerald-400 active:scale-90 transition-transform">
             <PlusCircle size={28} strokeWidth={2.5} />
          </div>
        </Link>

        <Link to="/dashboard" className={`flex flex-col items-center justify-center w-full h-full transition-all ${location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') ? activeTabClass : inactiveTabClass}`}>
          <UserIcon size={22} strokeWidth={location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile') ? 2.5 : 2} />
        </Link>
      </nav>
      
      {/* Desktop Footer - System Info */}
      <footer className="hidden md:block py-20 bg-abyss border-t border-warm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Logo size={32} className="text-emerald-500" />
                <span className="font-heading font-black text-2xl tracking-tighter text-snow uppercase">AndamanBazaar</span>
              </div>
              <p className="text-sm text-parchment leading-relaxed font-medium">
                The high-performance marketplace terminal for the Andaman archipelago. Engineering trust through local connectivity.
              </p>
            </div>
            <div>
              <h4 className="font-mono text-emerald-500 mb-6 text-[10px] uppercase tracking-[0.3em]">&gt; directory</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li><Link to="/listings" className="hover:text-emerald-400 transition-colors flex items-center space-x-2"><span>ls /all_items</span></Link></li>
                <li><Link to="/post" className="hover:text-emerald-400 transition-colors flex items-center space-x-2"><span>touch /new_listing</span></Link></li>
                <li><Link to="/dashboard" className="hover:text-emerald-400 transition-colors flex items-center space-x-2"><span>cat /user_profile</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-emerald-500 mb-6 text-[10px] uppercase tracking-[0.3em]">&gt; protocols</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li><Link to="/terms" className="hover:text-emerald-400 transition-colors">trust_safety.md</Link></li>
                <li><Link to="/terms" className="hover:text-emerald-400 transition-colors">terms_of_use.md</Link></li>
                <li><Link to="/privacy" className="hover:text-emerald-400 transition-colors">privacy_policy.md</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-emerald-500 mb-6 text-[10px] uppercase tracking-[0.3em]">&gt; nodes</h4>
              <div className="flex flex-wrap gap-2">
                {['Port Blair', 'Havelock', 'Neil', 'Diglipur'].map(loc => (
                  <span key={loc} className="px-3 py-1.5 bg-carbon border border-warm rounded text-[9px] font-mono text-slate-500 uppercase tracking-wider">{loc}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-warm flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500">
             <span>v1.0.0 :: stable_release</span>
             <div className="flex items-center space-x-6">
                <a href="#" className="hover:text-emerald-400 transition-colors">twitter@local</a>
                <a href="#" className="hover:text-emerald-400 transition-colors">instagram@local</a>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
