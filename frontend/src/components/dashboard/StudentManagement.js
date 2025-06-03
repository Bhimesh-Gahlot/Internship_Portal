import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    DatePicker,
    Select,
    InputNumber,
    message,
    Popconfirm,
    Space,
    Card,
    Alert,
    Row,
    Col,
    Divider,
    Typography,
    Tabs
} from 'antd';
import dayjs from 'dayjs';
import { ReloadOutlined, ApiOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined, DatabaseOutlined, MedicineBoxOutlined, UserAddOutlined, ExperimentOutlined } from '@ant-design/icons';
import { getToken, storeAuthData } from '../../utils/auth';

const { Title } = Typography;

const StudentManagement = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [error, setError] = useState(null);
    const [apiStatus, setApiStatus] = useState("");
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [loadingUnassigned, setLoadingUnassigned] = useState(false);
    const [mentors, setMentors] = useState([]);
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);

    useEffect(() => {
        fetchStudents();
        
        // Set up automatic refresh every 30 seconds for the data
        const refreshInterval = setInterval(() => {
            console.log("Auto-refreshing student data...");
            fetchStudents();
        }, 30000);
        
        // Clean up the interval when component unmounts
        return () => clearInterval(refreshInterval);
    }, []);

    // New function to check and automatically fix data issues
    const checkAndFixData = async () => {
        try {
            console.log("Checking database for potential issues...");
            
            const token = getToken('admin');
            if (!token) {
                console.log('No admin token found');
                return;
            }
            
            // First, check database status
            const debugResponse = await axios.get('http://localhost:5000/admin/debug-data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const tables = debugResponse.data.tables || {};
            const studentsCount = tables.students?.count || 0;
            const mentorsCount = tables.mentors?.count || 0;
            const userStudentsCount = tables.users?.sample?.filter(u => u.role === 'student').length || 0;
            const userMentorsCount = tables.users?.sample?.filter(u => u.role === 'mentor').length || 0;
            
            console.log(`Database check: ${studentsCount} students, ${mentorsCount} mentors`);
            
            // If we have users with student role but no student records, fix them automatically
            let needsRefresh = false;
            
            if (studentsCount === 0 && userStudentsCount > 0) {
                console.log("Found users with student role but no student records - fixing automatically");
                await axios.post('http://localhost:5000/admin/fix-student-records', {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                needsRefresh = true;
            }
            
            // If we have users with mentor role but no mentor records, fix them automatically
            if (mentorsCount === 0 && userMentorsCount > 0) {
                console.log("Found users with mentor role but no mentor records - fixing automatically");
                await axios.post('http://localhost:5000/admin/fix-mentor-records', {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                needsRefresh = true;
            }
            
            // Refresh data if any fixes were applied
            if (needsRefresh) {
                fetchStudents();
            }
            
        } catch (error) {
            console.error("Error checking/fixing data:", error);
        }
    };

    // Call check and fix after the first successful data fetch
    useEffect(() => {
        if (students.length === 0) {
            // Wait a bit after the component mounts before checking
            const timer = setTimeout(() => {
                checkAndFixData();
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [students]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("Fetching students...");
            
            // Get token or create a default admin token if missing
            let token = getToken('admin');
            
            // If no token found, create a dummy token for development
            if (!token) {
                console.log('No admin token found, creating a default one');
                // Store a dummy admin authentication for development
                storeAuthData({
                    token: 'token:1:admin:default_session',
                    user_id: 1,
                    role: 'admin'
                });
                token = 'token:1:admin:default_session';
            }
            
            console.log("Using token for fetchStudents:", token.substring(0, 15) + "...");
            
            const response = await axios.get('http://localhost:5000/admin/students', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log("Student data full response:", response);
            
            if (response.data && Array.isArray(response.data.students)) {
                console.log(`Found ${response.data.students.length} students`);
                
                // Validate and structure the student data properly to ensure consistent display
                const validatedStudents = response.data.students.map(student => ({
                    id: student.id,
                    user_id: student.user_id,
                    name: student.name || 'Unknown',
                    email: student.email || '',
                    registration_number: student.registration_number || '',
                    batch: student.batch || '',
                    mentor: student.mentor || null,
                    internship: student.internship || null
                }));
                
                setStudents(validatedStudents);
                
                if (validatedStudents.length === 0) {
                    setApiStatus("No student records found. You can create test data with the 'Create Test Data' button");
                    messageApi.info("No student records found");
                } else {
                    setApiStatus(`Loaded ${validatedStudents.length} student records successfully`);
                    // Only show success message on initial load, not on refreshes
                    if (!students.length) {
                        messageApi.success(`Loaded ${validatedStudents.length} student records`);
                    }
                }
            } else {
                console.error("Unexpected response format:", response.data);
                setError("Received invalid data format from server");
                setApiStatus("Error: Received invalid data format from server");
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            console.error('Error response object:', error.response);
            
            let errorMessage = "Failed to fetch students";
            if (error.response) {
                console.log("Error response:", error.response.data);
                if (error.response.status === 401) {
                    errorMessage = "Authentication failed. Please login again.";
                } else {
                    errorMessage = `Server error: ${error.response.status} - ${error.response.data.error || error.response.data.message || error.message}`;
                }
            } else if (error.request) {
                errorMessage = "No response from server. Check if backend is running.";
            } else {
                errorMessage = `Error: ${error.message}`;
            }
            
            setError(errorMessage);
            setApiStatus(`Error: ${errorMessage}`);
            messageApi.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const testApiConnection = async () => {
        try {
            setApiStatus("Testing connection...");
            
            // Get token or create a default admin token if missing
            let token = getToken('admin');
            
            // If no token found, create a dummy token for development
            if (!token) {
                console.log('No admin token found, creating a default one');
                // Store a dummy admin authentication for development
                storeAuthData({
                    token: 'token:1:admin:default_session',
                    user_id: 1,
                    role: 'admin'
                });
                token = 'token:1:admin:default_session';
                setApiStatus("Created a development token for testing");
            }
            
            // Test API connection with full token debugging
            console.log("Using token:", token);
            const response = await axios.get('http://localhost:5000/admin/students', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                setApiStatus(`Connection successful! Received ${response.data.students ? response.data.students.length : 0} student records.`);
                messageApi.success("API connection successful");
                // Reload students if we got data
                if (response.data && Array.isArray(response.data.students)) {
                    setStudents(response.data.students);
                }
            } else {
                setApiStatus(`Unexpected response: ${response.status}`);
            }
        } catch (error) {
            console.error('API test error:', error);
            let statusMessage = "API connection failed";
            
            if (error.response) {
                console.log("Error response data:", error.response.data);
                // Always create a new token regardless of the error
                storeAuthData({
                    token: `token:1:admin:session_${Date.now()}`,
                    user_id: 1,
                    role: 'admin'
                });
                statusMessage = "Created a new token. Please try testing again.";
            } else if (error.request) {
                statusMessage = "No response from server. Check if backend is running.";
            } else {
                statusMessage = `Error: ${error.message}`;
            }
            
            setApiStatus(statusMessage);
            messageApi.error("Connection failed. Click 'Test API Connection' again to retry with a new token.");
        }
    };

    const createTestData = async () => {
        try {
            setLoading(true);
            const token = getToken('admin');
            
            if (!token) {
                messageApi.error('Authentication token not found. Please log in again.');
                return;
            }
            
            const response = await axios.post(
                'http://localhost:5000/admin/create-test-data',
                { force: true }, // Force create even if users exist
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            messageApi.success('Test data created successfully! Refreshing...');
            console.log('Test data creation response:', response.data);
            
            // Fetch students after a brief delay
            setTimeout(() => {
                fetchStudents();
            }, 1000);
        } catch (error) {
            console.error('Error creating test data:', error);
            messageApi.error('Failed to create test data');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (student) => {
        try {
            console.log('Editing student:', student);
            setEditingStudent(student);
            form.setFieldsValue({
                name: student.name,
                registration_number: student.registration_number,
                batch: student.batch,
                company_name: student.internship?.company_name || '',
                internship_type: student.internship?.internship_type || '',
                start_date: student.internship?.start_date ? dayjs(student.internship.start_date) : null,
                end_date: student.internship?.end_date ? dayjs(student.internship.end_date) : null,
                stipend: student.internship?.stipend || '',
                location: student.internship?.location || '',
                hr_contact: student.internship?.hr_contact || '',
                hr_email: student.internship?.hr_email || ''
            });
            setModalVisible(true);
        } catch (error) {
            console.error('Edit error:', error);
            messageApi.error('Failed to load student data for editing');
        }
    };

    const handleDelete = async (studentId) => {
        try {
            // Get token or create a default admin token if missing
            let token = getToken('admin');
            
            // If no token found, create a dummy token for development
            if (!token) {
                console.log('Creating default admin token for delete operation');
                storeAuthData({
                    token: 'token:1:admin:default_session',
                    user_id: 1,
                    role: 'admin'
                });
                token = 'token:1:admin:default_session';
            }
            
            console.log('Deleting student with ID:', studentId);
            
            await axios.delete(`http://localhost:5000/admin/students/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            messageApi.success('Student deleted successfully');
            fetchStudents();
        } catch (error) {
            console.error('Delete error details:', error);
            messageApi.error('Failed to delete student: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleUpdate = async (values) => {
        try {
            setLoading(true);
            const token = getToken('admin');
            
            if (!token) {
                messageApi.error('Authentication token not found. Please log in again.');
                return;
            }
            
            if (editingStudent) {
                // Update existing student
                await axios.put(
                    `http://localhost:5000/admin/students/${editingStudent.id}`,
                    values,
                    {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                messageApi.success('Student updated successfully!');
            } else {
                // Create new student with better error handling
                try {
                    const response = await axios.post(
                        'http://localhost:5000/admin/students',
                        values,
                        {
                            headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    messageApi.success('Student created successfully!');
                    
                    // If a password was generated, show it
                    if (response.data.student && response.data.student.password) {
                        messageApi.success(
                            `Student created with password: ${response.data.student.password}. Please share with the student.`,
                            10
                        );
                    }
                } catch (error) {
                    console.error('Create student error:', error);
                    if (error.response) {
                        const errorMessage = error.response.data.error || error.response.data.message || 'Failed to create student';
                        messageApi.error(`Failed to create student: ${errorMessage}`);
                    } else if (error.request) {
                        messageApi.error('No response from server. Check your connection and try again.');
                    } else {
                        messageApi.error(`Error: ${error.message}`);
                    }
                    setLoading(false);
                    return; // Don't close modal or refresh on error
                }
            }
            
            setModalVisible(false);
            fetchStudents();
            form.resetFields();
        } catch (error) {
            console.error('Error:', error);
            messageApi.error('Operation failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchStudents();
        fetchUnassignedStudents();
        fetchMentors();
    };

    const debugDatabase = async () => {
        try {
            setLoading(true);
            setApiStatus("Debugging database...");
            
            const token = getToken('admin');
            if (!token) {
                messageApi.error('Authentication token not found. Please log in again.');
                return;
            }
            
            const response = await axios.get('http://localhost:5000/admin/debug-data', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Debug data:', response.data);
            
            // Display basic stats
            const tables = response.data.tables;
            let statsMessage = "Database Tables:\n";
            
            for (const table in tables) {
                if (table !== 'list' && tables[table].count !== undefined) {
                    statsMessage += `- ${table}: ${tables[table].count} records\n`;
                }
            }
            
            // Display student-mentor relationships
            if (response.data.relationships && response.data.relationships.student_mentor) {
                const relationships = response.data.relationships.student_mentor;
                statsMessage += "\nStudent-Mentor Relationships:\n";
                
                if (relationships.length === 0) {
                    statsMessage += "No student-mentor relationships found.\n";
                } else {
                    relationships.forEach((rel, index) => {
                        statsMessage += `${index+1}. Student: ${rel.student_name} (ID: ${rel.student_id})`;
                        if (rel.mentor_name) {
                            statsMessage += ` -> Mentor: ${rel.mentor_name} (ID: ${rel.mentor_table_id})\n`;
                        } else {
                            statsMessage += " -> No mentor assigned\n";
                        }
                    });
                }
            }
            
            setApiStatus(statsMessage);
            messageApi.success('Database debug completed. Check console for full details.');
            
        } catch (error) {
            console.error('Error debugging database:', error);
            messageApi.error('Failed to debug database');
            setApiStatus(`Debug error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const recoverData = async () => {
        try {
            setLoading(true);
            setApiStatus("Recovering data and fixing inconsistencies...");
            
            const token = getToken('admin');
            if (!token) {
                messageApi.error('Authentication token not found. Please log in again.');
                return;
            }
            
            const response = await axios.post('http://localhost:5000/admin/recover-data', {}, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Data recovery response:', response.data);
            
            const details = response.data.details;
            const message = [
                `Fixed ${details.fixed_students} student records`,
                `Fixed ${details.fixed_mentors} mentor records`,
                `Restored ${details.fixed_internships} internships`,
                `Created ${details.fixed_assignments} mentor assignments`
            ].join(', ');
            
            setApiStatus(`Recovery complete. ${message}`);
            messageApi.success('Data recovery completed successfully');
            
            // Refresh the student list after recovery
            setTimeout(() => {
                fetchStudents();
            }, 1000);
            
        } catch (error) {
            console.error('Error recovering data:', error);
            messageApi.error('Failed to recover data');
            setApiStatus(`Error recovering data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: text => text || '-'
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: text => text || '-'
        },
        {
            title: 'Registration Number',
            dataIndex: 'registration_number',
            key: 'registration_number',
            render: text => text || '-'
        },
        {
            title: 'Batch',
            dataIndex: 'batch',
            key: 'batch',
            render: text => text || '-'
        },
        {
            title: 'Mentor',
            key: 'mentor',
            render: (_, record) => (record.mentor?.name ? `${record.mentor.name} (${record.mentor.department || 'No Dept'})` : '-')
        },
        {
            title: 'Company',
            key: 'company_name',
            render: (_, record) => record.internship?.company_name || '-'
        },
        {
            title: 'Internship Type',
            key: 'internship_type',
            render: (_, record) => record.internship?.internship_type || '-'
        },
        {
            title: 'Stipend',
            key: 'stipend',
            render: (_, record) => (record.internship?.stipend ? `₹${record.internship.stipend}` : '-')
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                    >
                        Edit
                    </Button>
                    <Button
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDelete(record.id)}
                    >
                        Delete
                    </Button>
                </Space>
            )
        }
    ];

    // Add a function to fetch unassigned students
    const fetchUnassignedStudents = async () => {
        try {
            setLoadingUnassigned(true);
            const token = getToken('admin');
            
            if (!token) {
                console.log('No admin token found, skipping unassigned students fetch');
                return;
            }
            
            const response = await axios.get('http://localhost:5000/admin/students/unassigned', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Unassigned students:', response.data);
            
            if (response.data.students) {
                setUnassignedStudents(response.data.students);
                
                if (response.data.students.length > 0) {
                    messageApi.info(`Found ${response.data.students.length} students without mentors`);
                }
            }
        } catch (error) {
            console.error('Error fetching unassigned students:', error);
            messageApi.error('Failed to fetch unassigned students');
        } finally {
            setLoadingUnassigned(false);
        }
    };

    // Add a function to fetch all mentors
    const fetchMentors = async () => {
        try {
            const token = getToken('admin');
            
            if (!token) {
                console.log('No admin token found, skipping mentors fetch');
                return;
            }
            
            const response = await axios.get('http://localhost:5000/admin/mentors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Mentors:', response.data);
            
            if (response.data.mentors) {
                setMentors(response.data.mentors);
            }
        } catch (error) {
            console.error('Error fetching mentors:', error);
            messageApi.error('Failed to fetch mentors');
        }
    };

    // Assign mentor to selected students
    const assignMentorToStudents = async () => {
        try {
            if (!selectedMentor) {
                messageApi.error('Please select a mentor');
                return;
            }
            
            if (selectedStudents.length === 0) {
                messageApi.error('Please select at least one student');
                return;
            }
            
            const token = getToken('admin');
            
            if (!token) {
                messageApi.error('Authentication token not found');
                return;
            }
            
            // Use bulk endpoint if multiple students, otherwise use the single endpoint
            if (selectedStudents.length > 1) {
                const response = await axios.post(
                    'http://localhost:5000/admin/assign-mentor/bulk',
                    {
                        student_ids: selectedStudents,
                        mentor_id: selectedMentor
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                
                console.log('Bulk assignment response:', response.data);
                
                if (response.data.success_count > 0) {
                    messageApi.success(`Successfully assigned ${response.data.success_count} students to mentor`);
                }
                
                if (response.data.failed_count > 0) {
                    messageApi.warning(`Failed to assign ${response.data.failed_count} students. See console for details.`);
                }
            } else {
                // Single student assignment
                const response = await axios.post(
                    'http://localhost:5000/admin/assign-mentor',
                    {
                        student_id: selectedStudents[0],
                        mentor_id: selectedMentor
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                
                console.log('Single assignment response:', response.data);
                
                if (response.data.success) {
                    messageApi.success(response.data.message || 'Student assigned successfully');
                }
            }
            
            // Close modal and reset selections
            setAssignmentModalVisible(false);
            setSelectedMentor(null);
            setSelectedStudents([]);
            
            // Refresh data
            fetchUnassignedStudents();
            fetchStudents();
        } catch (error) {
            console.error('Error assigning mentor:', error);
            messageApi.error('Failed to assign mentor: ' + (error.response?.data?.error || error.message));
        }
    };

    // Call the function when the component mounts
    useEffect(() => {
        fetchUnassignedStudents();
        fetchMentors();
    }, []);

    // Add columns for unassigned students table
    const unassignedColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name)
        },
        {
            title: 'Registration Number',
            dataIndex: 'registration_number',
            key: 'registration_number'
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department'
        },
        {
            title: 'Batch',
            dataIndex: 'batch',
            key: 'batch'
        },
        {
            title: 'Has Internship',
            key: 'has_internship',
            render: (_, record) => record.has_internship ? 'Yes' : 'No'
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button
                    type="primary"
                    onClick={() => {
                        setSelectedStudents([record.id]);
                        setAssignmentModalVisible(true);
                    }}
                >
                    Assign Mentor
                </Button>
            )
        }
    ];

    return (
        <div className="student-management">
            {contextHolder}
            <Tabs defaultActiveKey="all">
                <Tabs.TabPane tab="All Students" key="all">
                    <Card 
                        title="Student Management" 
                        extra={
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <Button 
                                        type="primary" 
                                        onClick={() => setModalVisible(true)}
                                        icon={<PlusOutlined />}
                                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff'}}
                                    >
                                        Add Student
                                    </Button>
                                    <Button
                                        onClick={fetchStudents}
                                        icon={<ReloadOutlined />}
                                        style={{marginLeft: '10px', backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                    >
                                        Refresh
                                    </Button>
                                    <Button
                                        onClick={createTestData}
                                        icon={<ExperimentOutlined />}
                                        style={{marginLeft: '10px', backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                    >
                                        Create Test Data
                                    </Button>
                                </div>
                            </div>
                        }
                    >
                        {/* Only show API status if it contains positive info, not errors */}
                        {apiStatus && !apiStatus.includes('Error') && !apiStatus.includes('failed') && (
                            <Alert
                                message={apiStatus}
                                type={apiStatus.includes('successful') ? 'success' : 'info'}
                                showIcon
                                style={{ marginBottom: '16px' }}
                            />
                        )}
                        <Row gutter={16} style={{ marginBottom: '16px' }}>
                            <Col span={24}>
                                <Space>
                                    <Button 
                                        onClick={handleRefresh}
                                        icon={<ReloadOutlined />}
                                    >
                                        Refresh Data
                                    </Button>
                                    <Button 
                                        type="primary"
                                        onClick={createTestData}
                                        icon={<DatabaseOutlined />}
                                    >
                                        Create Test Data
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                        
                        {/* Show only non-authentication related errors */}
                        {error && !error.includes('authentication') && !error.includes('token') && !error.includes('login') && (
                            <Row>
                                <Col span={24}>
                                    <Alert 
                                        message="Error" 
                                        description={error} 
                                        type="error" 
                                        showIcon 
                                    />
                                </Col>
                            </Row>
                        )}
                        
                        <Divider />
                        
                        <Table
                            columns={columns}
                            dataSource={students}
                            loading={loading}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: 'No students found' }}
                        />
                    </Card>
                </Tabs.TabPane>
                <Tabs.TabPane tab={`Unassigned Students (${unassignedStudents.length})`} key="unassigned">
                    <Card 
                        title="Unassigned Students" 
                        extra={
                            <Button 
                                type="primary" 
                                onClick={() => {
                                    setSelectedStudents(unassignedStudents.map(s => s.id));
                                    setAssignmentModalVisible(true);
                                }}
                                disabled={unassignedStudents.length === 0}
                            >
                                Bulk Assign
                            </Button>
                        }
                    >
                        <Row gutter={16} style={{ marginBottom: '16px' }}>
                            <Col span={24}>
                                <Space>
                                    <Button 
                                        onClick={fetchUnassignedStudents}
                                        icon={<ReloadOutlined />}
                                        loading={loadingUnassigned}
                                    >
                                        Refresh Unassigned
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                        
                        <Table
                            columns={unassignedColumns}
                            dataSource={unassignedStudents}
                            loading={loadingUnassigned}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                            rowSelection={{
                                type: 'checkbox',
                                onChange: (selectedRowKeys) => {
                                    setSelectedStudents(selectedRowKeys);
                                }
                            }}
                            locale={{ emptyText: 'No unassigned students found' }}
                        />
                    </Card>
                </Tabs.TabPane>
            </Tabs>

            <Modal
                title={editingStudent ? "Edit Student" : "Add Student"}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button 
                        key="submit" 
                        type="primary" 
                        loading={loading} 
                        onClick={handleUpdate}
                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff'}}
                    >
                        {editingStudent ? "Update" : "Save"}
                    </Button>,
                ]}
                width={800}
            >
                <Form
                    form={form}
                    onFinish={handleUpdate}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please input the name!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="registration_number"
                        label="Registration Number"
                        rules={[{ required: true, message: 'Please input the registration number!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="batch"
                        label="Batch"
                        rules={[{ required: true, message: 'Please input the batch!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="company_name"
                        label="Company Name"
                        rules={[{ required: true, message: 'Please input the company name!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="internship_type"
                        label="Internship Type"
                        rules={[{ required: true, message: 'Please select the internship type!' }]}
                    >
                        <Select
                            options={[
                                { value: 'in-house', label: 'In-house' },
                                { value: 'external', label: 'External' }
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        name="start_date"
                        label="Start Date"
                        rules={[{ required: true, message: 'Please select the start date!' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="end_date"
                        label="End Date"
                        rules={[{ required: true, message: 'Please select the end date!' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="stipend"
                        label="Stipend"
                    >
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="location"
                        label="Location"
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="hr_contact"
                        label="HR Contact"
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="hr_email"
                        label="HR Email"
                        rules={[{ type: 'email', message: 'Please enter a valid email!' }]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Assign Mentor"
                open={assignmentModalVisible}
                onCancel={() => {
                    setAssignmentModalVisible(false);
                    setSelectedMentor(null);
                }}
                onOk={assignMentorToStudents}
                confirmLoading={loading}
            >
                <Form layout="vertical">
                    <Form.Item 
                        label="Select Mentor" 
                        required
                        help={selectedMentor ? 
                            `Selected mentor has ${mentors.find(m => m.id === selectedMentor)?.current_students || 0} / ${mentors.find(m => m.id === selectedMentor)?.max_students || 5} students assigned` 
                            : 'Please select a mentor'
                        }
                    >
                        <Select
                            placeholder="Select a mentor"
                            value={selectedMentor}
                            onChange={setSelectedMentor}
                            style={{ width: '100%' }}
                        >
                            {mentors.map(mentor => (
                                <Select.Option 
                                    key={mentor.id} 
                                    value={mentor.id}
                                    disabled={mentor.current_students >= mentor.max_students}
                                >
                                    {mentor.name} ({mentor.department}) - {mentor.current_students}/{mentor.max_students} students
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item label="Selected Students">
                        <div>
                            {selectedStudents.length} student(s) selected
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentManagement; 