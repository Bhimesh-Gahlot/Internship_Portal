import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    
    return (
        <footer className="bg-[#0f172a] text-white mt-auto">
            <div className="container mx-auto px-6 py-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Logo and description */}
                    <div className="col-span-1 md:col-span-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-white rounded p-1.5 w-8 h-8 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="#1a56db">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                            </div>
                            <span className="text-lg font-medium">Internship Portal</span>
                        </div>
                        <p className="text-gray-400 mb-4 text-sm">
                            A comprehensive platform designed to streamline the internship experience for students, mentors, and administrators through efficient report management and collaboration.
                        </p>
                        <div className="flex space-x-3">
                            <a href="#" className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1e293b] hover:bg-[#334155]">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                            </a>
                            <a href="#" className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1e293b] hover:bg-[#334155]">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                                </svg>
                            </a>
                            <a href="#" className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1e293b] hover:bg-[#334155]">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                    
                    {/* Platform links */}
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="font-medium mb-4">Platform</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>
                                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                            </li>
                            <li>
                                <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">Features</a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">Documentation</a>
                            </li>
                        </ul>
                    </div>
                    
                    {/* Resources links */}
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="font-medium mb-4">Resources</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>
                                <a href="#" className="hover:text-white transition-colors">User Guides</a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">API Reference</a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">Support Center</a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white transition-colors">FAQ</a>
                            </li>
                        </ul>
                    </div>
                    
                    {/* Contact info */}
                    <div className="col-span-1 md:col-span-4">
                        <h3 className="font-medium mb-4">Contact Us</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-center space-x-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                <span>admin@internshipportal.com</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                <span>+1 (555) 123-4567</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                </svg>
                                <span>www.internshipportal.com</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            
            {/* Copyright section */}
            <div className="border-t border-gray-800 py-6">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-sm text-gray-500">
                        © {currentYear} Internship Portal. All rights reserved.
                    </p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-400">
                            Terms of Service
                        </a>
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-400">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-400">
                            Cookie Policy
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer; 