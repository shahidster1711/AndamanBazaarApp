
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Chat } from '../types';

export const ChatList: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchChats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          listing:listings(title),
          seller:profiles!chats_seller_id_fkey(name, profile_photo_url),
          buyer:profiles!chats_buyer_id_fkey(name, profile_photo_url)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();

    const channel = supabase
      .channel('chat_list_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 bg-abyss space-y-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-snow">Communications</h1>
        <div className="bg-carbon border border-warm rounded-lg overflow-hidden">
          <div className="divide-y divide-warm/30">
            {[1, 2, 3, 4, 5].map(n => <ChatSkeletonRow key={n} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 bg-abyss space-y-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-warm pb-8">
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500">cat /active_threads</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-snow">Signal Mesh</h1>
        </div>
        <div className="bg-emerald-500/10 px-4 py-2 rounded border border-emerald-500/20 shadow-glow">
           <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">
            {chats.length} active_links detected
           </span>
        </div>
      </div>
      
      <div className="bg-carbon rounded-lg shadow-elevation-high border border-warm overflow-hidden">
        <div className="flex bg-abyss border-b border-warm">
          <button className="flex-1 py-5 font-mono font-bold text-emerald-500 border-b-2 border-emerald-500 uppercase text-[10px] tracking-[0.3em] bg-emerald-500/5">PRIMARY_BUFFER</button>
          <button className="flex-1 py-5 font-mono font-bold text-slate-700 uppercase text-[10px] tracking-[0.3em] cursor-not-allowed">SYSTEM_LOGS</button>
        </div>

        <div className="divide-y divide-warm/30">
          {chats.length === 0 ? (
            <div className="py-32 text-center space-y-8 bg-carbon">
              <span className="text-5xl block opacity-20">📡</span>
              <div className="space-y-4">
                <p className="text-2xl font-heading font-black text-snow uppercase tracking-tighter">No Active Links</p>
                <p className="text-slate-600 font-mono text-xs uppercase tracking-[0.2em]">Ready for initialization.</p>
              </div>
              <Link to="/listings" className="btn-premium inline-block px-10 py-4 font-mono text-[10px] tracking-widest shadow-glow">LS /MARKETPLACE</Link>
            </div>
          ) : (
            chats.map((chat) => {
              const isBuyer = currentUser?.id === chat.buyer_id;
              const otherParty = isBuyer ? chat.seller : chat.buyer;
              const unreadCount = isBuyer ? chat.buyer_unread_count : chat.seller_unread_count;

              return (
                <Link 
                  key={chat.id} 
                  to={`/chats/${chat.id}`} 
                  className={`relative flex items-center p-8 hover:bg-abyss/50 transition-all group ${unreadCount > 0 ? 'bg-emerald-500/[0.03]' : ''}`}
                >
                  {unreadCount > 0 && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-glow"></div>
                  )}

                  <div className="relative flex-shrink-0 ml-1">
                    <div className={`w-16 h-16 rounded border bg-abyss overflow-hidden shadow-elevation-low group-hover:border-emerald-500/50 transition-all ${unreadCount > 0 ? 'border-emerald-500/30' : 'border-warm'}`}>
                      {otherParty?.profile_photo_url ? (
                        <img src={otherParty.profile_photo_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-800 text-2xl font-mono">?</div>
                      )}
                    </div>
                    {unreadCount > 0 && (
                       <div className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1.5 bg-emerald-500 text-abyss border border-abyss rounded-full flex items-center justify-center text-[10px] font-mono font-black shadow-glow">
                        {unreadCount}
                       </div>
                    )}
                  </div>
                  
                  <div className="ml-8 flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-mono font-bold truncate text-base uppercase tracking-tight ${unreadCount > 0 ? 'text-snow' : 'text-slate-500'}`}>
                        {otherParty?.name || 'anonymous_node'}
                      </h3>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${unreadCount > 0 ? 'text-emerald-500 animate-pulse' : 'text-slate-600'}`}>
                        [{chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'null'}]
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-6">
                      <p className={`text-sm truncate font-sans leading-tight ${unreadCount > 0 ? 'text-snow' : 'text-slate-500'}`}>
                        {chat.last_message || 'no_data_payload_detected'}
                      </p>
                    </div>

                    <div className="mt-4">
                      <span className={`px-3 py-1 bg-abyss border text-[9px] font-mono font-bold rounded uppercase tracking-widest transition-colors ${unreadCount > 0 ? 'border-emerald-500/30 text-emerald-500' : 'border-warm text-slate-600'}`}>
                        UNIT::{chat.listing?.title || 'generic'}
                      </span>
                    </div>
                  </div>

                  <div className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 font-mono text-xl">
                    &gt;_
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
      <div className="mt-12 bg-carbon p-8 rounded border border-emerald-500/10 shadow-glow">
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.3em] text-center leading-loose">
          PROTOCOL_ADVISORY: SECURE_LOCAL_HANDSHAKE_RECOMMENDED. ZERO_SENSITIVE_DATA_DISCLOSURE.
        </p>
      </div>
    </div>
  );
};

const ChatSkeletonRow = () => (
  <div className="flex items-center p-8 space-x-8 animate-pulse">
    <div className="w-16 h-16 rounded bg-abyss border border-warm flex-shrink-0"></div>
    <div className="flex-1 space-y-4">
      <div className="h-4 w-1/4 bg-abyss rounded"></div>
      <div className="h-3 w-1/2 bg-abyss rounded"></div>
    </div>
  </div>
);
