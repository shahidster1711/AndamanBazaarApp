import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChatRoom } from '../src/pages/ChatRoom';
import { supabase } from '../src/lib/supabase';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createMockChain } from './setup';
import { ToastProvider } from '../src/components/Toast';

vi.mock('../src/lib/supabase');


describe('ChatRoom View', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
        } as any);
    });

    const renderChatRoom = (id: string = 'chat-1') => {
        render(
            <ToastProvider>
                <MemoryRouter initialEntries={[`/chats/${id}`]}>
                    <Routes>
                        <Route path="/chats/:id" element={<ChatRoom />} />
                    </Routes>
                </MemoryRouter>
            </ToastProvider>
        );
    };

    it('renders chat room and fetches data sequentially', async () => {
        const mockChat = {
            id: 'chat-1',
            listing_id: 'listing-1',
            buyer_id: 'user-123',
            seller_id: 'seller-456',
            buyer_unread_count: 0,
            seller_unread_count: 0,
            last_message_at: new Date().toISOString()
        };
        const mockListing = { id: 'listing-1', title: 'Beach House', price: 5000, user_id: 'seller-456' };
        const mockSeller = { id: 'seller-456', name: 'John Doe', profile_photo_url: null };
        const mockBuyer = { id: 'user-123', name: 'Me', profile_photo_url: null };

        const mockChatWithRelations = {
            ...mockChat,
            listing: mockListing,
            seller: mockSeller,
            buyer: mockBuyer
        };

        const mockMessages = [
            { id: 'msg-1', chat_id: 'chat-1', sender_id: 'seller-456', message_text: 'Hello!', created_at: new Date().toISOString() }
        ];

        const fromSpy = vi.spyOn(supabase, 'from');

        vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
            if (table === 'chats') return createMockChain(mockChatWithRelations);
            if (table === 'messages') return createMockChain(mockMessages);
            return createMockChain([]);
        }) as any);

        renderChatRoom('chat-1');

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Hello!')).toBeInTheDocument();
        });

        expect(fromSpy).toHaveBeenCalledWith('chats');
        // listings and profiles are now joined, so no separate fetches expected
    });

    it('sends a message successfully', async () => {
        const mockChat = { id: 'chat-1', listing_id: 'listing-1', buyer_id: 'user-123', seller_id: 'seller-456' };

        const insertSpy = vi.fn().mockReturnThis();
        const updateSpy = vi.fn().mockReturnThis();

        vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
            if (table === 'chats') {
                const chain = createMockChain(mockChat);
                chain.update = updateSpy;
                return chain;
            }
            if (table === 'messages') {
                const chain = createMockChain([]);
                chain.insert = insertSpy;
                return chain;
            }
            return createMockChain([]);
        }) as any);



        renderChatRoom('chat-1');

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText(/Type your message/i);
        const sendButton = screen.getByTestId('send-button');

        fireEvent.change(input, { target: { value: 'New Message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
                message_text: 'New Message',
                chat_id: 'chat-1'
            }));
        });
    });
});

