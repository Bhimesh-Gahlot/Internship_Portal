import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_role');
    const location = useLocation();

    useEffect(() => {
        console.log('PrivateRoute Mounted:', { 
            path: location.pathname, 
            userRole,
            hasToken: !!token
        });
    }, [location.pathname, userRole, token]);

    console.log('PrivateRoute Check:', { 
        token, 
        userRole, 
        currentPath: location.pathname,
        requiresAdmin: true
    });

    if (!token) {
        console.log('No token found, redirecting to login as admin');
        localStorage.setItem('last_role', 'admin');
        localStorage.setItem('force_login', 'true');
        return <Navigate to="/auth/login?role=admin" state={{ from: location }} replace />;
    }

    if (userRole !== 'admin') {
        console.log('User is not admin, redirecting to unauthorized');
        localStorage.setItem('last_role', 'admin');
        localStorage.setItem('force_login', 'true');
        return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }

    return children;
};

export default PrivateRoute; 