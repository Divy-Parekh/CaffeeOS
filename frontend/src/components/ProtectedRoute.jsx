import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/useRedux';
import { LoadingOverlay } from './ui';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

    if (isLoading) {
        return <LoadingOverlay message="Authenticating..." />;
    }

    if (!isAuthenticated) {
        // Redirect to login with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
