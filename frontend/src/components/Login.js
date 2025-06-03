import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import axios from 'axios';
import { storeAuthData } from '../utils/auth';

const { Title, Text } = Typography;

const Login = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState('');
    const navigate = useNavigate();

    // Animation effect when component mounts
    useEffect(() => {
        const loginCard = document.getElementById('login-card');
        if (loginCard) {
            loginCard.classList.add('animate-fadeIn');
        }
    }, []);

    const handleLogin = async (values) => {
        const { email, password } = values;
        setError('');
        setLoading(true);

        try {
            // Generate a unique session ID for this login
            const sessionId = `session_${new Date().getTime()}_${Math.random().toString(36).substring(2, 10)}`;
            
            // Send login request
            const response = await axios.post(
                'http://localhost:5000/auth/login',
                { email, password },
                { headers: { 'Content-Type': 'application/json' } }
            );

            console.log("Login response:", response.data);
            setRole(response.data.role);

            // Store auth data for this role with unique session ID
            storeAuthData({
                token: response.data.token,
                user_id: response.data.user_id,
                role: response.data.role,
                sessionId: sessionId
            });
            
            // If student role, also store registration number if it exists in the response
            if (response.data.role === 'student' && response.data.registration_number) {
                console.log("Storing student registration number:", response.data.registration_number);
                localStorage.setItem('student_registration_number', response.data.registration_number);
            }
            
            // Redirect based on role
            setLoading(false);
            
            switch (response.data.role) {
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
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response?.data?.error || 'Invalid email or password. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            {/* Left side - login form */}
            <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12">
                <Card 
                    id="login-card"
                    className="w-full max-w-md shadow-2xl border-0 rounded-xl"
                    style={{ background: 'white' }}
                >
                    <div className="text-center mb-8">
                        <Title level={2} className="text-blue-700 mb-2">
                            Welcome Back
                        </Title>
                        <Text className="text-gray-500">
                            Sign in to access your account
                        </Text>
                    </div>
                    
                    {error && (
                        <Alert
                            message="Login Failed"
                            description={error}
                            type="error"
                            showIcon
                            className="mb-6"
                        />
                    )}
                    
                    <Form
                        form={form}
                        name="login"
                        layout="vertical"
                        onFinish={handleLogin}
                        initialValues={{ remember: true }}
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter your email' },
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input 
                                prefix={<UserOutlined className="text-gray-400" />} 
                                placeholder="Email"
                                className="rounded-lg"
                            />
                        </Form.Item>
                        
                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Please enter your password' }]}
                        >
                            <Input.Password 
                                prefix={<LockOutlined className="text-gray-400" />} 
                                placeholder="Password"
                                className="rounded-lg"
                            />
                        </Form.Item>
                        
                        <Form.Item className="mb-2">
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={loading}
                                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 h-12 flex items-center justify-center"
                                icon={loading ? null : <LoginOutlined />}
                            >
                                {loading ? <Spin size="small" /> : 'Sign In'}
                            </Button>
                        </Form.Item>
                    </Form>
                    
                    <div className="text-center mt-6">
                        <Text className="text-gray-500">
                            Contact your administrator if you need assistance
                        </Text>
                    </div>
                </Card>
            </div>
            
            {/* Right side - decoration for larger screens */}
            <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 relative">
                <div className="absolute inset-0 bg-pattern opacity-10"></div>
                <div className="relative h-full flex flex-col justify-center">
                    <div className="text-white max-w-lg">
                        <h1 className="text-4xl font-bold mb-6">Internship Portal</h1>
                        <p className="text-xl mb-8 text-blue-100">
                            Track, manage, and optimize your entire internship journey in one unified platform
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-4">
                                    <span className="text-white text-xl">1</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Streamlined Reporting</h3>
                                    <p className="text-blue-100">Submit and track internship reports efficiently</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-4">
                                    <span className="text-white text-xl">2</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Mentor Collaboration</h3>
                                    <p className="text-blue-100">Direct communication with assigned mentors</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-4">
                                    <span className="text-white text-xl">3</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Performance Analytics</h3>
                                    <p className="text-blue-100">Track your progress with detailed insights</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login; 