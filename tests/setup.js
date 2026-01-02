import '@testing-library/jest-dom';
import 'whatwg-fetch'; // Polyfill fetch for node environment

// Mock Supabase environment variables if needed
process.env.VITE_SUPABASE_URL = 'https://mock.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'mock-key';

// Global mocks
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
