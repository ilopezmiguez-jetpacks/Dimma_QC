import React from 'react';
import { render, screen } from '@testing-library/react';
import UserManagementPage from '@/pages/UserManagementPage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { mockUser } from '../utils/test-utils';

// Mock dependencies
jest.mock('@/contexts/SupabaseAuthContext', () => ({
    useAuth: jest.fn(),
}));
jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));
// Mock Supabase client
jest.mock('@/lib/customSupabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null })
        })),
        functions: { invoke: jest.fn() }
    }
}));

describe('UserManagementPage UI Visibility', () => {

    test('Technician: "Agregar Usuario" button is HIDDEN', async () => {
        useAuth.mockReturnValue({
            user: mockUser('technician'),
            session: { access_token: 'fake-token' }
        });

        render(<UserManagementPage />);
        // Wait for loading to finish and check "Agregar Usuario" is NOT present.
        // We wait for something else to appear, e.g., the title or table headers, 
        // to ensure loading is done.
        await screen.findByText(/Gestión de Usuarios/i);
        expect(screen.queryByText(/Agregar Usuario/i)).not.toBeInTheDocument();
    });

    test('Admin: "Agregar Usuario" button is VISIBLE', async () => {
        useAuth.mockReturnValue({
            user: mockUser('admin'),
            session: { access_token: 'fake-token' }
        });

        render(<UserManagementPage />);
        expect(await screen.findByText(/Agregar Usuario/i)).toBeInTheDocument();
    });
});
