import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, message, Popconfirm, Typography, Card, Alert, Row, Col, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getToken, storeAuthData } from '../../utils/auth';

const { Title, Text } = Typography;

const MentorManagement = () => {
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingMentor, setEditingMentor] = useState(null);
    const [messageApi, contextHolder] = message.useMessage();
    const [apiStatus, setApiStatus] = useState(null);

    useEffect(() => {
        fetchMentors();
    }, []);

    const fetchMentors = async () => {
        try {
            setLoading(true);
            
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
            
            const response = await axios.get('http://localhost:5000/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Users API response:', response.data);
            
            if (response.data && response.data.users) {
                // Filter only users with mentor role
                const mentorsData = response.data.users
                    .filter(user => user.role === 'mentor')
                    .map(user => {
                        console.log('Processing mentor user:', user);
                        console.log('User ID:', user.id);
                        console.log('User email:', user.email);
                        
                        // Ensure role_info is an object
                        const roleInfo = user.role_info || {};
                        
                        // Debug log role_info
                        console.log(`Mentor ${user.id} role_info:`, JSON.stringify(roleInfo));
                        
                        // Log the mentor ID if it exists in role_info
                        if (roleInfo && roleInfo.id) {
                            console.log(`Mentor profile ID: ${roleInfo.id}`);
                        } else {
                            console.log(`No mentor profile ID found for user ${user.id}`);
                        }
                        
                        return {
                            id: user.id,
                            name: roleInfo.name || 'Unnamed Mentor',
                            email: user.email,
                            department: roleInfo.department || '-',
                            designation: roleInfo.designation || '-',
                            max_students: roleInfo.max_students ? parseInt(roleInfo.max_students) : 5,
                            current_students: roleInfo.current_students || 0,
                            assigned_students: roleInfo.assigned_students || [],
                            role_info: roleInfo,  // Store the original role_info
                            role_info_id: roleInfo.id  // Store the role_info ID if it exists
                        };
                    });
                
                console.log('Processed mentors:', mentorsData);
                setMentors(mentorsData);
                
                if (mentorsData.length === 0) {
                    messageApi.info("No mentors found. You can create test mentors with the 'Create Test Mentors' button.");
                }
            } else {
                console.error('Unexpected API response format:', response.data);
                messageApi.error('Received invalid data format from server');
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Fetch error details:', error);
            let errorMessage = 'Failed to fetch mentors';
            
            if (error.response) {
                errorMessage += `: ${error.response.status} ${error.response.data.message || error.response.data.error || ''}`;
                console.error('Error response:', error.response.data);
            } else if (error.request) {
                errorMessage += ': No response from server';
                console.error('No response received:', error.request);
            } else {
                errorMessage += `: ${error.message}`;
            }
            
            setApiStatus(errorMessage);
            messageApi.error(errorMessage);
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
            
            // Test API connection using users endpoint
            const response = await axios.get('http://localhost:5000/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                // Count mentors in the response
                const mentorCount = response.data.users ? 
                    response.data.users.filter(user => user.role === 'mentor').length : 
                    0;
                    
                setApiStatus(`Connection successful! Found ${mentorCount} users with mentor role.`);
                messageApi.success("API connection successful");
                
                // Update the mentors data
                fetchMentors();
            } else {
                setApiStatus(`Unexpected response: ${response.status}`);
            }
        } catch (error) {
            console.error('API test error:', error);
            let statusMessage = "API connection failed";
            
            if (error.response) {
                console.log("Error response data:", error.response.data);
                if (error.response.status === 401 || error.response.status === 403) {
                    statusMessage = `Authentication error (${error.response.status}). Trying with a new token.`;
                    // Create a new admin token
                    storeAuthData({
                        token: `token:1:admin:session_${Date.now()}`,
                        user_id: 1,
                        role: 'admin'
                    });
                    setApiStatus("Created a new token. Please try testing again.");
                } else {
                    statusMessage = `Server error: ${error.response.status} ${error.response.data.error || ''}`;
                }
            } else if (error.request) {
                statusMessage = "No response from server. Check if backend is running.";
            } else {
                statusMessage = `Error: ${error.message}`;
            }
            
            setApiStatus(statusMessage);
            messageApi.error(statusMessage);
        }
    };

    const createTestMentors = async () => {
        try {
            setApiStatus("Creating test mentors...");
            
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
            
            // Test mentor data
            const testMentors = [
                {
                    email: 'rahul.sharma@example.com',
                    password: 'password123',
                    role: 'mentor',
                    name: 'Dr. Rahul Sharma',
                    department: 'Computer Science',
                    designation: 'Associate Professor',
                    max_students: 8
                },
                {
                    email: 'neha.patel@example.com',
                    password: 'password123',
                    role: 'mentor',
                    name: 'Dr. Neha Patel',
                    department: 'Electronics Engineering',
                    designation: 'Professor',
                    max_students: 10
                },
                {
                    email: 'amit.kumar@example.com',
                    password: 'password123',
                    role: 'mentor',
                    name: 'Dr. Amit Kumar',
                    department: 'Information Technology',
                    designation: 'Assistant Professor',
                    max_students: 6
                }
            ];
            
            // Create mentors one by one
            let createdCount = 0;
            for (const mentorData of testMentors) {
                try {
                    // First check if this email already exists
                    const checkResponse = await axios.get('http://localhost:5000/admin/users', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    const existingUser = checkResponse.data.users.find(u => u.email === mentorData.email);
                    if (existingUser) {
                        console.log(`User with email ${mentorData.email} already exists. Skipping.`);
                        continue;
                    }
                    
                    // Create user with mentor role
                    const createResponse = await axios.post(
                        'http://localhost:5000/admin/create-user',
                        {
                            email: mentorData.email,
                            password: mentorData.password,
                            first_name: mentorData.name.split(' ')[0] || "New",
                            last_name: mentorData.name.split(' ').slice(1).join(' ') || "Mentor",
                            role: mentorData.role,
                            role_info: {
                                name: mentorData.name,
                                department: mentorData.department,
                                designation: mentorData.designation,
                                max_students: mentorData.max_students
                            }
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    
                    if (createResponse.status === 200 || createResponse.status === 201) {
                        createdCount++;
                    }
                } catch (innerError) {
                    console.error(`Error creating mentor ${mentorData.email}:`, innerError);
                    // Continue with next mentor
                }
            }
            
            if (createdCount > 0) {
                setApiStatus(`Successfully created ${createdCount} test mentors`);
                messageApi.success(`Created ${createdCount} test mentors`);
                // Refresh the mentor list
                fetchMentors();
            } else {
                setApiStatus("No new mentors were created. They may already exist.");
                messageApi.info("No new mentors were created. They may already exist.");
            }
        } catch (error) {
            console.error('Create test mentors error:', error);
            let statusMessage = "Failed to create test mentors";
            
            if (error.response) {
                statusMessage = `Error: ${error.response.status} ${error.response.data.error || ''}`;
            } else if (error.request) {
                statusMessage = "No response from server. Check if backend is running.";
            } else {
                statusMessage = `Error: ${error.message}`;
            }
            
            setApiStatus(statusMessage);
            messageApi.error(statusMessage);
        }
    };

    const handleAdd = () => {
        setEditingMentor(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (mentor) => {
        setEditingMentor(mentor);
        form.setFieldsValue({
            name: mentor.name,
            email: mentor.email,
            department: mentor.department,
            designation: mentor.designation,
            max_students: mentor.max_students
        });
        setModalVisible(true);
    };

    const handleDelete = async (mentorId) => {
        try {
            console.log("Deleting mentor with ID:", mentorId);
            
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
            
            // Use the correct delete-user endpoint format with query parameter
            const deleteEndpoint = `http://localhost:5000/admin/delete-user?user_id=${mentorId}`;
            console.log("Using delete endpoint:", deleteEndpoint);
            
            // Setup a timeout for the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            messageApi.loading('Deleting mentor...');
            
            const deleteResponse = await axios.delete(
                deleteEndpoint, 
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                    timeout: 15000 // 15 seconds timeout
                }
            );
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            
            console.log("Delete response:", deleteResponse.data);
            messageApi.success('Mentor deleted successfully');
            
            // Refresh the mentor list
            fetchMentors();
        } catch (error) {
            console.error('Delete error details:', error);
            let errorMessage = 'Failed to delete mentor';
            
            if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. The server might be processing the deletion but not responding in time.';
                // Force a refresh anyway since the deletion might have actually happened
                setTimeout(() => fetchMentors(), 2000);
            } else if (error.response) {
                console.error('Error response status:', error.response.status);
                console.error('Error response data:', error.response.data);
                
                if (error.response.status === 405) {
                    errorMessage = 'Delete endpoint not configured correctly (Method Not Allowed)';
                } else {
                    errorMessage += `: ${error.response.status} ${error.response.data?.message || error.response.data?.error || ''}`;
                }
            } else if (error.request) {
                errorMessage += ': No response from server. The deletion may still have been processed successfully.';
                // Force a refresh anyway since the deletion might have actually happened
                setTimeout(() => fetchMentors(), 2000);
            } else {
                errorMessage += `: ${error.message}`;
            }
            
            messageApi.error(errorMessage);
        }
    };

    const handleSubmit = async (values) => {
        try {
            // Get token or create a default admin token if missing
            let token = getToken('admin');
            
            // If no token found, create a dummy token for development
            if (!token) {
                console.log('Creating default admin token for submit operation');
                storeAuthData({
                    token: 'token:1:admin:default_session',
                    user_id: 1,
                    role: 'admin'
                });
                token = 'token:1:admin:default_session';
            }
            
            if (editingMentor) {
                // Update existing mentor
                console.log("Updating mentor with values:", values);
                console.log("Mentor ID:", editingMentor.id);
                
                // Check if we have role_info or role_info_id to use
                const mentorProfileId = editingMentor.role_info?.id || editingMentor.role_info_id;
                console.log("Mentor profile ID:", mentorProfileId);

                // Create update data structure
                const updateData = {
                    email: values.email,
                    role_info: {
                        name: values.name,
                        department: values.department,
                        designation: values.designation,
                        max_students: parseInt(values.max_students)
                    }
                };
                
                // Only include password if it's provided
                if (values.password) {
                    updateData.password = values.password;
                }
                
                console.log("Sending update with data:", JSON.stringify(updateData));
                
                try {
                    const updateResponse = await axios.put(
                        `http://localhost:5000/admin/users/${editingMentor.id}`,
                        updateData,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    
                    console.log("Update response:", updateResponse.data);
                    messageApi.success('Mentor updated successfully');
                } catch (updateError) {
                    console.error("Error updating mentor:", updateError);
                    console.error("Error response:", updateError.response?.data);
                    messageApi.error('Failed to update mentor: ' + (updateError.response?.data?.message || updateError.message));
                    throw updateError; // Rethrow to be caught by outer catch block
                }
            } else {
                // Create new mentor
                const data = {
                    email: values.email,
                    password: values.password,
                    first_name: values.name.split(' ')[0] || "New",
                    last_name: values.name.split(' ').slice(1).join(' ') || "Mentor",
                    role: 'mentor',
                    role_info: {
                        name: values.name,
                        department: values.department,
                        designation: values.designation,
                        max_students: parseInt(values.max_students)
                    }
                };

                console.log("Creating new mentor with data:", JSON.stringify(data));

                const createResponse = await axios.post(
                    'http://localhost:5000/admin/create-user',
                    data,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                console.log("Create response:", createResponse.data);
                messageApi.success('Mentor created successfully');
            }
            
            setModalVisible(false);
            fetchMentors();
        } catch (error) {
            console.error('Submit error details:', error);
            let errorMessage = 'Failed to save mentor';
            
            if (error.response) {
                errorMessage += `: ${error.response.status} ${error.response.data?.message || error.response.data?.error || ''}`;
                console.error('Error response data:', error.response.data);
            } else if (error.request) {
                errorMessage += ': No response from server';
            } else {
                errorMessage += `: ${error.message}`;
            }
            
            messageApi.error(errorMessage);
        }
    };

    const handleRefresh = () => {
        fetchMentors();
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: text => text || '-'
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: text => text || '-'
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            render: text => text || '-'
        },
        {
            title: 'Designation',
            dataIndex: 'designation',
            key: 'designation',
            render: text => text || '-'
        },
        {
            title: 'Students',
            key: 'students',
            render: (_, record) => (
                <span>{record.current_students} / {record.max_students || '-'}</span>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button 
                        icon={<EditOutlined />} 
                        onClick={() => handleEdit(record)}
                        style={{ 
                            border: '1px solid #d9d9d9', 
                            backgroundColor: '#f0f0f0',
                            color: '#1890ff'
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Are you sure you want to delete this mentor?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button 
                            danger 
                            icon={<DeleteOutlined />}
                            style={{ 
                                border: '1px solid #ff4d4f', 
                                backgroundColor: '#fff1f0',
                                color: '#ff4d4f'
                            }}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="mentor-management">
            {contextHolder}
            <Card>
                <Title level={3}>Mentor Management</Title>
                
                {/* Only show API status for successful operations or if it doesn't contain authentication errors */}
                {apiStatus && 
                 !apiStatus.includes('authentication') && 
                 !apiStatus.includes('token') && 
                 !apiStatus.includes('login') && (
                    <Alert 
                        message="API Status" 
                        description={apiStatus} 
                        type={apiStatus.includes('successful') ? 'success' : 
                              apiStatus.includes('Created') ? 'info' : 'warning'} 
                        showIcon 
                        style={{ marginBottom: 16 }}
                    />
                )}
                
                <Row style={{ marginBottom: 16 }}>
                    <Col span={24}>
                        <Space>
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />} 
                                onClick={handleAdd}
                                style={{ border: '1px solid #1890ff', backgroundColor: '#1890ff' }}
                            >
                                Add Mentor
                            </Button>
                            <Button 
                                icon={<ReloadOutlined />} 
                                onClick={handleRefresh}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                            >
                                Refresh
                            </Button>
                            <Button 
                                icon={<ApiOutlined />} 
                                onClick={testApiConnection}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                            >
                                Test API Connection
                            </Button>
                            <Button 
                                icon={<PlusOutlined />} 
                                onClick={createTestMentors}
                                style={{ 
                                    border: '1px solid #1890ff', 
                                    backgroundColor: '#1890ff',
                                    color: '#fff'
                                }}
                            >
                                Create Test Mentors
                            </Button>
                        </Space>
                    </Col>
                </Row>
                
                <Table
                    columns={columns}
                    dataSource={mentors}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    expandable={{
                        expandedRowRender: record => (
                            <div>
                                <Text strong>Assigned Students:</Text>
                                {record.assigned_students && record.assigned_students.length > 0 ? (
                                    <ul>
                                        {record.assigned_students.map(student => (
                                            <li key={student.id}>
                                                {student.name} ({student.registration_number})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary"> No students assigned</Text>
                                )}
                            </div>
                        ),
                    }}
                />
            </Card>

            <Modal
                title={editingMentor ? "Edit Mentor" : "Add Mentor"}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please input the name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please input the email!' },
                            { type: 'email', message: 'Please enter a valid email!' }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    
                    <Form.Item
                        name="password"
                        label={editingMentor ? "Password (Leave blank to keep unchanged)" : "Password"}
                        rules={[
                            { required: !editingMentor, message: 'Please input the password!' }
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    
                    <Form.Item
                        name="department"
                        label="Department"
                        rules={[{ required: true, message: 'Please input the department!' }]}
                    >
                        <Input />
                    </Form.Item>
                    
                    <Form.Item
                        name="designation"
                        label="Designation"
                    >
                        <Input />
                    </Form.Item>
                    
                    <Form.Item
                        name="max_students"
                        label="Maximum Students"
                        initialValue={5}
                    >
                        <InputNumber min={1} max={20} />
                    </Form.Item>
                    
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" style={{ border: '1px solid #1890ff', backgroundColor: '#1890ff' }}>
                                {editingMentor ? 'Update' : 'Create'}
                            </Button>
                            <Button onClick={() => setModalVisible(false)} style={{ border: '1px solid #d9d9d9' }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MentorManagement; 