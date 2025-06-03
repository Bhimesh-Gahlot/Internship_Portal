import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Layout, Menu, Card, Typography, Badge, Space, Button, Form, Input, DatePicker, Select, Checkbox, Modal, Tabs, Timeline, Statistic, Alert, message } from 'antd';
import {
    UserOutlined,
    FileTextOutlined,
    LineChartOutlined,
    CalendarOutlined,
    FolderOutlined,
    MessageOutlined,
    BellOutlined,
    HomeOutlined,
    EditOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import ProgressTracker from './ProgressTracker';
import WeeklyReport from './WeeklyReport';
import MentorFeedback from './MentorFeedback';
import DocumentRepository from './DocumentRepository';
import Schedule from './Schedule';
import { getToken, getUserId, storeAuthData } from '../../utils/auth';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;

const extractRegistrationFromToken = (token) => {
    if (!token) return null;
    
    try {
        // JWT tokens are in the format: header.payload.signature
        // We only need the payload part
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        // Decode the payload
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if the payload has registration_number or any other identifier
        // Adapt this based on your actual token structure
        return payload.registration_number || payload.sub || null;
    } catch (error) {
        console.error("Error extracting registration number from token:", error);
        return null;
    }
};

const StudentDashboard = () => {
    const [selectedMenu, setSelectedMenu] = useState('overview');
    const [collapsed, setCollapsed] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showInternshipForm, setShowInternshipForm] = useState(false);
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [showParentForm, setShowParentForm] = useState(false);
    const [showAlumniForm, setShowAlumniForm] = useState(false);
    const [manualRegNumber, setManualRegNumber] = useState('');
    const [isDebugMode, setIsDebugMode] = useState(false);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [internshipData, setInternshipData] = useState({
        company_name: '',
        internship_type: 'in-house',
        start_date: '',
        end_date: '',
        stipend: '',
        location: '',
        hr_contact: '',
        hr_email: ''
    });
    const [profileData, setProfileData] = useState({
        name: '',
        registration_number: '',
        batch: '',
        section: '',
        program: '',
        blood_group: '',
        date_of_birth: '',
        hostel_name: '',
        hostel_block: '',
        hostel_room_no: '',
        has_muj_alumni: false,
        phone: '',
        address: ''
    });
    const [parentData, setParentData] = useState({
        father_name: '',
        father_is_entrepreneur: false,
        father_is_family_business: false,
        father_is_public_sector: false,
        father_is_professional: false,
        father_is_govt_employee: false,
        father_is_private_company: false,
        father_organization: '',
        father_designation: '',
        father_mobile_no: '',
        father_email: '',
        
        mother_name: '',
        mother_is_entrepreneur: false,
        mother_is_family_business: false,
        mother_is_public_sector: false,
        mother_is_professional: false,
        mother_is_govt_employee: false,
        mother_is_private_company: false,
        mother_is_home_maker: false,
        mother_organization: '',
        mother_designation: '',
        mother_mobile_no: '',
        mother_email: '',
        
        business_card_image: '',
        communication_address: '',
        permanent_address: '',
        pin_code: ''
    });
    const [alumniData, setAlumniData] = useState({
        alumni_name: '',
        alumni_registration_number: '',
        alumni_branch: '',
        alumni_program: '',
        alumni_batch: '',
        relation_with_student: ''
    });
    const [submittedInternship, setSubmittedInternship] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState(null);
    const [mentorData, setMentorData] = useState(null);
    const [parentInfo, setParentInfo] = useState(null);
    const [alumniInfo, setAlumniInfo] = useState(null);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            // Get current student registration number from localStorage first
            const localRegistrationNumber = localStorage.getItem('student_registration_number');
            
            // If we have a stored registration number, use that directly
            if (localRegistrationNumber) {
                console.log("Using locally stored registration number for profile fetch:", localRegistrationNumber);
                return fetchStudentByRegistration(localRegistrationNumber);
            }
            
            // Otherwise try to get from token
            const token = getToken('student');
            console.log("Using auth token:", token);
            
            // Try to extract registration number from token
            const registrationNumber = extractRegistrationFromToken(token);
            console.log("Extracted registration number:", registrationNumber);
            
            let response;
            
            // First try the authenticated endpoint if we have a token
            if (token) {
                try {
                    response = await fetch('http://localhost:5000/student/profile', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Profile request failed with status ${response.status}`);
                    }
                } catch (authError) {
                    console.error("Authentication error, falling back to direct access:", authError);
                    // Fall back to direct access endpoint with registration number if available
                    const directAccessUrl = registrationNumber ? 
                        `http://localhost:5000/student/direct-access?registration_number=${registrationNumber}` : 
                        'http://localhost:5000/student/direct-access';
                        
                    console.log("Using direct access URL:", directAccessUrl);
                    
                    response = await fetch(directAccessUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Direct access request failed with status ${response.status}`);
                    }
                }
            } else {
                // No token available, use direct access with registration number if available
                const directAccessUrl = registrationNumber ? 
                    `http://localhost:5000/student/direct-access?registration_number=${registrationNumber}` : 
                    'http://localhost:5000/student/direct-access';
                    
                console.log("No auth token available, using direct access endpoint:", directAccessUrl);
                
                response = await fetch(directAccessUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                
                if (!response.ok) {
                    throw new Error(`Direct access request failed with status ${response.status}`);
                }
            }
            
            const data = await response.json();
            
            // Store the full response data
            setStudentData(data);
            
            // Initialize profile data from student if available
            if (data.student) {
                // Save the registration number for future use
                if (data.student.registration_number) {
                    localStorage.setItem('student_registration_number', data.student.registration_number);
                }
                
                setProfileData({
                    name: data.student.name || '',
                    registration_number: data.student.registration_number || '',
                    batch: data.student.batch || '',
                    section: data.student.section || '',
                    program: data.student.program || '',
                    blood_group: data.student.blood_group || '',
                    date_of_birth: data.student.date_of_birth || '',
                    hostel_name: data.student.hostel_name || '',
                    hostel_block: data.student.hostel_block || '',
                    hostel_room_no: data.student.hostel_room_no || '',
                    has_muj_alumni: data.student.has_muj_alumni || false,
                    phone: data.student.phone || '',
                    address: data.student.address || ''
                });
            }
            
            // Set mentor data if available
            if (data.mentor) {
                setMentorData(data.mentor);
            }
            
            // Set parent info if available
            if (data.parent) {
                setParentInfo(data.parent);
                setParentData(data.parent);
            }
            
            // Set alumni info if available
            if (data.alumni_relation) {
                setAlumniInfo(data.alumni_relation);
                setAlumniData(data.alumni_relation);
            }
            
            // Set internship data if available
            if (data.internship) {
                setSubmittedInternship(data.internship);
            }
            
            console.log("Profile data loaded:", data);
        } catch (error) {
            console.error("Error in fetchProfileData:", error);
            message.error('Error loading profile data. Please try again later.');
            setError('Error loading profile data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableStudents = async () => {
        try {
            const response = await fetch('http://localhost:5000/student/list-students', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch student list: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.students && Array.isArray(data.students)) {
                setAvailableStudents(data.students);
                console.log("Available students:", data.students);
            }
        } catch (error) {
            console.error("Error fetching available students:", error);
        }
    };

    const fetchStudentByRegistration = async (registrationNumber) => {
        if (!registrationNumber) {
            message.error('Please enter a registration number');
            return;
        }
        
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/student/test-student/${registrationNumber}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch student data: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Direct student data fetch:", data);
            
            // Store registration number in localStorage for future use
            localStorage.setItem('student_registration_number', registrationNumber);
            
            // Load full profile using direct-access with this registration number
            const profileResponse = await fetch(`http://localhost:5000/student/direct-access?registration_number=${registrationNumber}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!profileResponse.ok) {
                throw new Error(`Direct access request failed with status ${profileResponse.status}`);
            }
            
            const profileData = await profileResponse.json();
            console.log("Full profile data:", profileData);
            
            // Update all the state variables with the profile data
            setStudentData(profileData);
            
            if (profileData.student) {
                setProfileData({
                    name: profileData.student.name || '',
                    registration_number: profileData.student.registration_number || '',
                    batch: profileData.student.batch || '',
                    section: profileData.student.section || '',
                    program: profileData.student.program || '',
                    blood_group: profileData.student.blood_group || '',
                    date_of_birth: profileData.student.date_of_birth || '',
                    hostel_name: profileData.student.hostel_name || '',
                    hostel_block: profileData.student.hostel_block || '',
                    hostel_room_no: profileData.student.hostel_room_no || '',
                    has_muj_alumni: profileData.student.has_muj_alumni || false,
                    phone: profileData.student.phone || '',
                    address: profileData.student.address || ''
                });
            }
            
            if (profileData.mentor) {
                setMentorData(profileData.mentor);
            }
            
            if (profileData.parent) {
                setParentInfo(profileData.parent);
                setParentData(profileData.parent);
            }
            
            if (profileData.alumni_relation) {
                setAlumniInfo(profileData.alumni_relation);
                setAlumniData(profileData.alumni_relation);
            }
            
            if (profileData.internship) {
                setSubmittedInternship(profileData.internship);
            }
            
            message.success(`Loaded data for ${profileData.student.name}`);
        } catch (error) {
            console.error("Error fetching student by registration number:", error);
            message.error(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // First try to get registration number from localStorage
        const storedRegNumber = localStorage.getItem('student_registration_number');
        if (storedRegNumber) {
            console.log("Found stored registration number:", storedRegNumber);
            setManualRegNumber(storedRegNumber);
            // Directly use the student-specific fetch with the stored registration number
            fetchStudentByRegistration(storedRegNumber);
        } else {
            // No stored student - fall back to normal profile fetch
            fetchProfileData();
        }
        
        // If debug mode is enabled, also load the list of available students
        if (isDebugMode) {
            fetchAvailableStudents();
        }
    }, []);

    // Add another useEffect to save registration number when it's available
    useEffect(() => {
        if (studentData?.student?.registration_number) {
            console.log("Saving student registration number to localStorage:", studentData.student.registration_number);
            localStorage.setItem('student_registration_number', studentData.student.registration_number);
        }
    }, [studentData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        try {
            const response = await axios.post(
                'http://localhost:5000/internship/submit',
                internshipData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            console.log('Submission response:', response.data);
            setSuccess('Internship details submitted successfully!');
            setShowInternshipForm(false);
            setSubmittedInternship(response.data.internship);
            
        } catch (error) {
            console.error('Submission error:', error.response || error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to submit internship details'
            );
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        try {
            // Include alumni data if student has MUJ alumni
            let formData = { ...profileData };
            if (formData.has_muj_alumni && alumniData) {
                formData.alumni_relation = alumniData;
            }

            const response = await axios.put(
                'http://localhost:5000/student/profile',
                formData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            console.log('Profile update response:', response.data);
            setSuccess('Profile updated successfully!');
            setShowProfileForm(false);
            fetchProfileData(); // Refresh data
            
        } catch (error) {
            console.error('Profile update error:', error.response || error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to update profile'
            );
        }
    };

    const handleParentSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        try {
            const response = await axios({
                method: 'post',
                url: 'http://localhost:5000/student/parent',
                data: parentData,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('Parent info response:', response.data);
            setSuccess('Parent information saved successfully!');
            setShowParentForm(false);
            setParentInfo(response.data.parent);
            fetchProfileData(); // Refresh data
            
        } catch (error) {
            console.error('Parent info error:', error.response || error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to save parent information'
            );
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Use functional state update to prevent focus issues
        setInternshipData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleProfileChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Use functional state update to prevent focus issues
        setProfileData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Show or hide alumni form based on has_muj_alumni checkbox
        if (name === 'has_muj_alumni') {
            setShowAlumniForm(checked);
        }
    };

    const handleParentChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Use functional state update to prevent focus issues
        setParentData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAlumniChange = (e) => {
        const { name, value } = e.target;
        // Use functional state update to prevent focus issues
        setAlumniData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    // Internship Form Container with isolated state
    const InternshipFormContainer = () => {
        // Create a local copy of the internship data for the form
        const [localInternshipData, setLocalInternshipData] = useState(() => ({
            ...internshipData
        }));
        
        const [localError, setLocalError] = useState('');
        const [localSuccess, setLocalSuccess] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);
        
        useEffect(() => {
            // Initialize local state when internship data changes
            setLocalInternshipData({...internshipData});
        }, []);
        
        const handleLocalChange = (e) => {
            const { name, value, type, checked } = e.target;
            setLocalInternshipData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        };
        
        const handleLocalSubmit = async (e) => {
            e.preventDefault();
            setLocalError('');
            setLocalSuccess('');
            setIsSubmitting(true);
            
            // Validate required fields
            const requiredFields = ['company_name', 'internship_type', 'start_date', 'end_date'];
            const missingFields = requiredFields.filter(field => !localInternshipData[field]);
            
            if (missingFields.length > 0) {
                setLocalError(`Missing required fields: ${missingFields.join(', ')}`);
                setIsSubmitting(false);
                return;
            }
            
            // Prepare data for submission
            const submissionData = {
                company_name: localInternshipData.company_name,
                internship_type: localInternshipData.internship_type,
                start_date: localInternshipData.start_date,
                end_date: localInternshipData.end_date,
                location: localInternshipData.location,
                stipend: localInternshipData.stipend ? parseFloat(localInternshipData.stipend) : null,
                hr_contact: localInternshipData.hr_contact || null,
                hr_email: localInternshipData.hr_email || null
            };
            
            try {
                const token = localStorage.getItem('token');
                const response = await axios({
                    method: 'post',
                    url: 'http://localhost:5000/internship/submit',
                    data: submissionData,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log('Internship response:', response.data);
                setLocalSuccess('Internship details saved successfully!');
                
                // Update parent component's state
                setInternshipData(response.data.internship);
                setSuccess('Internship details saved successfully!');
                
                // Store current registration number
                const currentRegNumber = studentData?.student?.registration_number;
                
                // Single timeout block for closing form and refreshing data
                setTimeout(() => {
                    setShowInternshipForm(false);
                    // Use the current student's registration number to refresh data
                    if (currentRegNumber) {
                        console.log("Refreshing with current student registration:", currentRegNumber);
                        fetchStudentByRegistration(currentRegNumber);
                    } else {
                        fetchProfileData(); // Fallback
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Internship error:', error.response || error);
                setLocalError(
                    error.response?.data?.error || 
                    error.message || 
                    'Failed to save internship details'
                );
            } finally {
                setIsSubmitting(false);
            }
        };
        
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Add Internship Details</h3>
                    <button
                        type="button"
                        onClick={() => setShowInternshipForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                </div>
                
                {localError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{localError}</div>}
                {localSuccess && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{localSuccess}</div>}
                
                <form onSubmit={handleLocalSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Organization Name *</label>
                            <input
                                type="text"
                                name="company_name"
                                value={localInternshipData.company_name || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Internship Type *</label>
                            <select
                                name="internship_type"
                                value={localInternshipData.internship_type || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            >
                                <option value="">Select Type</option>
                                <option value="in-house">In-house</option>
                                <option value="external">External</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                            <input
                                type="date"
                                name="start_date"
                                value={localInternshipData.start_date || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">End Date *</label>
                            <input
                                type="date"
                                name="end_date"
                                value={localInternshipData.end_date || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Location *</label>
                            <input
                                type="text"
                                name="location"
                                value={localInternshipData.location || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Stipend (INR per month) *</label>
                            <input
                                type="number"
                                name="stipend"
                                value={localInternshipData.stipend || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">HR Contact</label>
                            <input
                                type="text"
                                name="hr_contact"
                                value={localInternshipData.hr_contact || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="Contact person at the company"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">HR Email</label>
                            <input
                                type="email"
                                name="hr_email"
                                value={localInternshipData.hr_email || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="hr@company.com"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Internship Details'}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    const InternshipDetails = ({ internship }) => (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Internship Details</h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Submitted
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                    <p className="mt-1 text-gray-900">{internship.company_name}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Internship Type</label>
                    <p className="mt-1 text-gray-900">{internship.internship_type}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <p className="mt-1 text-gray-900">{new Date(internship.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <p className="mt-1 text-gray-900">{new Date(internship.end_date).toLocaleDateString()}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Stipend</label>
                    <p className="mt-1 text-gray-900">{internship.stipend ? `₹${internship.stipend}` : 'Not specified'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-gray-900">{internship.location || 'Not specified'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">HR Contact</label>
                    <p className="mt-1 text-gray-900">{internship.hr_contact || 'Not specified'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">HR Email</label>
                    <p className="mt-1 text-gray-900">{internship.hr_email || 'Not specified'}</p>
                </div>
            </div>
        </div>
    );

    const renderMentorInfo = () => {
        if (loading) return <div className="text-gray-600">Loading mentor information...</div>;
        
        if (error) return (
            <div className="bg-red-50 p-4 rounded">
                <p className="text-red-700">Error loading mentor information: {error}</p>
            </div>
        );
        
        console.log("Mentor data from API:", studentData?.mentor);
        console.log("Stored mentorData state:", mentorData);
        
        // First check studentData.mentor (from API response)
        const mentor = studentData?.mentor;
        
        // Check if mentor info exists in the data
        if (!mentor || !mentor.name) {
            return (
                <div className="bg-yellow-50 p-4 rounded">
                    <p className="text-yellow-700">No mentor has been assigned to you yet.</p>
                    <p className="text-sm text-yellow-600 mt-2">A mentor will be assigned to help guide you through your internship.</p>
                </div>
            );
        }
        
        return (
            <div className="bg-blue-50 p-4 rounded">
                <h3 className="text-lg font-medium text-blue-800">Your Mentor</h3>
                <div className="mt-2">
                    <p className="font-semibold">{mentor.name}</p>
                    <p className="text-gray-600">{mentor.department ? `${mentor.department} Department` : ''}</p>
                    {mentor.designation && <p className="text-gray-600">{mentor.designation}</p>}
                    {mentor.email && (
                        <p className="mt-2">
                            <a href={`mailto:${mentor.email}`} className="text-blue-600 hover:underline">
                                {mentor.email}
                            </a>
                        </p>
                    )}
                    {mentor.phone && (
                        <p className="mt-1">
                            <a href={`tel:${mentor.phone}`} className="text-blue-600 hover:underline">
                                {mentor.phone}
                            </a>
                        </p>
                    )}
                </div>
            </div>
        );
    };

    const menuItems = [
        {
            key: 'overview',
            icon: <HomeOutlined />,
            label: 'Overview'
        },
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile'
        },
        {
            key: 'internship',
            icon: <FileTextOutlined />,
            label: 'Internship'
        },
        {
            key: 'progress',
            icon: <LineChartOutlined />,
            label: 'Progress'
        },
        {
            key: 'reports',
            icon: <FileTextOutlined />,
            label: 'Reports'
        },
        {
            key: 'feedback',
            icon: <MessageOutlined />,
            label: 'Mentor Feedback'
        },
        {
            key: 'documents',
            icon: <FolderOutlined />,
            label: 'Documents'
        },
        {
            key: 'schedule',
            icon: <CalendarOutlined />,
            label: 'Schedule'
        }
    ];

    // Separate component with isolated state to prevent focus issues
    const ProfileFormContainer = () => {
        // Create a local copy of the profile data for the form
        const [localProfileData, setLocalProfileData] = useState(() => ({
            ...profileData
        }));
        
        const [localError, setLocalError] = useState('');
        const [localSuccess, setLocalSuccess] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [localAlumniData, setLocalAlumniData] = useState(() => ({
            ...alumniData
        }));
        
        useEffect(() => {
            // Initialize local state when profile data changes
            setLocalProfileData({...profileData});
            setLocalAlumniData({...alumniData});
        }, []);
        
        const handleLocalChange = (e) => {
            const { name, value, type, checked } = e.target;
            setLocalProfileData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        };
        
        const handleLocalAlumniChange = (e) => {
            const { name, value } = e.target;
            setLocalAlumniData(prev => ({
                ...prev,
                [name]: value
            }));
        };
        
        const handleLocalSubmit = async (e) => {
            e.preventDefault();
            setLocalError('');
            setLocalSuccess('');
            setIsSubmitting(true);
            
            try {
                // Include alumni data if student has MUJ alumni
                let formData = { ...localProfileData };
                
                if (formData.has_muj_alumni && localAlumniData) {
                    formData.alumni_relation = localAlumniData;
                    console.log("Including alumni data:", localAlumniData);
                }
                
                console.log("Submitting profile data:", formData);
                
                const response = await axios.put(
                    'http://localhost:5000/student/profile',
                    formData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );
                
                console.log('Profile update response:', response.data);
                setLocalSuccess('Profile updated successfully!');
                
                // Update parent component's state
                setProfileData(localProfileData);
                if (formData.has_muj_alumni) {
                    setAlumniData(localAlumniData);
                    setAlumniInfo(localAlumniData);
                }
                setSuccess('Profile updated successfully!');
                
                // Store current registration number before closing form
                const currentRegNumber = localProfileData.registration_number;
                
                setTimeout(() => {
                    setShowProfileForm(false);
                    // If we have a registration number, fetch that specific student
                    if (currentRegNumber) {
                        fetchStudentByRegistration(currentRegNumber);
                    } else {
                        fetchProfileData(); // Fallback to regular profile fetch
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Profile update error:', error.response || error);
                setLocalError(
                    error.response?.data?.error || 
                    error.message || 
                    'Failed to update profile'
                );
            } finally {
                setIsSubmitting(false);
            }
        };
        
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Edit Profile Information</h3>
                    <button
                        type="button"
                        onClick={() => setShowProfileForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                </div>
                
                {localError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{localError}</div>}
                {localSuccess && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{localSuccess}</div>}
                
                <form onSubmit={handleLocalSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={localProfileData.name || ''}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                disabled
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                            <input
                                type="text"
                                name="registration_number"
                                value={localProfileData.registration_number || ''}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                disabled
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Batch</label>
                            <input
                                type="text"
                                name="batch"
                                value={localProfileData.batch || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Section</label>
                            <input
                                type="text"
                                name="section"
                                value={localProfileData.section || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Program</label>
                            <select
                                name="program"
                                value={localProfileData.program || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            >
                                <option value="">Select Program</option>
                                <option value="B.Tech">B.Tech</option>
                                <option value="BBA">BBA</option>
                                <option value="MBA">MBA</option>
                                <option value="M.Tech">M.Tech</option>
                                <option value="BSc">BSc</option>
                                <option value="MSc">MSc</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                            <select
                                name="blood_group"
                                value={localProfileData.blood_group || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            >
                                <option value="">Select Blood Group</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                            <input
                                type="date"
                                name="date_of_birth"
                                value={localProfileData.date_of_birth || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={localProfileData.phone || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                            name="address"
                            value={localProfileData.address || ''}
                            onChange={handleLocalChange}
                            rows="3"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        ></textarea>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hostel Name</label>
                            <input
                                type="text"
                                name="hostel_name"
                                value={localProfileData.hostel_name || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hostel Block</label>
                            <input
                                type="text"
                                name="hostel_block"
                                value={localProfileData.hostel_block || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Room Number</label>
                            <input
                                type="text"
                                name="hostel_room_no"
                                value={localProfileData.hostel_room_no || ''}
                                onChange={handleLocalChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                name="has_muj_alumni"
                                checked={localProfileData.has_muj_alumni || false}
                                onChange={handleLocalChange}
                                className="h-4 w-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Do you have any MUJ alumni in your family?</span>
                        </label>
                    </div>
                    
                    {localProfileData.has_muj_alumni && (
                        <div className="mt-4 border-t pt-4">
                            <h4 className="font-medium text-gray-800 mb-3">MUJ Alumni Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Alumni Name *</label>
                                    <input
                                        type="text"
                                        name="alumni_name"
                                        value={localAlumniData.alumni_name || ''}
                                        onChange={handleLocalAlumniChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required={localProfileData.has_muj_alumni}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Registration Number *</label>
                                    <input
                                        type="text"
                                        name="alumni_registration_number"
                                        value={localAlumniData.alumni_registration_number || ''}
                                        onChange={handleLocalAlumniChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required={localProfileData.has_muj_alumni}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Branch *</label>
                                    <input
                                        type="text"
                                        name="alumni_branch"
                                        value={localAlumniData.alumni_branch || ''}
                                        onChange={handleLocalAlumniChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required={localProfileData.has_muj_alumni}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Program *</label>
                                    <select
                                        name="alumni_program"
                                        value={localAlumniData.alumni_program || ''}
                                        onChange={handleLocalAlumniChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required={localProfileData.has_muj_alumni}
                                    >
                                        <option value="">Select Program</option>
                                        <option value="B.Tech">B.Tech</option>
                                        <option value="BBA">BBA</option>
                                        <option value="MBA">MBA</option>
                                        <option value="M.Tech">M.Tech</option>
                                        <option value="BSc">BSc</option>
                                        <option value="MSc">MSc</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Batch *</label>
                                    <input
                                        type="text"
                                        name="alumni_batch"
                                        value={localAlumniData.alumni_batch || ''}
                                        onChange={handleLocalAlumniChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required={localProfileData.has_muj_alumni}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Relation with Student *</label>
                                    <input
                                        type="text"
                                        name="relation_with_student"
                                        value={localAlumniData.relation_with_student || ''}
                                        onChange={handleLocalAlumniChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required={localProfileData.has_muj_alumni}
                                        placeholder="e.g. Father, Mother, Brother, Sister, etc."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    const renderContent = () => {
        switch (selectedMenu) {
            case 'overview':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <Statistic
                                title="Internship Status"
                                value={submittedInternship ? 'Active' : 'Not Started'}
                                valueStyle={{ color: submittedInternship ? '#3f8600' : '#cf1322' }}
                            />
                        </Card>
                        <Card>
                            <Statistic
                                title="Progress"
                                value={studentData?.progress || 0}
                                suffix="%"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                        <Card>
                            <Statistic
                                title="Reports Submitted"
                                value={studentData?.reports_count || 0}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                        <Card>
                            <Statistic
                                title="Days Remaining"
                                value={studentData?.days_remaining || 0}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                        
                        {/* Recent Activity */}
                        <Card className="md:col-span-2 lg:col-span-4" title="Recent Activity">
                            <Timeline>
                                <Timeline.Item>Weekly report submitted</Timeline.Item>
                                <Timeline.Item>Mentor feedback received</Timeline.Item>
                                <Timeline.Item>Document uploaded</Timeline.Item>
                            </Timeline>
                        </Card>
                    </div>
                );
                
            case 'profile':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Student Profile Card */}
                        <Card className="lg:col-span-2" 
                            title={
                                <div className="flex justify-between items-center">
                                    <span>Personal Information</span>
                                    <Button 
                                        type="primary" 
                                        icon={<EditOutlined />}
                                        onClick={() => setShowProfileForm(true)}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            }
                        >
                            {showProfileForm ? (
                                <ProfileFormContainer />
                            ) : loading ? (
                                <div>Loading profile information...</div>
                            ) : error ? (
                                <div className="text-red-600">
                                    <p>Unable to load profile information</p>
                                </div>
                            ) : studentData?.student ? (
                                <div className="space-y-4">
                                    {/* Add a prominent notification for incomplete profile */}
                                    {(!studentData.student.section || 
                                      !studentData.student.program || 
                                      !studentData.student.phone || 
                                      !studentData.student.blood_group || 
                                      !studentData.student.date_of_birth || 
                                      !studentData.student.address || 
                                      !studentData.student.hostel_name) && (
                                        <Alert
                                            message="Complete Your Profile"
                                            description={
                                                <div>
                                                    <p>Some of your profile information is missing. Please complete your profile to ensure a smooth internship experience.</p>
                                                    <Button 
                                                        type="primary" 
                                                        onClick={() => setShowProfileForm(true)}
                                                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                                    >
                                                        Complete Profile
                                                    </Button>
                                                </div>
                                            }
                                            type="warning"
                                            showIcon
                                            closable
                                        />
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Text type="secondary">Name</Text>
                                            <p>{studentData.student.name}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Registration Number</Text>
                                            <p>{studentData.student.registration_number}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Batch</Text>
                                            <p>{studentData.student.batch || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Section</Text>
                                            <p>{studentData.student.section || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Program</Text>
                                            <p>{studentData.student.program || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Email</Text>
                                            <p>{studentData.student.email}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Phone</Text>
                                            <p>{studentData.student.phone || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Blood Group</Text>
                                            <p>{studentData.student.blood_group || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <Text type="secondary">Date of Birth</Text>
                                            <p>{studentData.student.date_of_birth || 'Not specified'}</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Text type="secondary">Address</Text>
                                        <p>{studentData.student.address || 'Not specified'}</p>
                                    </div>

                                    <div>
                                        <Text type="secondary">Hostel Information</Text>
                                        <p>
                                            {studentData.student.hostel_name ? 
                                                `${studentData.student.hostel_name}, Block ${studentData.student.hostel_block || 'N/A'}, Room ${studentData.student.hostel_room_no || 'N/A'}` : 
                                                'Not specified'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-red-600">Unable to load profile information</div>
                            )}
                        </Card>

                        {/* Mentor Information Card */}
                        <Card title="Mentor Information">
                            {renderMentorInfo()}
                        </Card>

                        {/* Parent Information Card - Moved from internship tab to profile tab */}
                        <Card 
                            className="lg:col-span-3"
                            title={
                                <div className="flex justify-between items-center">
                                    <span>Parent Information</span>
                                    <Button 
                                        type="primary" 
                                        icon={<EditOutlined />}
                                        onClick={() => setShowParentForm(true)}
                                    >
                                        {parentInfo ? 'Edit' : 'Add'} Parent Info
                                    </Button>
                                </div>
                            }
                        >
                            {showParentForm ? (
                                <ParentFormContainer />
                            ) : loading ? (
                                <div className="text-center py-4">
                                    <Text type="secondary">Loading parent information...</Text>
                                </div>
                            ) : error ? (
                                <div className="text-center py-4">
                                    <Alert
                                        message="Error loading parent information"
                                        description="Please try again later or add parent information manually."
                                        type="error"
                                        showIcon
                                    />
                                </div>
                            ) : parentInfo ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <Title level={5}>Father Details</Title>
                                        <div className="space-y-2">
                                            <div>
                                                <Text type="secondary">Name</Text>
                                                <p>{parentInfo.father_name}</p>
                                            </div>
                                            <div>
                                                <Text type="secondary">Occupation</Text>
                                                <p>{getOccupationType('father', parentInfo)}</p>
                                            </div>
                                            {parentInfo.father_organization && (
                                                <div>
                                                    <Text type="secondary">Organization</Text>
                                                    <p>{parentInfo.father_organization}</p>
                                                </div>
                                            )}
                                            {parentInfo.father_designation && (
                                                <div>
                                                    <Text type="secondary">Designation</Text>
                                                    <p>{parentInfo.father_designation}</p>
                                                </div>
                                            )}
                                            <div>
                                                <Text type="secondary">Contact</Text>
                                                <p>{parentInfo.father_mobile_no}</p>
                                                <p>{parentInfo.father_email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Title level={5}>Mother Details</Title>
                                        <div className="space-y-2">
                                            <div>
                                                <Text type="secondary">Name</Text>
                                                <p>{parentInfo.mother_name}</p>
                                            </div>
                                            <div>
                                                <Text type="secondary">Occupation</Text>
                                                <p>{getOccupationType('mother', parentInfo)}</p>
                                            </div>
                                            {parentInfo.mother_organization && (
                                                <div>
                                                    <Text type="secondary">Organization</Text>
                                                    <p>{parentInfo.mother_organization}</p>
                                                </div>
                                            )}
                                            {parentInfo.mother_designation && (
                                                <div>
                                                    <Text type="secondary">Designation</Text>
                                                    <p>{parentInfo.mother_designation}</p>
                                                </div>
                                            )}
                                            <div>
                                                <Text type="secondary">Contact</Text>
                                                <p>{parentInfo.mother_mobile_no}</p>
                                                <p>{parentInfo.mother_email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Text type="secondary">No parent information added yet</Text>
                                    <div className="mt-2">
                                        <Button 
                                            type="primary"
                                            onClick={() => setShowParentForm(true)}
                                            style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                        >
                                            Add Parent Information
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                );
                
            case 'internship':
                return (
                    <div className="grid grid-cols-1 gap-6">
                        {/* Internship Details Card */}
                        <Card 
                            title={
                                <div className="flex justify-between items-center">
                                    <span>Internship Details</span>
                                    {!showInternshipForm && !submittedInternship && (
                                        <Button 
                                            type="primary"
                                            onClick={() => setShowInternshipForm(true)}
                                            style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                        >
                                            Submit Internship Details
                                        </Button>
                                    )}
                                </div>
                            }
                        >
                            {showInternshipForm ? (
                                <InternshipFormContainer />
                            ) : submittedInternship ? (
                                <InternshipDetails internship={submittedInternship} />
                            ) : (
                                <div className="text-center py-4">
                                    <Text type="secondary">No internship details submitted yet</Text>
                                    <div className="mt-4">
                                        <Button 
                                            type="primary"
                                            onClick={() => setShowInternshipForm(true)}
                                            style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                        >
                                            Submit Internship Details
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                );
                
            case 'progress':
                return <ProgressTracker />;
            case 'reports':
                return <WeeklyReport />;
            case 'feedback':
                return <MentorFeedback />;
            case 'documents':
                return <DocumentRepository />;
            case 'schedule':
                return <Schedule />;
            default:
                return <div>Select a menu item</div>;
        }
    };

    // Helper function to get occupation type
    const getOccupationType = (parent, data) => {
        const prefix = parent === 'father' ? 'father_' : 'mother_';
        
        if (data[`${prefix}is_entrepreneur`]) return 'Entrepreneur';
        if (data[`${prefix}is_family_business`]) return 'Family Business';
        if (data[`${prefix}is_public_sector`]) return 'Public Sector';
        if (data[`${prefix}is_professional`]) return 'Professional';
        if (data[`${prefix}is_govt_employee`]) return 'Government Employee';
        if (data[`${prefix}is_private_company`]) return 'Private Company';
        if (parent === 'mother' && data.mother_is_home_maker) return 'Home Maker';
        
        return 'Not specified';
    };

    // Parent Form Container with isolated state
    const ParentFormContainer = () => {
        // Create a local copy of the parent data for the form
        const [localParentData, setLocalParentData] = useState(() => ({
            ...parentData
        }));
        
        const [localError, setLocalError] = useState('');
        const [localSuccess, setLocalSuccess] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);
        
        useEffect(() => {
            // Initialize local state when parent data changes
            setLocalParentData({...parentData});
        }, []);
        
        const handleLocalChange = (e) => {
            const { name, value, type, checked } = e.target;
            setLocalParentData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        };
        
        // Add a function to handle occupation radio buttons
        const handleOccupationChange = (parent, occupation) => {
            // Reset all occupation flags for the specified parent
            const newData = { ...localParentData };
            
            if (parent === 'father') {
                newData.father_is_entrepreneur = false;
                newData.father_is_family_business = false;
                newData.father_is_public_sector = false;
                newData.father_is_professional = false;
                newData.father_is_govt_employee = false;
                newData.father_is_private_company = false;
                
                // Set the selected occupation
                newData[`father_is_${occupation}`] = true;
            } else if (parent === 'mother') {
                newData.mother_is_entrepreneur = false;
                newData.mother_is_family_business = false;
                newData.mother_is_public_sector = false;
                newData.mother_is_professional = false;
                newData.mother_is_govt_employee = false;
                newData.mother_is_private_company = false;
                newData.mother_is_home_maker = false;
                
                // Set the selected occupation
                newData[`mother_is_${occupation}`] = true;
            }
            
            setLocalParentData(newData);
        };
        
        const handleLocalSubmit = async (e) => {
            e.preventDefault();
            setLocalError('');
            setLocalSuccess('');
            setIsSubmitting(true);
            
            try {
                console.log("Submitting parent data:", localParentData);
                
                const response = await axios({
                    method: 'post',
                    url: 'http://localhost:5000/student/parent',
                    data: localParentData,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                console.log('Parent info response:', response.data);
                setLocalSuccess('Parent information saved successfully!');
                
                // Update parent component's state
                setParentData(localParentData);
                setSuccess('Parent information saved successfully!');
                setParentInfo(response.data.parent);
                
                // Store current registration number before closing form
                const currentRegNumber = studentData?.student?.registration_number;
                
                setTimeout(() => {
                    setShowParentForm(false);
                    // If we have a registration number, fetch that specific student
                    if (currentRegNumber) {
                        fetchStudentByRegistration(currentRegNumber);
                    } else {
                        fetchProfileData(); // Fallback to regular profile fetch
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Parent info error:', error.response || error);
                setLocalError(
                    error.response?.data?.error || 
                    error.message || 
                    'Failed to save parent information'
                );
            } finally {
                setIsSubmitting(false);
            }
        };
        
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Edit Parent Information</h3>
                    <button 
                        type="button"
                        onClick={() => setShowParentForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                </div>
                
                {localError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{localError}</div>}
                {localSuccess && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{localSuccess}</div>}
                
                <form onSubmit={handleLocalSubmit} className="space-y-4">
                    <Tabs defaultActiveKey="father">
                        <TabPane tab="Father's Information" key="father">
                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Father's Name *</label>
                                    <input
                                        type="text"
                                        name="father_name"
                                        value={localParentData.father_name || ''}
                                        onChange={handleLocalChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mobile Number *</label>
                                        <input
                                            type="tel"
                                            name="father_mobile_no"
                                            value={localParentData.father_mobile_no || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            name="father_email"
                                            value={localParentData.father_email || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Occupation</label>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="father_occupation"
                                                value="entrepreneur"
                                                checked={localParentData.father_is_entrepreneur || false}
                                                onChange={() => handleOccupationChange('father', 'entrepreneur')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Entrepreneur</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="father_occupation"
                                                value="professional"
                                                checked={localParentData.father_is_professional || false}
                                                onChange={() => handleOccupationChange('father', 'professional')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Professional</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="father_occupation"
                                                value="govt_employee"
                                                checked={localParentData.father_is_govt_employee || false}
                                                onChange={() => handleOccupationChange('father', 'govt_employee')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Government Employee</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="father_occupation"
                                                value="private_company"
                                                checked={localParentData.father_is_private_company || false}
                                                onChange={() => handleOccupationChange('father', 'private_company')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Private Company</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="father_occupation"
                                                value="public_sector"
                                                checked={localParentData.father_is_public_sector || false}
                                                onChange={() => handleOccupationChange('father', 'public_sector')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Public Sector</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="father_occupation"
                                                value="family_business"
                                                checked={localParentData.father_is_family_business || false}
                                                onChange={() => handleOccupationChange('father', 'family_business')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Family Business</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Organization</label>
                                        <input
                                            type="text"
                                            name="father_organization"
                                            value={localParentData.father_organization || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Designation</label>
                                        <input
                                            type="text"
                                            name="father_designation"
                                            value={localParentData.father_designation || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabPane>
                        
                        <TabPane tab="Mother's Information" key="mother">
                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mother's Name *</label>
                                    <input
                                        type="text"
                                        name="mother_name"
                                        value={localParentData.mother_name || ''}
                                        onChange={handleLocalChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Occupation</label>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mother_occupation"
                                                value="entrepreneur"
                                                checked={localParentData.mother_is_entrepreneur || false}
                                                onChange={() => handleOccupationChange('mother', 'entrepreneur')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Entrepreneur</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mother_occupation"
                                                value="professional"
                                                checked={localParentData.mother_is_professional || false}
                                                onChange={() => handleOccupationChange('mother', 'professional')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Professional</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mother_occupation"
                                                value="govt_employee"
                                                checked={localParentData.mother_is_govt_employee || false}
                                                onChange={() => handleOccupationChange('mother', 'govt_employee')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Government Employee</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mother_occupation"
                                                value="private_company"
                                                checked={localParentData.mother_is_private_company || false}
                                                onChange={() => handleOccupationChange('mother', 'private_company')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Private Company</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mother_occupation"
                                                value="public_sector"
                                                checked={localParentData.mother_is_public_sector || false}
                                                onChange={() => handleOccupationChange('mother', 'public_sector')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Public Sector</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mother_occupation"
                                                value="family_business"
                                                checked={localParentData.mother_is_family_business || false}
                                                onChange={() => handleOccupationChange('mother', 'family_business')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Family Business</span>
                                        </label>
                                        
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mother_occupation"
                                                value="home_maker"
                                                checked={localParentData.mother_is_home_maker || false}
                                                onChange={() => handleOccupationChange('mother', 'home_maker')}
                                                className="h-4 w-4 text-blue-600 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Home Maker</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Organization</label>
                                        <input
                                            type="text"
                                            name="mother_organization"
                                            value={localParentData.mother_organization || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Designation</label>
                                        <input
                                            type="text"
                                            name="mother_designation"
                                            value={localParentData.mother_designation || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mobile Number *</label>
                                        <input
                                            type="tel"
                                            name="mother_mobile_no"
                                            value={localParentData.mother_mobile_no || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            name="mother_email"
                                            value={localParentData.mother_email || ''}
                                            onChange={handleLocalChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabPane>
                        
                        <TabPane tab="Address Information" key="address">
                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Communication Address *</label>
                                    <textarea
                                        name="communication_address"
                                        value={localParentData.communication_address || ''}
                                        onChange={handleLocalChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        rows="3"
                                        required
                                    ></textarea>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">PIN Code *</label>
                                    <input
                                        type="text"
                                        name="pin_code"
                                        value={localParentData.pin_code || ''}
                                        onChange={handleLocalChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
                                    <textarea
                                        name="permanent_address"
                                        value={localParentData.permanent_address || ''}
                                        onChange={handleLocalChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        rows="3"
                                        placeholder="If different from communication address"
                                    ></textarea>
                                </div>
                            </div>
                        </TabPane>
                    </Tabs>
                    
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Parent Information'}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider 
                collapsible 
                collapsed={collapsed} 
                onCollapse={setCollapsed}
                theme="light"
                width={250}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)'
                }}
            >
                <div className="p-4" style={{ 
                    height: '64px', 
                    display: 'flex', 
                    alignItems: 'center',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <Title level={4} style={{ margin: 0 }}>Student Portal</Title>
                </div>
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[selectedMenu]}
                    items={menuItems}
                    onClick={({ key }) => setSelectedMenu(key)}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
                <Header style={{ 
                    background: '#fff', 
                    padding: '0 24px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(0,21,41,.08)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: '16px', width: 64, height: 64 }}
                        />
                        <Title level={4} style={{ margin: '0 0 0 16px' }}>
                            {menuItems.find(item => item.key === selectedMenu)?.label || 'Dashboard'}
                        </Title>
                    </div>
                    <Space size="large">
                        {/* Add debug toggle and student selector */}
                        <Button 
                            type={isDebugMode ? "primary" : "default"} 
                            onClick={() => {
                                setIsDebugMode(!isDebugMode);
                                if (!isDebugMode) {
                                    fetchAvailableStudents();
                                }
                            }}
                        >
                            Debug Mode
                        </Button>
                        <Badge count={notifications.length}>
                            <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
                        </Badge>
                    </Space>
                </Header>
                
                {/* Add debug panel for student selection */}
                {isDebugMode && (
                    <div style={{ 
                        padding: '10px 24px', 
                        background: '#fffbe6', 
                        borderBottom: '1px solid #ffe58f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Input 
                                placeholder="Enter registration number" 
                                value={manualRegNumber}
                                onChange={(e) => setManualRegNumber(e.target.value)}
                                style={{ width: 200 }}
                            />
                            <Button 
                                type="primary" 
                                onClick={() => fetchStudentByRegistration(manualRegNumber)}
                                loading={loading}
                            >
                                Load Student
                            </Button>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {availableStudents.length > 0 && (
                                <Select 
                                    placeholder="Select a student" 
                                    style={{ width: 250 }}
                                    onChange={(value) => {
                                        setManualRegNumber(value);
                                        fetchStudentByRegistration(value);
                                    }}
                                >
                                    {availableStudents.map(student => (
                                        <Option key={student.registration_number} value={student.registration_number}>
                                            {student.name} ({student.registration_number})
                                        </Option>
                                    ))}
                                </Select>
                            )}
                            <Button 
                                onClick={fetchAvailableStudents}
                                icon={<ReloadOutlined />}
                            >
                                Refresh List
                            </Button>
                        </div>
                        
                        <Alert 
                            message={`Current student: ${studentData?.student?.name || 'Unknown'} (${studentData?.student?.registration_number || 'No reg'})`}
                            type="warning" 
                            showIcon 
                            style={{ marginLeft: 'auto' }}
                        />
                    </div>
                )}
                
                <Content style={{ 
                    margin: '24px 16px', 
                    padding: 24, 
                    background: '#fff',
                    minHeight: 280,
                    borderRadius: '4px',
                    boxShadow: '0 1px 4px rgba(0,21,41,.08)'
                }}>
                    {renderContent()}
                </Content>
            </Layout>
        </Layout>
    );
};

export default StudentDashboard; 