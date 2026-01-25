import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/useRedux';
import { LoadingOverlay } from './ui';

const ProtectedRoute = ({ children, requiredRole }) => {
    const location = useLocation();
    const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

    if (isLoading) {
        return <LoadingOverlay message="Authenticating..." />;
    }

    if (!isAuthenticated) {
        // Redirect to login with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role check
    if (requiredRole && user?.role !== requiredRole) {
        // If user is authenticated but doesn't have the right role, 
        // redirect to a safe page (e.g., home or show an unauthorized message)
        // For now, redirecting to login to force re-auth or similar
        // Or if it's a mobile user trying to access admin, maybe just unauthorized?
        // Let's redirect to login for simplicity
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
