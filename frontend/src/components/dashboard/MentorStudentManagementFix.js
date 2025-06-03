import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Card, Space } from 'antd';
import { EditOutlined, DeleteOutlined, UserAddOutlined, ScanOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import AddStudentHelper from './AddStudentHelper';

/**
 * A fixed version of MentorStudentManagement that avoids circular references
 * by using a separate AddStudentHelper component
 */
const MentorStudentManagementFix = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [addStudentVisible, setAddStudentVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editForm] = Form.useForm();

    // Fetch students on component mount
    useEffect(() => {
        fetchStudents();
    }, []);

    // Fetch students from the API
    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/mentor/students');
            
            if (response.data && Array.isArray(response.data)) {
                const processedStudents = response.data.map(student => ({
                    id: student.id,
                    user_id: student.user_id,
                    name: student.name || 'Unknown',
                    email: student.email || '',
                    registration_number: student.registration_number || '',
                    batch: student.batch || '',
                    internship_status: student.internship_status || 'Not Started'
                }));
                
                setStudents(processedStudents);
            } else {
                console.warn('Invalid response format from API');
                setStudents([]);
            }
        } catch (error) {
            console.error('Failed to fetch students:', error);
            messageApi.error('Failed to load students: ' + 
                (error.response?.data?.message || error.message));
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle student deletion
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

    // Handle student editing
    const handleEditSubmit = async (values) => {
        try {
            setLoading(true);
            
            // Create a clean data object
            const studentData = {
                name: values.name || "",
                email: values.email || "",
                registration_number: values.registration_number || "",
                batch: values.batch || ""
            };
            
            await axios.put(
                `http://localhost:5000/mentor/students/${editingStudent.id}`, 
                studentData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            messageApi.success("Student updated successfully");
            setEditModalVisible(false);
            fetchStudents();
            editForm.resetFields();
        } catch (error) {
            console.error('Update failed:', error);
            messageApi.error('Update failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Table columns definition
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
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingStudent(record);
                            editForm.setFieldsValue({
                                name: record.name,
                                email: record.email,
                                registration_number: record.registration_number,
                                batch: record.batch
                            });
                            setEditModalVisible(true);
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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <Button 
                                type="primary" 
                                onClick={() => setAddStudentVisible(true)}
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

                {/* Add Student Modal - Using our helper component */}
                <AddStudentHelper 
                    visible={addStudentVisible}
                    onClose={() => setAddStudentVisible(false)}
                    onSuccess={fetchStudents}
                />

                {/* Edit Student Modal */}
                <Modal
                    title="Edit Student"
                    open={editModalVisible}
                    onCancel={() => setEditModalVisible(false)}
                    footer={null}
                >
                    <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleEditSubmit}
                        initialValues={editingStudent || {}}
                    >
                        <Form.Item
                            name="name"
                            label="Name"
                            rules={[{ required: true, message: 'Please enter student name' }]}
                        >
                            <Input placeholder="Enter student name" />
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
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                >
                                    Update
                                </Button>
                                <Button
                                    onClick={() => setEditModalVisible(false)}
                                >
                                    Cancel
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </Card>
        </div>
    );
};

export default MentorStudentManagementFix; 