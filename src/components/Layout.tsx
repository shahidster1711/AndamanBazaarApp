
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Logo } from './Logo';
import { OfflineBanner } from './OfflineBanner';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../hooks/useNotifications';
import {
  Home, Search, PlusCircle, MessageCircle, User as UserIcon,
  BadgeCheck, Bell
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  useNotifications();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user) return;

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

    const channel = supabase
      .channel('layout_unread_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-warm-50 font-sans text-midnight-700">
      {/* <OfflineBanner /> */}

      {/* ── HEADER ── */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
        ? 'bg-white/90 backdrop-blur-xl border-b border-warm-200 py-3 shadow-card'
        : 'bg-transparent py-4'
        }`}>
        <div className="app-container flex items-center justify-between">

          {/* Desktop Left Nav */}
          <div className="hidden md:flex flex-1 items-center gap-6">
            <NavLink to="/listings" active={isActive('/listings')}>Explore</NavLink>
            <NavLink to="/listings?verified=true" active={false}>
              <BadgeCheck size={14} className="inline mr-1 text-teal-500" />Verified
            </NavLink>
          </div>

          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-teal-gradient p-2 rounded-xl shadow-teal-glow group-hover:scale-105 transition-transform duration-300">
              <Logo size={26} className="text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-heading font-black tracking-tight text-midnight-700 leading-none">
                Andaman<span className="text-teal-600">Bazaar</span>
              </span>
              <span className="text-[9px] font-bold text-warm-400 uppercase tracking-[0.2em] mt-0.5">
                Island Marketplace
              </span>
            </div>
          </Link>

          {/* Desktop Right */}
          <div className="hidden md:flex flex-1 justify-end items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/chats"
                  className="relative p-2 text-warm-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                  aria-label="Messages"
                >
                  <MessageCircle size={22} />
                  {unreadCount > 0 && (
                    <span className="notif-dot">
                      {unreadCount > 9 ? '' : ''}
                    </span>
                  )}
                </Link>
                <Link
                  to="/profile"
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-warm-200 hover:border-teal-400 hover:shadow-teal-glow transition-all"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                    alt="Profile"
                    className="w-full h-full"
                  />
                </Link>
                <Link to="/post" className="btn-primary text-sm py-2.5 px-5">
                  + Sell Now
                </Link>
              </>
            ) : (
              <Link to="/auth" className="btn-primary text-sm py-2.5 px-5">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-grow pt-20 md:pt-24 page-enter">
        {children}
      </main>

      {/* ── BOTTOM NAV (Mobile Only) — Stitch-Inspired ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-[9999] safe-bottom">
        <div className="bottom-nav relative pb-1">

          {/* Home */}
          <TabItem to="/" label="Home" active={isActive('/')}>
            <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
          </TabItem>

          {/* Search */}
          <TabItem to="/listings" label="Search" active={isActive('/listings')}>
            <Search size={22} strokeWidth={isActive('/listings') ? 2.5 : 2} />
          </TabItem>

          {/* SELL — center coral FAB */}
          <Link
            to="/post"
            className="relative -top-7 flex-shrink-0 mx-3 group"
            aria-label="Post a listing"
          >
            <div className="nav-fab">
              <PlusCircle size={26} className="text-white" strokeWidth={2} />
            </div>
          </Link>

          {/* Chats */}
          <TabItem to="/chats" label="Chats" active={isActive('/chats')}>
            <div className="relative">
              <MessageCircle size={22} strokeWidth={isActive('/chats') ? 2.5 : 2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-coral-500 text-white text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </TabItem>

          {/* Profile */}
          <TabItem
            to={user ? '/profile' : '/auth'}
            label={user ? 'Profile' : 'Sign In'}
            active={isActive('/profile') || isActive('/auth')}
          >
            <UserIcon size={22} strokeWidth={isActive('/profile') || isActive('/auth') ? 2.5 : 2} />
          </TabItem>

        </div>
      </nav>

      {/* ── DESKTOP FOOTER ── */}
      <footer className="hidden md:block bg-midnight-700 text-warm-50 py-12 mt-8">
        <div className="app-container grid grid-cols-4 gap-12">
          <div className="space-y-4 col-span-1">
            <div className="flex items-center gap-2">
              <div className="bg-teal-gradient p-1.5 rounded-lg">
                <Logo size={22} className="text-white fill-white" />
              </div>
              <span className="font-heading font-black text-lg text-white">AndamanBazaar</span>
            </div>
            <p className="text-sm text-warm-400 leading-relaxed">
              Hyperlocal marketplace exclusively for the Andaman & Nicobar Islands.
              Built by islanders, for islanders. 🏝️
            </p>
          </div>

          <div>
            <h4 className="font-black text-sandy-400 mb-4 text-[11px] uppercase tracking-widest">Marketplace</h4>
            <ul className="space-y-2 text-sm text-warm-400">
              <li><Link to="/listings" className="hover:text-white transition-colors">Browse All Listings</Link></li>
              <li><Link to="/post" className="hover:text-white transition-colors">Sell an Item</Link></li>
              <li><Link to="/listings?category=fresh-catch" className="hover:text-white transition-colors">🐟 Fresh Catch</Link></li>
              <li><Link to="/listings?category=experiences" className="hover:text-white transition-colors">🤿 Experiences</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-sandy-400 mb-4 text-[11px] uppercase tracking-widest">Island Locations</h4>
            <ul className="space-y-2 text-sm text-warm-400">
              <li>Port Blair</li>
              <li>Havelock (Swaraj Dweep)</li>
              <li>Neil (Shaheed Dweep)</li>
              <li>Diglipur</li>
              <li>Little Andaman</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-sandy-400 mb-4 text-[11px] uppercase tracking-widest">Legal</h4>
            <ul className="space-y-2 text-sm text-warm-400">
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
            <p className="text-xs text-warm-400/50 mt-6">© 2026 AndamanBazaar. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

// ── Helper sub-components ──
const NavLink: React.FC<{ to: string; active: boolean; children: React.ReactNode }> = ({ to, active, children }) => (
  <Link
    to={to}
    className={`text-sm font-bold transition-all ${active
      ? 'text-teal-600 underline underline-offset-4 decoration-2 decoration-teal-400'
      : 'text-warm-400 hover:text-midnight-700'
      }`}
  >
    {children}
  </Link>
);

const TabItem: React.FC<{ to: string; label: string; active: boolean; children: React.ReactNode }> = ({
  to, label, active, children
}) => (
  <Link
    to={to}
    className={`nav-item ${active ? 'active' : ''} active:scale-90 transition-transform`}
    aria-label={label}
  >
    {children}
    <span className="nav-item-label">{label}</span>
  </Link>
);
