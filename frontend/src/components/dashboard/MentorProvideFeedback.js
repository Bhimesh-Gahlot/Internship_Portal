import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Input, Button, Select, InputNumber, Card, message, Alert, Space, Typography, Divider } from 'antd';
import { SendOutlined, SaveOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// API URLs
const BACKEND_URL = 'http://localhost:5000';

const MentorProvideFeedback = ({ studentId, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [messageApi, contextHolder] = message.useMessage();

    // Fetch student details
    useEffect(() => {
        if (studentId) {
            fetchStudentDetails();
        }
    }, [studentId]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BACKEND_URL}/mentor/students/${studentId}`);
            
            if (response.data && response.data.student) {
                setStudentData(response.data.student);
            } else {
                messageApi.error('Failed to load student details');
            }
        } catch (error) {
            console.error('Error fetching student details:', error);
            messageApi.error('Failed to load student: ' + 
                           (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Submit feedback
    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            
            // Create feedback data object
            const feedbackData = {
                feedback: values.feedback,
                week: values.week,
                completion_percentage: values.completion_percentage
            };
            
            // Update progress if needed
            if (values.updateProgress) {
                try {
                    await axios.put(`${BACKEND_URL}/mentor/students/${studentId}/progress`, {
                        progress: values.completion_percentage,
                        status: values.completion_percentage >= 100 ? 'completed' : 'In Progress'
                    });
                } catch (progressError) {
                    console.error('Failed to update progress:', progressError);
                    messageApi.warning('Progress update failed, but will continue with feedback submission');
                }
            }
            
            // Submit feedback
            const response = await axios.post(`${BACKEND_URL}/mentor/students/${studentId}/feedback`, feedbackData);
            
            if (response.data && response.data.success) {
                messageApi.success('Feedback submitted successfully');
                form.resetFields();
                if (onSuccess) onSuccess();
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

    return (
        <Card title="Provide Student Feedback" loading={loading && !studentData}>
            {contextHolder}
            
            {studentData && (
                <div style={{ marginBottom: 16 }}>
                    <Text strong>Student: </Text>
                    <Text>{studentData.name}</Text>
                    <br />
                    <Text strong>Registration Number: </Text>
                    <Text>{studentData.registration_number}</Text>
                </div>
            )}
            
            <Divider />
            
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    week: 1,
                    completion_percentage: 0,
                    updateProgress: true
                }}
            >
                <Form.Item
                    label="Week"
                    name="week"
                    rules={[{ required: true, message: 'Please select the week' }]}
                >
                    <Select>
                        {[...Array(12)].map((_, i) => (
                            <Option key={i + 1} value={i + 1}>Week {i + 1}</Option>
                        ))}
                    </Select>
                </Form.Item>
                
                <Form.Item
                    label="Completion Percentage"
                    name="completion_percentage"
                    rules={[{ required: true, message: 'Please enter completion percentage' }]}
                >
                    <InputNumber 
                        min={0} 
                        max={100} 
                        style={{ width: '100%' }}
                        formatter={value => `${value}%`}
                        parser={value => value.replace('%', '')}
                    />
                </Form.Item>
                
                <Form.Item
                    label="Update Student Progress"
                    name="updateProgress"
                    valuePropName="checked"
                >
                    <Select>
                        <Option value={true}>Yes, update student progress</Option>
                        <Option value={false}>No, just provide feedback</Option>
                    </Select>
                </Form.Item>
                
                <Form.Item
                    label="Feedback"
                    name="feedback"
                    rules={[{ required: true, message: 'Please enter your feedback' }]}
                >
                    <TextArea 
                        rows={6} 
                        placeholder="Provide detailed feedback on student's performance"
                    />
                </Form.Item>
                
                <Form.Item>
                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={loading}
                        icon={<SendOutlined />}
                    >
                        Submit Feedback
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default MentorProvideFeedback; 