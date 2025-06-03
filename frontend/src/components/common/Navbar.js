import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Menu, Avatar } from 'antd';
import { isAuthenticated, logout, getUserRole, getAuthData, storeAuthData } from '../../utils/auth';
import { UserOutlined, DownOutlined, HomeOutlined } from '@ant-design/icons';

const Navbar = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [availableRoles, setAvailableRoles] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
        // Check login status and available roles
        const checkLoginStatus = () => {
            const loggedIn = isAuthenticated();
            const currentRole = getUserRole();
            
            // Get all roles user is logged in as in THIS TAB ONLY
            const roles = ['admin', 'mentor', 'student'].filter(role => {
                const authData = getAuthData(role);
                return authData !== null;
            });
            
            console.log('Navbar Login Check:', { 
                loggedIn, 
                currentRole, 
                availableRoles: roles, 
                path: location.pathname 
            });
            
            setIsLoggedIn(loggedIn);
            setUserRole(currentRole || '');
            setAvailableRoles(roles);
        };

        checkLoginStatus();
        
        // Listen for auth changes in this tab only
        window.addEventListener('auth-change', checkLoginStatus);
        
        // Check on location changes
        return () => {
            window.removeEventListener('auth-change', checkLoginStatus);
        };
    }, [location]);

    const handleLogout = () => {
        console.log(`Logging out of role: ${userRole}`);
        logout(userRole);
        navigate('/login', { replace: true });
    };
    
    const navigateToDashboard = (role) => {
        switch (role) {
            case 'admin':
                navigate('/admin/dashboard');
                break;
            case 'mentor':
                navigate('/mentor/dashboard');
                break;
            case 'student':
                navigate('/student/dashboard');
                break;
            default:
                navigate('/');
        }
    };
    
    const handleRoleSwitch = (newRole) => {
        const authData = getAuthData(newRole);
        if (authData) {
            storeAuthData({
                token: authData.token,
                user_id: authData.user_id,
                role: newRole,
                sessionId: authData.sessionId
            });
            navigateToDashboard(newRole);
        }
    };

    // Define user dropdown menu
    const userMenu = (
        <Menu>
            <Menu.Item key="dashboard" onClick={() => navigateToDashboard(userRole)}>
                Dashboard
            </Menu.Item>
            {availableRoles.length > 1 && (
                <Menu.SubMenu key="roles" title="Switch Role">
                    {availableRoles.map(role => (
                        <Menu.Item 
                            key={role} 
                            onClick={() => handleRoleSwitch(role)}
                        >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Menu.Item>
                    ))}
                </Menu.SubMenu>
            )}
            <Menu.Divider />
            <Menu.Item key="logout" danger onClick={handleLogout}>
                Logout
            </Menu.Item>
        </Menu>
    );

    return (
        <header className="bg-[#1a56db] h-16 flex items-center">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-3">
                    <div className="bg-white rounded p-1.5 w-8 h-8 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#1a56db">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                    </div>
                    <span className="text-white font-medium text-lg">Internship Portal</span>
                </Link>
                
                <div className="flex items-center space-x-8">
                    <Link to="/" className="text-white hover:text-blue-100 transition-colors">
                        Home
                    </Link>
                    
                    {isLoggedIn ? (
                        <Dropdown overlay={userMenu} trigger={['click']}>
                            <div className="flex items-center space-x-2 cursor-pointer">
                                <Avatar 
                                    icon={<UserOutlined />} 
                                    className="bg-blue-400"
                                    size="small"
                                />
                                <span className="text-white capitalize">
                                    {userRole}
                                </span>
                                <DownOutlined className="text-xs text-white opacity-75" />
                            </div>
                        </Dropdown>
                    ) : (
                        <Link to="/login" className="text-white hover:text-blue-100 transition-colors">
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar; 