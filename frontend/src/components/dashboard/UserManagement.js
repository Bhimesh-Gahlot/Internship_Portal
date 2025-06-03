import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Typography, Card, Alert, Row, Col, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ApiOutlined, KeyOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [editingUser, setEditingUser] = useState(null);
    const [messageApi, contextHolder] = message.useMessage();
    const [apiStatus, setApiStatus] = useState(null);
    const [userPasswords, setUserPasswords] = useState({});
    const [passwordVisibility, setPasswordVisibility] = useState({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUserPassword = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/admin/users/${userId}/password`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data && response.data.password) {
                setUserPasswords(prev => ({
                    ...prev,
                    [userId]: response.data.password
                }));
                
                // Initialize password visibility state
                setPasswordVisibility(prev => ({
                    ...prev,
                    [userId]: false
                }));
                
                return response.data.password;
            }
            return null;
        } catch (error) {
            console.error('Error fetching password:', error);
            messageApi.error('Failed to fetch password: ' + (error.response?.data?.message || error.message));
            return null;
        }
    };

    const togglePasswordVisibility = (userId) => {
        setPasswordVisibility(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Fetched users:', response.data);
            
            const fetchedUsers = response.data.users || [];
            setUsers(fetchedUsers);
            
            // Fetch passwords for all users
            const passwordPromises = fetchedUsers.map(user => fetchUserPassword(user.id));
            await Promise.all(passwordPromises);
            
        } catch (error) {
            console.error('Error fetching users:', error);
            messageApi.error('Failed to fetch users: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const testApiConnection = async () => {
        try {
            setApiStatus("Testing connection...");
            const token = localStorage.getItem('token');
            
            // Check token
            if (!token) {
                setApiStatus("No authentication token found. Please login again.");
                return;
            }
            
            // Check token format
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length !== 3) {
                    setApiStatus("Token format invalid. Please login again.");
                    return;
                }
            } catch (e) {
                setApiStatus("Token parsing error. Please login again.");
                return;
            }
            
            // Test API connection
            const response = await axios.get('http://localhost:5000/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 200) {
                setApiStatus(`Connection successful! Received ${response.data.users ? response.data.users.length : 0} user records.`);
                messageApi.success("API connection successful");
                // Reload users
                if (response.data && Array.isArray(response.data.users)) {
                    setUsers(response.data.users);
                }
            } else {
                setApiStatus(`Unexpected response: ${response.status}`);
            }
        } catch (error) {
            console.error('API test error:', error);
            let statusMessage = "API connection failed";
            
            if (error.response) {
                if (error.response.status === 401 || error.response.status === 403) {
                    statusMessage = `Authentication error (${error.response.status}). Please login again.`;
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

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        form.setFieldsValue({
            email: user.email,
            role: user.role,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            registration_number: user.registration_number || ''
        });
        setModalVisible(true);
    };

    const handleDelete = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            messageApi.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            messageApi.error('Failed to delete user: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleSubmit = async (values) => {
        try {
            const token = localStorage.getItem('token');
            
            if (editingUser) {
                // Update existing user
                const data = {
                    email: values.email,
                    role: values.role,
                    student_info: {}
                };
                
                // Only include password if it was entered
                if (values.password) {
                    data.password = values.password;
                }

                // Include registration number for students
                if (values.role === 'student') {
                    if (!values.registration_number || values.registration_number.trim() === '') {
                        messageApi.error('Registration number is required for student profiles!');
                        return;
                    }
                    data.student_info.registration_number = values.registration_number.trim();
                }

                await axios.put(
                    `http://localhost:5000/admin/users/${editingUser.id}`,
                    data,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                messageApi.success('User updated successfully');
            } else {
                // Create new user
                const data = {
                    email: values.email,
                    password: values.password,
                    first_name: values.first_name,
                    last_name: values.last_name,
                    role: values.role,
                    student_info: {}
                };

                // Add registration number if role is student
                if (values.role === 'student') {
                    if (!values.registration_number || values.registration_number.trim() === '') {
                        messageApi.error('Registration number is required for student profiles!');
                        return;
                    }
                    // Put registration number in student_info object
                    data.student_info.registration_number = values.registration_number.trim();
                }

                console.log("Sending data to create user:", data);

                const response = await axios.post(
                    'http://localhost:5000/admin/create-user',
                    data,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                console.log("User creation response:", response);
                messageApi.success('User created successfully');
            }
            
            setModalVisible(false);
            fetchUsers();
        } catch (error) {
            console.error('Submit error details:', error);
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Error response status:', error.response.status);
                messageApi.error('Failed to save user: ' + (error.response?.data?.message || error.response?.data?.error || error.message));
            } else {
                messageApi.error('Failed to save user: ' + error.message);
            }
        }
    };

    const handleShowPasswordModal = (user) => {
        setEditingUser(user);
        passwordForm.resetFields();
        setPasswordModalVisible(true);
    };

    const handlePasswordReset = async (values) => {
        try {
            const token = localStorage.getItem('token');
            
            await axios.post(
                `http://localhost:5000/admin/reset-password/${editingUser.id}`,
                { new_password: values.new_password },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            messageApi.success('Password reset successfully');
            setPasswordModalVisible(false);
            
            // Refresh the passwords to show the updated one
            fetchUserPassword(editingUser.id);
        } catch (error) {
            console.error('Password reset error:', error);
            messageApi.error('Failed to reset password: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleRefresh = () => {
        fetchUsers();
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return 'red';
            case 'student':
                return 'blue';
            case 'mentor':
                return 'green';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color={role === 'admin' ? 'red' : role === 'mentor' ? 'blue' : 'green'}>{role.toUpperCase()}</Tag>
        },
        {
            title: 'Password',
            key: 'password',
            render: (_, record) => (
                <Space size="small">
                    {userPasswords[record.id] ? (
                        <>
                            <div 
                                style={{ 
                                    width: '150px', 
                                    border: '1px solid #d9d9d9', 
                                    padding: '4px 11px',
                                    borderRadius: '2px',
                                    backgroundColor: '#fff',
                                    fontFamily: 'monospace',
                                    height: '32px',
                                    lineHeight: '24px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {passwordVisibility[record.id] 
                                    ? userPasswords[record.id] 
                                    : '••••••••••••••••'}
                            </div>
                            <Button 
                                icon={passwordVisibility[record.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />} 
                                onClick={() => togglePasswordVisibility(record.id)}
                                style={{ border: '1px solid #d9d9d9' }}
                            />
                        </>
                    ) : (
                        <Button 
                            icon={<KeyOutlined />} 
                            onClick={() => fetchUserPassword(record.id)}
                            style={{ border: '1px solid #d9d9d9', backgroundColor: '#f5f5f5' }}
                        />
                    )}
                    <Button 
                        type="primary" 
                        onClick={() => handleShowPasswordModal(record)}
                        style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                    >
                        Reset
                    </Button>
                </Space>
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
                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Are you sure you want to delete this user?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button 
                            icon={<DeleteOutlined />}
                            style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="user-management">
            {contextHolder}
            <Card>
                <Title level={3}>User Management</Title>
                
                {apiStatus && (
                    <Alert 
                        message="API Status" 
                        description={apiStatus} 
                        type={apiStatus.includes('successful') ? 'success' : 'error'} 
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
                                Add User
                            </Button>
                            <Button 
                                icon={<ReloadOutlined />} 
                                onClick={handleRefresh}
                                style={{ 
                                    border: '1px solid #d9d9d9', 
                                    backgroundColor: '#f5f5f5',
                                    color: '#595959'
                                }}
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
                        </Space>
                    </Col>
                </Row>
                
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingUser ? "Edit User" : "Add User"}
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
                        name="first_name"
                        label="First Name"
                        rules={[{ required: true, message: 'Please input the first name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    
                    <Form.Item
                        name="last_name"
                        label="Last Name"
                        rules={[{ required: true, message: 'Please input the last name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    
                    <Form.Item
                        name="password"
                        label={editingUser ? "Password (Leave blank to keep unchanged)" : "Password"}
                        rules={[
                            { required: !editingUser, message: 'Please input the password!' }
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    
                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role!' }]}
                    >
                        <Select placeholder="Select a role">
                            <Option value="admin">Admin</Option>
                            <Option value="student">Student</Option>
                            <Option value="mentor">Mentor</Option>
                        </Select>
                    </Form.Item>
                    
                    {/* Show registration number field only for students */}
                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}
                    >
                        {({ getFieldValue }) => 
                            getFieldValue('role') === 'student' ? (
                                <Form.Item
                                    name="registration_number"
                                    label="Registration Number"
                                    rules={[{ required: true, message: 'Registration number is required for students!' }]}
                                    extra="This is mandatory for student profiles and must be unique."
                                >
                                    <Input placeholder="Enter unique student registration number" />
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>
                    
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingUser ? 'Update' : 'Create'}
                            </Button>
                            <Button onClick={() => setModalVisible(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Reset Password"
                open={passwordModalVisible}
                onCancel={() => setPasswordModalVisible(false)}
                footer={null}
            >
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordReset}
                >
                    {editingUser && (
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>User: </Text>
                            <Text>{editingUser.email}</Text>
                        </div>
                    )}
                    
                    <Form.Item
                        name="new_password"
                        label="New Password"
                        rules={[
                            { required: true, message: 'Please input the new password!' }
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    
                    <Form.Item
                        name="confirm_password"
                        label="Confirm Password"
                        dependencies={['new_password']}
                        rules={[
                            { required: true, message: 'Please confirm the new password!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('new_password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('The two passwords do not match!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Reset Password
                            </Button>
                            <Button onClick={() => setPasswordModalVisible(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement; 