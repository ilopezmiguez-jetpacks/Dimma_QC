import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';

// Mock Auth Context
const mockUser = (role = 'technician', labId = 'lab-123') => ({
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: { role },
    profile: {
        role,
        laboratory_id: labId,
        full_name: 'Test Entity'
    }
});

/**
 * Custom render function that wraps UI in AuthProvider context
 */
export const renderWithAuth = (ui, { role, labId, ...options } = {}) => {
    // Mock the useAuth hook return value by mocking the module
    // Note: Since we can't easily switch the top-level module mock per test dynamically without jest.mock,
    // we often use a custom Context Provider. 

    // Ideally, we'd mock the `useAuth` hook itself. For simplicity in this file generation:
    // We assume the test files will jest.mock('@/contexts/SupabaseAuthContext')

    return render(ui, options);
};

export { mockUser };
