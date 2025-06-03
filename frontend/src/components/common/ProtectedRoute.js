import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, getUserRole, isAuthenticated } from '../../utils/auth';

const ProtectedRoute = ({ children, role }) => {
    const location = useLocation();
    const currentRole = getUserRole();
    const token = getToken(currentRole);

    useEffect(() => {
        console.log('Protected Route Check:', { 
            path: location.pathname,
            requiredRole: role,
            currentRole,
            hasToken: !!token
        });
    }, [location.pathname, role, currentRole, token]);

    // If not authenticated, redirect to login
    if (!isAuthenticated()) {
        console.log('Not authenticated, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If role is required and doesn't match, redirect to login
    if (role && currentRole !== role) {
        console.log('Role mismatch, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute; 