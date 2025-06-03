import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Carousel } from 'antd';
import { RocketOutlined, FileProtectOutlined, TeamOutlined, LineChartOutlined } from '@ant-design/icons';

const Home = () => {
    const navigate = useNavigate();
    
    // Check if user is already logged in and redirect to their dashboard
    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('user_role');
        
        // If authenticated, redirect to appropriate dashboard
        if (token && role) {
            console.log('Home: User already authenticated, redirecting to dashboard', { role });
            
            // Only redirect if coming from login
            const referrer = document.referrer;
            if (referrer && referrer.includes('/auth/login')) {
                if (role === 'admin') {
                    navigate('/admin/dashboard', { replace: true });
                } else if (role === 'student') {
                    navigate('/student/dashboard', { replace: true });
                } else if (role === 'mentor') {
                    navigate('/mentor/dashboard', { replace: true });
                }
            }
        }
    }, [navigate]);

    // Carousel settings
    const carouselSettings = {
        autoplay: true,
        effect: 'fade',
        dots: true
    };

    return (
        <div className="bg-white min-h-screen">
            {/* Hero Section with Animated Background */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-blue-900 opacity-20"></div>
                    <div className="absolute inset-0 bg-pattern"></div>
                </div>
                
                <div className="relative mx-auto max-w-7xl px-6 py-32 md:py-48 flex flex-col items-center">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-center mb-6">
                        Your Complete Internship Management Solution
                    </h1>
                    
                    <p className="mt-6 text-xl md:text-2xl text-center text-blue-100 max-w-3xl">
                        Streamline, track, and enhance your internship experience with our comprehensive portal
                    </p>
                    
                    <div className="mt-12">
                        <Link to="/auth/login">
                            <Button 
                                type="primary" 
                                size="large"
                                className="h-14 text-lg px-8 rounded-lg bg-white text-blue-700 border-white hover:bg-blue-50 hover:border-blue-50 hover:text-blue-800 font-semibold"
                            >
                                Get Started →
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Key Features Section */}
            <div className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                            Transform Your Internship Journey
                        </h2>
                        <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                            Our platform connects students, mentors, and administrators in one unified ecosystem
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white rounded-xl shadow-lg p-8 transform transition duration-300 hover:scale-105">
                            <div className="bg-blue-100 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                                <RocketOutlined className="text-blue-600 text-2xl" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Streamlined Onboarding
                            </h3>
                            <p className="text-gray-600">
                                Quick and easy setup for students, mentors, and administrators with role-based access control
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white rounded-xl shadow-lg p-8 transform transition duration-300 hover:scale-105">
                            <div className="bg-green-100 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                                <FileProtectOutlined className="text-green-600 text-2xl" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Report Management
                            </h3>
                            <p className="text-gray-600">
                                Submit, track, and review internship reports and presentations with feedback workflows
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white rounded-xl shadow-lg p-8 transform transition duration-300 hover:scale-105">
                            <div className="bg-purple-100 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                                <TeamOutlined className="text-purple-600 text-2xl" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Mentor Collaboration
                            </h3>
                            <p className="text-gray-600">
                                Direct communication channels with assigned mentors for guidance and evaluation
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="bg-white rounded-xl shadow-lg p-8 transform transition duration-300 hover:scale-105">
                            <div className="bg-orange-100 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                                <LineChartOutlined className="text-orange-600 text-2xl" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                Progress Analytics
                            </h3>
                            <p className="text-gray-600">
                                Track internship milestones, evaluations, and performance metrics in real-time
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <div className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                            How It Works
                        </h2>
                        <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                            Our platform simplifies the entire internship process
                        </p>
                    </div>
                    
                    <div className="max-w-4xl mx-auto">
                        <Carousel {...carouselSettings} className="rounded-xl overflow-hidden shadow-xl">
                            <div>
                                <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-10 md:p-16 text-white h-96 flex flex-col justify-center">
                                    <h3 className="text-2xl md:text-3xl font-bold mb-4">For Students</h3>
                                    <ul className="list-disc ml-5 text-lg space-y-2">
                                        <li>Track your internship progress in real-time</li>
                                        <li>Submit reports and receive feedback</li>
                                        <li>Communicate with your assigned mentor</li>
                                        <li>Access resources and guidelines</li>
                                    </ul>
                                </div>
                            </div>
                            <div>
                                <div className="bg-gradient-to-r from-green-700 to-green-900 p-10 md:p-16 text-white h-96 flex flex-col justify-center">
                                    <h3 className="text-2xl md:text-3xl font-bold mb-4">For Mentors</h3>
                                    <ul className="list-disc ml-5 text-lg space-y-2">
                                        <li>View and manage assigned students</li>
                                        <li>Review and evaluate submitted reports</li>
                                        <li>Provide feedback and guidance</li>
                                        <li>Track student progress throughout the internship</li>
                                    </ul>
                                </div>
                            </div>
                            <div>
                                <div className="bg-gradient-to-r from-purple-700 to-purple-900 p-10 md:p-16 text-white h-96 flex flex-col justify-center">
                                    <h3 className="text-2xl md:text-3xl font-bold mb-4">For Administrators</h3>
                                    <ul className="list-disc ml-5 text-lg space-y-2">
                                        <li>Manage all users and assign mentors</li>
                                        <li>Monitor overall internship programs</li>
                                        <li>Generate reports and analytics</li>
                                        <li>Configure system settings and workflows</li>
                                    </ul>
                                </div>
                            </div>
                        </Carousel>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Ready to Enhance Your Internship Experience?
                    </h2>
                    <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
                        Join our platform and streamline your internship journey from start to finish
                    </p>
                    <Link to="/auth/login">
                        <Button 
                            type="primary" 
                            size="large"
                            className="h-14 text-lg px-8 rounded-lg bg-white text-blue-700 border-white hover:bg-blue-50 hover:border-blue-50 hover:text-blue-800 font-semibold"
                        >
                            Login Now
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Home; 