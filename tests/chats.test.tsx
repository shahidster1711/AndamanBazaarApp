
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatList } from '../views/ChatList';
import { supabase } from '../lib/supabase';
import { MemoryRouter } from 'react-router-dom';
import { createMockChain } from './setup';

describe('ChatList View', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock user
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
        });
    });

    const renderChatList = () => {
        render(
            <MemoryRouter>
                <ChatList />
            </MemoryRouter>
        );
    };

    it('renders "No messages yet" when inbox is empty', async () => {
        (supabase.from as any).mockImplementation(() => createMockChain([]));

        renderChatList();

        await waitFor(() => {
            expect(screen.getByText(/No active chats yet/i)).toBeInTheDocument();
        });
    });

    it('renders a list of active chats', async () => {
        const mockChats = [
            {
                id: 'chat-1',
                buyer_id: 'user-123',
                seller_id: 'seller-456',
                listing: { title: 'Beach House' },
                seller: { name: 'John Doe', profile_photo_url: null },
                buyer: { name: 'Buyer', profile_photo_url: null },
                last_message: 'Is it available?',
                last_message_at: new Date().toISOString(),
                buyer_unread_count: 1,
                seller_unread_count: 0,
                messages: [
                    { sender_id: 'seller-456', is_read: false }
                ]
            }
        ];

        (supabase.from as any).mockImplementation(() => createMockChain(mockChats));

        renderChatList();

        await waitFor(() => {
            expect(screen.getByText('Beach House')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Is it available?')).toBeInTheDocument();
        });
    });
});
