
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Chat, Message, Profile } from '../types';
import { Send, Camera, ChevronLeft, Phone, MoreVertical, ShieldCheck, Terminal, Loader2 } from 'lucide-react';

export const ChatRoom: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      try {
        let { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select(`
            *,
            listing:listings(*),
            seller:profiles!chats_seller_id_fkey(*),
            buyer:profiles!chats_buyer_id_fkey(*)
          `)
          .eq('id', id)
          .single();

        if (chatError || !chatData) {
          const { data: listing } = await supabase
            .from('listings')
            .select('*')
            .eq('id', id)
            .single();

          if (listing) {
            const { data: existingChat } = await supabase
              .from('chats')
              .select(`
                *,
                listing:listings(*),
                seller:profiles!chats_seller_id_fkey(*),
                buyer:profiles!chats_buyer_id_fkey(*)
              `)
              .eq('listing_id', listing.id)
              .eq('buyer_id', user.id)
              .single();

            if (existingChat) {
              chatData = existingChat;
            } else if (listing.user_id !== user.id) {
              const { data: newChat } = await supabase
                .from('chats')
                .insert({
                  listing_id: listing.id,
                  buyer_id: user.id,
                  seller_id: listing.user_id
                })
                .select(`
                  *,
                  listing:listings(*),
                  seller:profiles!chats_seller_id_fkey(*),
                  buyer:profiles!chats_buyer_id_fkey(*)
                `)
                .single();
              if (newChat) chatData = newChat;
            }
          }
        }

        if (chatData) {
          setChat(chatData);
          
          const { data: messageData } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatData.id)
            .order('created_at', { ascending: true });
          
          if (messageData) setMessages(messageData);

          const isBuyer = user.id === chatData.buyer_id;
          await supabase
            .from('chats')
            .update({ [isBuyer ? 'buyer_unread_count' : 'seller_unread_count']: 0 })
            .eq('id', chatData.id);
        }
      } catch (err) {
        console.error('Chat init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [id]);

  useEffect(() => {
    if (!chat) return;
    const channel = supabase
      .channel(`chat_messages:${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !chat || !currentUser) return;
    const messageText = inputText.trim();
    setInputText('');

    try {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          sender_id: currentUser.id,
          message_text: messageText,
        });

      if (msgError) throw msgError;
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-abyss space-y-6">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
      <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-emerald-500 animate-pulse">Syncing_Tunnel...</p>
    </div>
  );

  if (!chat) return (
    <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-abyss">
      <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded border border-red-500/30 flex items-center justify-center mb-8 shadow-glow">
        <Terminal size={32} />
      </div>
      <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter text-snow">Connection_Lost</h2>
      <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-10">Data packet unavailable or protocol mismatch.</p>
      <Link to="/chats" className="btn-premium px-10 font-mono text-[10px]">REVERT_TO_MESH</Link>
    </div>
  );

  const otherParty = currentUser?.id === chat.buyer_id ? chat.seller : chat.buyer;

  return (
    <div className="h-screen flex flex-col bg-abyss">
      <div className="px-6 py-4 border-b border-warm bg-carbon flex items-center justify-between shadow-elevation-low sticky top-0 z-20">
        <div className="flex items-center space-x-6">
          <button onClick={() => navigate('/chats')} className="p-2 -ml-2 text-slate-500 hover:text-emerald-500 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="w-12 h-12 rounded border border-warm bg-abyss overflow-hidden shadow-glow">
            <img src={otherParty?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParty?.id}`} alt="" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-mono font-bold text-sm text-snow uppercase tracking-widest">{otherParty?.name || 'NODE_UNKNOWN'}</h3>
              {otherParty?.is_location_verified && <ShieldCheck size={14} className="text-emerald-500" />}
            </div>
            <p className="text-[8px] font-mono text-emerald-500 uppercase tracking-[0.3em] animate-pulse">Status: Online</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           <button className="p-2 text-slate-600 hover:text-emerald-500 transition-colors"><Phone size={18} /></button>
           <button className="p-2 text-slate-600 hover:text-emerald-500 transition-colors"><MoreVertical size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
        <div className="text-center py-10">
           <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.5em] border border-warm/30 inline-block px-6 py-2 rounded">Session_Initiated</p>
        </div>
        
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[80%] px-6 py-4 rounded border transition-all ${
                isMe 
                ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-200 rounded-tr-none shadow-glow' 
                : 'bg-carbon border-warm text-snow rounded-tl-none'
              }`}>
                <p className="text-sm font-sans leading-relaxed tracking-wide">{msg.message_text}</p>
                <div className="flex items-center justify-end space-x-2 mt-3 opacity-40">
                   <p className="text-[8px] font-mono uppercase">
                    [{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 bg-carbon border-t border-warm safe-bottom">
        <div className="flex items-center space-x-4">
          <button className="p-4 bg-abyss border border-warm rounded text-slate-500 hover:text-emerald-500 hover:border-emerald-500 transition-all">
            <Camera size={20} />
          </button>
          <div className="flex-1 bg-abyss rounded border border-warm flex items-center px-6 py-4 focus-within:border-emerald-500 transition-all shadow-glow">
            <input 
              type="text" 
              placeholder="Inject payload..." 
              className="bg-transparent flex-1 outline-none text-sm font-mono text-snow placeholder:text-slate-700"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-5 bg-emerald-500 text-abyss rounded shadow-glow active:scale-90 transition-all disabled:opacity-20 disabled:scale-95 border border-emerald-400"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
