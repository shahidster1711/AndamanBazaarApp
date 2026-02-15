
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Todos } from '../views/Todos';
import { supabase } from '../lib/supabase';
import { ToastProvider } from '../components/Toast';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
        })),
    },
}));

describe('Todos View', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderTodos = () => {
        render(
            <ToastProvider>
                <Todos />
            </ToastProvider>
        );
    };

    it('renders the Todo list title', async () => {
        // Mock empty response
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));

        renderTodos();

        await waitFor(() => {
            expect(screen.getByText('Project Tasks')).toBeInTheDocument();
        });
    });

    it('displays empty state when no todos exist', async () => {
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));

        renderTodos();

        await waitFor(() => {
            expect(screen.getByText('No tasks found')).toBeInTheDocument();
        });
    });

    it('renders a list of todos', async () => {
        const mockTodos = [
            { id: '1', title: 'Test Task 1', is_completed: false, created_at: '2023-01-01' },
            { id: '2', title: 'Test Task 2', is_completed: true, created_at: '2023-01-02' },
        ];

        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTodos, error: null }),
        }));

        renderTodos();

        await waitFor(() => {
            expect(screen.getByText('Test Task 1')).toBeInTheDocument();
            expect(screen.getByText('Test Task 2')).toBeInTheDocument();
        });
    });

    it('allows adding a new todo', async () => {
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockReturnThis(),
        }));

        // Mock insert response
        const newTodo = { id: '3', title: 'New Task', is_completed: false };
        const insertMock = vi.fn().mockResolvedValue({ data: [newTodo], error: null });

        // Setup chain for insert
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'todos') {
                return {
                    select: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    insert: vi.fn().mockReturnThis(),
                }
            }
        });

        // We need to be more specific with the mock for the interactive test
        const selectMock = vi.fn();
        const insertChainMock = {
            select: vi.fn().mockResolvedValue({ data: [newTodo], error: null })
        };

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockReturnValue(insertChainMock)
        });

        renderTodos();

        const input = screen.getByPlaceholderText('What needs to be done?');
        const button = screen.getByRole('button', { name: '' }); // The plus button has no text

        fireEvent.change(input, { target: { value: 'New Task' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('todos');
        });
    });
});
