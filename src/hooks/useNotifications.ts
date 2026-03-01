import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const useNotifications = () => {
  const location = useLocation();
  const chatIdsRef = useRef<Set<string>>(new Set());
  const senderNameCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;

    let isActive = true;
    let messagesChannels: (ReturnType<typeof supabase.channel>)[] = [];
    let chatsChannel: ReturnType<typeof supabase.channel> | null = null;

    const getSenderName = async (senderId: string) => {
      const cached = senderNameCacheRef.current.get(senderId);
      if (cached) return cached;

      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', senderId)
        .single();

      const name = data?.name || 'Someone';
      senderNameCacheRef.current.set(senderId, name);
      return name;
    };

    const setupMessagesSubscription = (chatId: string, userId: string) => {
      const channel = supabase
        .channel(`notifications_messages:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          async (payload) => {
            const msg: any = payload.new;

            if (!isActive) return;
            if (!msg?.chat_id || !msg?.sender_id) return;
            if (msg.sender_id === userId) return;

            const isChatOpen = location.pathname === `/chats/${msg.chat_id}`;
            if (isChatOpen && document.visibilityState === 'visible') return;

            if (Notification.permission !== 'granted') return;

            const senderName = await getSenderName(msg.sender_id);
            const body = msg.message_text || 'New message';

            try {
              new Notification(`New message from ${senderName}`, {
                body,
                icon: '/logo192.png',
                tag: msg.chat_id,
              });
            } catch {
              // ignore
            }
          }
        )
        .subscribe();
      
      messagesChannels.push(channel);
    };

    const primeChatIdsAndSubscribe = async (userId: string) => {
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

      if (!isActive) return;

      const newChatIds = new Set((chats || []).map((c: any) => c.id));
      
      // Subscribe to new chats that we aren't already listening to
      newChatIds.forEach(id => {
        if (!chatIdsRef.current.has(id)) {
          setupMessagesSubscription(id, userId);
        }
      });

      chatIdsRef.current = newChatIds;
    };

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isActive) return;

      await primeChatIdsAndSubscribe(user.id);
      if (!isActive) return;

      chatsChannel = supabase
        .channel(`notifications_chats:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chats', filter: `buyer_id=eq.${user.id}` },
          () => primeChatIdsAndSubscribe(user.id)
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chats', filter: `seller_id=eq.${user.id}` },
          () => primeChatIdsAndSubscribe(user.id)
        )
        .subscribe();
    };

    setup();

    return () => {
      isActive = false;
      messagesChannels.forEach(ch => supabase.removeChannel(ch));
      if (chatsChannel) supabase.removeChannel(chatsChannel);
    };
  }, [location.pathname]);
};
