import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Tag, Card, Row, Col, Alert, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined, ScanOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

// API URL constant
const BACKEND_URL = 'http://localhost:5000';

// Helper function to safely serialize data and check for circular references
const safeAxiosPost = async (url, data) => {
    try {
        // Check for circular references by attempting to serialize the data
        JSON.stringify(data);
        
        // If we get here, serialization was successful, proceed with the request
        return await axios.post(url, data);
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
            console.error('Circular reference detected in data:', error.message);
            console.error('Data that caused the issue:', data);
            
            // Create a clean simple object with only string values
            const cleanData = {};
            for (const key in data) {
                if (typeof data[key] === 'string' || typeof data[key] === 'number' || typeof data[key] === 'boolean') {
                    cleanData[key] = data[key];
                } else if (data[key] === null) {
                    cleanData[key] = null;
                } else if (typeof data[key] === 'object') {
                    cleanData[key] = JSON.parse(JSON.stringify(data[key]));
                }
            }
            
            console.log('Using cleaned data instead:', cleanData);
            return await axios.post(url, cleanData);
        }
        throw error;
    }
};

const safeAxiosPut = async (url, data) => {
    try {
        // Check for circular references by attempting to serialize the data
        JSON.stringify(data);
        
        // If we get here, serialization was successful, proceed with the request
        return await axios.put(url, data);
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
            console.error('Circular reference detected in data:', error.message);
            console.error('Data that caused the issue:', data);
            
            // Create a clean simple object with only string values
            const cleanData = {};
            for (const key in data) {
                if (typeof data[key] === 'string' || typeof data[key] === 'number' || typeof data[key] === 'boolean') {
                    cleanData[key] = data[key];
                } else if (data[key] === null) {
                    cleanData[key] = null;
                } else if (typeof data[key] === 'object') {
                    cleanData[key] = JSON.parse(JSON.stringify(data[key]));
                }
            }
            
            console.log('Using cleaned data instead:', cleanData);
            return await axios.put(url, cleanData);
        }
        throw error;
    }
};

const MentorStudentManagement = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [apiStatus, setApiStatus] = useState("");
    const [orphanedUsers, setOrphanedUsers] = useState([]);
    const [orphanModalVisible, setOrphanModalVisible] = useState(false);
    const [fixModalVisible, setFixModalVisible] = useState(false);
    const [selectedOrphan, setSelectedOrphan] = useState(null);
    const [orphanForm] = Form.useForm();
    const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
    const [editStudentModalVisible, setEditStudentModalVisible] = useState(false);

    // Fetch students
    const fetchStudents = async () => {
        try {
            setLoading(true);
            
            // Try the mentor students endpoint
            try {
                const response = await axios.get(`${BACKEND_URL}/mentor/students`);
                
                console.log('Mentor API response:', response.data);
                
                if (response.data && response.data.students) {
                    const studentsData = response.data.students;
                    
                    // Process the data to ensure consistent format
                    const processedStudents = studentsData.map(student => ({
                        id: student.id,
                        user_id: student.user_id,
                        name: student.name || 'Unknown',
                        email: student.email || '',
                        registration_number: student.registration_number || '',
                        batch: student.batch || '',
                        internship_status: student.internship_status || 'Not Started',
                        progress: student.internship ? student.internship.progress || 0 : 0
                    }));
                    
                    setStudents(processedStudents);
                    setApiStatus(`Successfully loaded ${processedStudents.length} students from mentor API`);
                    return;
                }
            } catch (apiError) {
                console.error('Failed to fetch from mentor API:', apiError);
                // Fall back to development endpoint
            }
            
            // Fall back to the development endpoint if main endpoint fails
            const response = await axios.get(`${BACKEND_URL}/mentor/students`);
            
            console.log('Mentor student management - API response:', response.data);
            
            if (response.data && (response.data.students || Array.isArray(response.data))) {
                const studentsData = response.data.students || response.data;
                
                // Process the data to ensure consistent format
                const processedStudents = studentsData.map(student => ({
                    id: student.id,
                    user_id: student.user_id,
                    name: student.name || 'Unknown',
                    email: student.email || '',
                    registration_number: student.registration_number || '',
                    batch: student.batch || '',
                    internship_status: student.internship_status || 
                                      (student.internship ? 'In Progress' : 'Not Started'),
                    progress: student.internship ? student.internship.progress || 0 : 0
                }));
                
                setStudents(processedStudents);
                setApiStatus(`Successfully loaded ${processedStudents.length} students`);
            } else {
                console.warn('Invalid or empty response from API');
                setStudents([]);
                setApiStatus('No students found or invalid response format');
            }
        } catch (error) {
            console.error('Failed to fetch students:', error);
            messageApi.error('Failed to load students: ' + 
                           (error.response?.data?.message || error.message));
            setApiStatus('Error: Failed to fetch students');
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    // Update student progress
    const updateStudentProgress = async (studentId, progressData) => {
        try {
            setLoading(true);
            
            const response = await axios.put(`${BACKEND_URL}/mentor/students/${studentId}/progress`, progressData);
            
            if (response.data && response.data.success) {
                messageApi.success('Progress updated successfully');
                // Refresh the student list to show updated progress
                fetchStudents();
            } else {
                messageApi.warning('Failed to update progress');
            }
        } catch (error) {
            console.error('Failed to update progress:', error);
            messageApi.error('Failed to update progress: ' + 
                           (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Add feedback for a student
    const addStudentFeedback = async (studentId, feedbackData) => {
        try {
            setLoading(true);
            
            const response = await axios.post(`${BACKEND_URL}/mentor/students/${studentId}/feedback`, feedbackData);
            
            if (response.data && response.data.success) {
                messageApi.success('Feedback submitted successfully');
                // Refresh the student list
                fetchStudents();
            } else {
                messageApi.warning('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            messageApi.error('Failed to submit feedback: ' + 
                           (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // Create or update a student
    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            messageApi.info("Starting student creation process...");
            
            // Create data object with both separate and combined name fields
            const studentData = {
                first_name: values.first_name || "",
                last_name: values.last_name || "",
                name: `${values.first_name || ""} ${values.last_name || ""}`.trim(),
                email: values.email || "",
                registration_number: values.registration_number || "",
                batch: values.batch || ""
            };
            
            // Add password only if provided and creating a new student
            if (!editingStudent && values.password) {
                studentData.password = values.password;
            }
            
            console.log("Student data to submit:", JSON.stringify(studentData));
            
            if (editingStudent) {
                // Update existing student
                await safeAxiosPut(`http://localhost:5000/mentor/students/${editingStudent.id}`, studentData);
                messageApi.success("Student updated successfully");
            } else {
                // Create new student - using the direct endpoint
                try {
                    console.log("Using direct student creation endpoint");
                    
                    // Use our new direct endpoint that bypasses blueprints
                    const response = await axios.post('http://localhost:5000/direct-create-student', studentData);
                    console.log("Student creation response:", response.data);
                    messageApi.success("Student created successfully!");
                    
                    // If a password was generated, show it to the mentor
                    if (response.data && response.data.student && response.data.student.password) {
                        messageApi.success(
                            `Student created with password: ${response.data.student.password}. Please share with the student.`,
                            10
                        );
                    } else {
                        // Always show the default password
                        messageApi.success(
                            "Student created with default password: test@123. Please share with the student.",
                            10
                        );
                    }
                } catch (error) {
                    console.error('Student creation failed:', error);
                    if (error.response) {
                        console.error('Error response data:', error.response.data);
                        messageApi.error(`Failed to create student: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
                    } else if (error.request) {
                        console.error('Error request:', error.request);
                        messageApi.error('No response from server. Check your connection and try again.');
                    } else {
                        console.error('Error:', error.message);
                        messageApi.error(`Error: ${error.message}`);
                    }
                    return; // Exit early to prevent form reset
                }
            }
            
            setModalVisible(false);
            setAddStudentModalVisible(false);
            setEditStudentModalVisible(false);
            fetchStudents();
            form.resetFields();
        } catch (error) {
            console.error('Operation failed:', error);
            messageApi.error('Operation failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Delete a student
    const handleDelete = async (studentId) => {
        try {
            setLoading(true);
            await axios.delete(`http://localhost:5000/mentor/students/${studentId}`);
            messageApi.success("Student deleted successfully");
            fetchStudents();
        } catch (error) {
            console.error('Delete failed:', error);
            messageApi.error('Delete failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Scan for orphaned users
    const scanForOrphanedUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/mentor/debug/orphaned-users');
            const orphanedData = response.data.orphaned_users || [];
            setOrphanedUsers(orphanedData);
            
            if (orphanedData.length > 0) {
                setOrphanModalVisible(true);
                setApiStatus(`Found ${orphanedData.length} orphaned users`);
            } else {
                messageApi.info("No orphaned users found.");
            }
        } catch (error) {
            console.error('Scan failed:', error);
            messageApi.error('Failed to scan for orphaned users');
        } finally {
            setLoading(false);
        }
    };

    // Fix an orphaned user
    const fixOrphanedUser = async (values) => {
        try {
            if (!selectedOrphan) {
                messageApi.error("No orphaned user selected");
                return;
            }
            
            setLoading(true);
            
            // Create a clean data object with only the fields we need
            const userData = {
                first_name: values.first_name || "",
                last_name: values.last_name || "",
                registration_number: values.registration_number || "",
                batch: values.batch || ""
            };
            
            await safeAxiosPost(
                `http://localhost:5000/mentor/debug/fix-orphaned-user/${selectedOrphan.id}`,
                userData
            );
            
            messageApi.success("Orphaned user fixed successfully");
            setFixModalVisible(false);
            setOrphanModalVisible(false);
            orphanForm.resetFields();
            fetchStudents();
        } catch (error) {
            console.error('Fix failed:', error);
            messageApi.error('Failed to fix orphaned user: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Table columns
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: text => text || 'N/A',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: text => text || 'N/A',
        },
        {
            title: 'Registration No.',
            dataIndex: 'registration_number',
            key: 'registration_number',
            render: text => text || 'N/A',
        },
        {
            title: 'Batch',
            dataIndex: 'batch',
            key: 'batch',
            render: text => text || 'N/A',
        },
        {
            title: 'Internship Status',
            dataIndex: 'internship_status',
            key: 'internship_status',
            render: text => (
                <Tag color={
                    text === 'Not Started' ? 'red' : 
                    text === 'In Progress' ? 'blue' :
                    text === 'Completed' ? 'green' : 'default'
                }>
                    {text || 'Not Started'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (text, record) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingStudent(record);
                            form.setFieldsValue({
                                first_name: record.name.split(' ')[0],
                                last_name: record.name.split(' ')[1] || '',
                                email: record.email,
                                registration_number: record.registration_number,
                                batch: record.batch,
                                internship_status: record.internship_status
                            });
                            setEditStudentModalVisible(true);
                        }}
                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                    >
                        Edit
                    </Button>
                    <Button
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id)}
                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                    >
                        Delete
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="mentor-student-management" style={{ padding: '20px' }}>
            {contextHolder}
            
            <Card
                title="Student Management"
                extra={
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <Button 
                                type="primary" 
                                onClick={() => setAddStudentModalVisible(true)}
                                icon={<UserAddOutlined />}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
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
                        </div>
                        <div>
                            <Button
                                onClick={scanForOrphanedUsers}
                                icon={<ScanOutlined />}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                            >
                                Scan for Orphaned Users
                            </Button>
                        </div>
                    </div>
                }
            >
                <Table
                    columns={columns}
                    dataSource={students}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />

                {/* Add/Edit Student Modal */}
                <Modal
                    title="Add Student"
                    open={addStudentModalVisible}
                    onCancel={() => setAddStudentModalVisible(false)}
                    footer={null}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{}}
                    >
                        <Form.Item
                            name="first_name"
                            label="First Name"
                            rules={[{ required: true, message: 'Please enter first name' }]}
                        >
                            <Input placeholder="Enter first name" />
                        </Form.Item>

                        <Form.Item
                            name="last_name"
                            label="Last Name"
                            rules={[{ required: true, message: 'Please enter last name' }]}
                        >
                            <Input placeholder="Enter last name" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: 'Please enter email' },
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input placeholder="Enter email" />
                        </Form.Item>

                        <Form.Item
                            name="registration_number"
                            label="Registration Number"
                            rules={[{ required: true, message: 'Please enter registration number' }]}
                        >
                            <Input placeholder="Enter registration number" />
                        </Form.Item>

                        <Form.Item
                            name="batch"
                            label="Batch"
                            rules={[{ required: true, message: 'Please enter batch' }]}
                        >
                            <Input placeholder="Enter batch (e.g. 2023-24)" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Password"
                            help="Leave empty to auto-generate a password"
                        >
                            <Input.Password placeholder="Enter password or leave empty for auto-generated" />
                        </Form.Item>
                        
                        <Form.Item>
                            <Space>
                                <Button 
                                    key="submit" 
                                    type="primary" 
                                    htmlType="submit"
                                    loading={loading}
                                    style={{backgroundColor: '#1890ff', borderColor: '#1890ff'}}
                                >
                                    Save
                                </Button>
                                <Button
                                    key="back"
                                    onClick={() => setAddStudentModalVisible(false)}
                                >
                                    Cancel
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Edit Student Modal */}
                <Modal
                    title="Edit Student"
                    open={editStudentModalVisible}
                    onCancel={() => setEditStudentModalVisible(false)}
                    footer={null}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={editingStudent || {}}
                    >
                        <Form.Item
                            name="first_name"
                            label="First Name"
                            rules={[{ required: true, message: 'Please enter first name' }]}
                        >
                            <Input placeholder="Enter first name" />
                        </Form.Item>

                        <Form.Item
                            name="last_name"
                            label="Last Name"
                            rules={[{ required: true, message: 'Please enter last name' }]}
                        >
                            <Input placeholder="Enter last name" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: 'Please enter email' },
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input placeholder="Enter email" />
                        </Form.Item>

                        <Form.Item
                            name="registration_number"
                            label="Registration Number"
                            rules={[{ required: true, message: 'Please enter registration number' }]}
                        >
                            <Input placeholder="Enter registration number" />
                        </Form.Item>

                        <Form.Item
                            name="batch"
                            label="Batch"
                            rules={[{ required: true, message: 'Please enter batch' }]}
                        >
                            <Input placeholder="Enter batch (e.g. 2023-24)" />
                        </Form.Item>
                        
                        <Form.Item>
                            <Space>
                                <Button 
                                    key="submit" 
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    style={{backgroundColor: '#1890ff', borderColor: '#1890ff'}}
                                >
                                    Update
                                </Button>
                                <Button
                                    key="back"
                                    onClick={() => setEditStudentModalVisible(false)}
                                >
                                    Cancel
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Orphaned Users Modal */}
                <Modal
                    title="Orphaned Users"
                    open={orphanModalVisible}
                    onCancel={() => setOrphanModalVisible(false)}
                    footer={[
                        <Button key="back" onClick={() => setOrphanModalVisible(false)}>
                            Close
                        </Button>,
                        selectedOrphan && (
                            <Button 
                                key="fix" 
                                type="primary" 
                                loading={loading} 
                                onClick={() => {
                                    setFixModalVisible(true);
                                }}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                            >
                                Fix Selected User
                            </Button>
                        ),
                    ]}
                    width={800}
                >
                    <p>
                        These users have student accounts but no student profile. Click "Fix" to create a student profile.
                    </p>
                    <Table
                        columns={[
                            {
                                title: 'Email',
                                dataIndex: 'email',
                                key: 'email',
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                render: (_, record) => (
                                    <Button 
                                        type="primary" 
                                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                        onClick={() => {
                                            setSelectedOrphan(record);
                                            setFixModalVisible(true);
                                        }}
                                    >
                                        Fix
                                    </Button>
                                ),
                            },
                        ]}
                        dataSource={orphanedUsers}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                    />
                </Modal>

                {/* Fix Orphaned User Modal */}
                <Modal
                    title="Fix Orphaned User"
                    open={fixModalVisible}
                    onCancel={() => setFixModalVisible(false)}
                    footer={null}
                >
                    {selectedOrphan && (
                        <div>
                            <p>Creating student profile for: <strong>{selectedOrphan.email}</strong></p>
                            <Form
                                form={orphanForm}
                                layout="vertical"
                                onFinish={fixOrphanedUser}
                            >
                                <Form.Item
                                    name="first_name"
                                    label="First Name"
                                    rules={[{ required: true, message: 'Please enter first name' }]}
                                >
                                    <Input placeholder="Enter first name" />
                                </Form.Item>

                                <Form.Item
                                    name="last_name"
                                    label="Last Name"
                                    rules={[{ required: true, message: 'Please enter last name' }]}
                                >
                                    <Input placeholder="Enter last name" />
                                </Form.Item>

                                <Form.Item
                                    name="registration_number"
                                    label="Registration Number"
                                    rules={[{ required: true, message: 'Please enter registration number' }]}
                                >
                                    <Input placeholder="Enter registration number" />
                                </Form.Item>

                                <Form.Item
                                    name="batch"
                                    label="Batch"
                                    rules={[{ required: true, message: 'Please enter batch' }]}
                                >
                                    <Input placeholder="Enter batch (e.g. 2023-24)" />
                                </Form.Item>
                                
                                <Form.Item>
                                    <Space>
                                        <Button
                                            key="submit"
                                            type="primary"
                                            htmlType="submit"
                                            loading={loading}
                                            style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                        >
                                            Fix User
                                        </Button>
                                        <Button 
                                            key="cancel" 
                                            onClick={() => setFixModalVisible(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </div>
                    )}
                </Modal>
            </Card>
        </div>
    );
};

export default MentorStudentManagement; 