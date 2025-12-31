import React from 'react';
    import { Navigate } from 'react-router-dom';
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const ProtectedRoute = ({ children, adminOnly = false }) => {
        const { user, loading } = useAuth();

        if (loading) {
            return (
                <div className="h-screen w-full flex items-center justify-center bg-background">
                    <p className="text-foreground">Loading...</p>
                </div>
            );
        }

        if (!user) {
            return <Navigate to="/login" replace />;
        }
        
        const userRole = user.user_metadata?.role;
        const isSuperAdmin = userRole === 'superadmin' || userRole === 'admin';

        if (adminOnly && !isSuperAdmin) {
            return <Navigate to="/" replace />;
        }

        return children;
    };

    export default ProtectedRoute;