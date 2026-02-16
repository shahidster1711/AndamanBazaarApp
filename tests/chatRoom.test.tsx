import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChatRoom } from '../views/ChatRoom';
import { supabase } from '../lib/supabase';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createMockChain } from './setup';
import { ToastProvider } from '../components/Toast';

describe('ChatRoom View', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
        });
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
            seller_id: 'seller-456'
        };
        const mockListing = { id: 'listing-1', title: 'Beach House', price: 5000, user_id: 'seller-456' };
        const mockSeller = { id: 'seller-456', name: 'John Doe' };
        const mockBuyer = { id: 'user-123', name: 'Me' };
        const mockMessages = [
            { id: 'msg-1', chat_id: 'chat-1', sender_id: 'seller-456', message_text: 'Hello!', created_at: new Date().toISOString() }
        ];

        const fromSpy = vi.spyOn(supabase, 'from');

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'chats') return createMockChain(mockChat);
            if (table === 'listings') return createMockChain(mockListing);
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn((_col, val) => {
                        if (val === 'seller-456') return createMockChain(mockSeller);
                        if (val === 'user-123') return createMockChain(mockBuyer);
                        return createMockChain(null);
                    }),
                    single: vi.fn().mockReturnThis(),
                    then: (cb: any) => cb({ data: mockSeller, error: null }) // simplified for single
                };
            }
            if (table === 'messages') return createMockChain(mockMessages);
            return createMockChain([]);
        });

        // Override the specific profiles mock for single() calls
        (supabase.from('profiles').select('*').eq('id', 'seller-456').single as any).mockResolvedValue({ data: mockSeller, error: null });
        (supabase.from('profiles').select('*').eq('id', 'user-123').single as any).mockResolvedValue({ data: mockBuyer, error: null });
        (supabase.from('listings').select('*').eq('id', 'listing-1').single as any).mockResolvedValue({ data: mockListing, error: null });
        (supabase.from('chats').select('*').eq('id', 'chat-1').single as any).mockResolvedValue({ data: mockChat, error: null });

        renderChatRoom('chat-1');

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Hello!')).toBeInTheDocument();
        });

        expect(fromSpy).toHaveBeenCalledWith('chats');
        expect(fromSpy).toHaveBeenCalledWith('listings');
        expect(fromSpy).toHaveBeenCalledWith('profiles');
    });

    it('sends a message successfully', async () => {
        const mockChat = { id: 'chat-1', listing_id: 'listing-1', buyer_id: 'user-123', seller_id: 'seller-456' };

        const insertSpy = vi.fn().mockReturnThis();
        const updateSpy = vi.fn().mockReturnThis();

        (supabase.from as any).mockImplementation((table: string) => {
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
        });

        // Resolve necessary fetches
        (supabase.from('chats').select('*').eq('id', 'chat-1').single as any).mockResolvedValue({ data: mockChat, error: null });
        (supabase.from('listings').select('*').eq('id', 'listing-1').single as any).mockResolvedValue({ data: null, error: null });
        (supabase.from('profiles').select('*').eq('id', 'seller-456').single as any).mockResolvedValue({ data: null, error: null });
        (supabase.from('profiles').select('*').eq('id', 'user-123').single as any).mockResolvedValue({ data: null, error: null });

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

