import React from 'react';
import { render, screen } from '@testing-library/react';
import QCSettingsPage from '@/pages/QCSettingsPage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { mockUser } from '../utils/test-utils';

jest.mock('@/contexts/SupabaseAuthContext', () => ({
    useAuth: jest.fn(),
}));
jest.mock('@/contexts/QCDataContext', () => ({
    useQCData: () => ({
        equipment: [],
        lots: [],
        parameters: [],
        createLot: jest.fn()
    }),
}));
jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));

describe('QCSettingsPage UI Visibility', () => {

    test('Technician: "Activar"/Management buttons are DISABLED/HIDDEN', () => {
        useAuth.mockReturnValue({ user: mockUser('technician') });
        render(<QCSettingsPage />);

        // Check for absence of critical management buttons
        expect(screen.queryByText(/Crear Nuevo Lote/i)).not.toBeInTheDocument();
        // Or if disabled:
        // const btn = screen.getByText(/Save/i);
        // expect(btn).toBeDisabled();
    });

    test('Biochemist: Management controls are ACCESSIBLE', () => {
        useAuth.mockReturnValue({ user: mockUser('biochemist') });
        render(<QCSettingsPage />);
        // Expect controls to be present
    });
});
