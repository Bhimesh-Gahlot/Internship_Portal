import React, { useState } from 'react';
import { Form, Input, Button, message, Modal, Space } from 'antd';
import axios from 'axios';

// Simple component to add a student without any circular reference issues
const AddStudentHelper = ({ visible, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            
            // Create a simple, clean data object
            const studentData = {
                name: values.name || "",
                email: values.email || "",
                registration_number: values.registration_number || "",
                batch: values.batch || "",
                password: values.password || ""
            };
            
            console.log("Submitting data:", studentData);
            
            // Use a plain axios post with a simple object
            const response = await axios.post(
                'http://localhost:5000/mentor/students', 
                studentData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            messageApi.success("Student created successfully");
            
            // Show generated password if available
            if (response.data && response.data.student && response.data.student.password) {
                messageApi.success(
                    `Student created with password: ${response.data.student.password}. Please share with the student.`,
                    10
                );
            }
            
            form.resetFields();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating student:', error);
            let errorMessage = 'An unexpected error occurred';
            
            if (error.response && error.response.data) {
                errorMessage = error.response.data.message || error.response.data.error || 'Failed to create student';
            } else if (error.request) {
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                errorMessage = error.message;
            }
            
            messageApi.error(`Failed to create student: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {contextHolder}
            <Modal
                title="Add New Student"
                open={visible}
                onCancel={onClose}
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
                                type="primary" 
                                htmlType="submit" 
                                loading={loading}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                            >
                                Create Student
                            </Button>
                            <Button onClick={onClose}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default AddStudentHelper; 