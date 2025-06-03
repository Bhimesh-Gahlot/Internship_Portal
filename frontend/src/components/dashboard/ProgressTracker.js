import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Card, Form, Input, Button, Slider, Select, Divider, Progress, 
    Typography, message, Tabs, List, Tag, Space, InputNumber, Modal 
} from 'antd';
import { 
    CheckCircleOutlined, 
    ClockCircleOutlined, 
    SendOutlined,
    FileTextOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const BACKEND_URL = 'http://localhost:5000';

const ProgressTracker = ({ registrationNumber, refreshData, devMode = false }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [progressData, setProgressData] = useState(null);
    const [feedbackHistory, setFeedbackHistory] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [activeTab, setActiveTab] = useState('1');
    const [messageApi, contextHolder] = message.useMessage();
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [progressForm] = Form.useForm();
    const [feedbackForm] = Form.useForm();

    // Fetch progress data on component mount
    useEffect(() => {
        fetchProgressData();
        fetchFeedbackHistory();
        fetchEvaluations();
    }, [registrationNumber]);

    // Fetch student progress data
    const fetchProgressData = async () => {
        try {
            setLoading(true);
            // Use dev endpoint if in dev mode
            const endpoint = devMode 
                ? `${BACKEND_URL}/dev/student/${registrationNumber}/progress`
                : `${BACKEND_URL}/mentor/student/${registrationNumber}/progress`;
                
            const response = await axios.get(endpoint);
            
            if (response.data) {
                setProgressData(response.data);
                console.log('Progress data:', response.data);
            }
        } catch (error) {
            console.error('Error fetching progress data:', error);
            messageApi.error('Failed to load progress data');
        } finally {
            setLoading(false);
        }
    };

    // Fetch feedback history
    const fetchFeedbackHistory = async () => {
        try {
            // Use dev endpoint if in dev mode
            const endpoint = devMode 
                ? `${BACKEND_URL}/dev/student/${registrationNumber}/weekly-feedback`
                : `${BACKEND_URL}/mentor/student/${registrationNumber}/weekly-feedback`;
                
            const response = await axios.get(endpoint);
            
            if (response.data && response.data.feedback) {
                setFeedbackHistory(response.data.feedback);
                console.log('Feedback history:', response.data.feedback);
            }
        } catch (error) {
            console.error('Error fetching feedback history:', error);
        }
    };

    // Fetch evaluations
    const fetchEvaluations = async () => {
        try {
            // Use dev endpoint if in dev mode
            const endpoint = devMode 
                ? `${BACKEND_URL}/dev/student/${registrationNumber}/evaluations`
                : `${BACKEND_URL}/mentor/evaluations/${registrationNumber}`;
            
            const response = await axios.get(endpoint);
            
            if (response.data && response.data.evaluations) {
                setEvaluations(response.data.evaluations);
                console.log('Evaluations:', response.data.evaluations);
            }
        } catch (error) {
            console.error('Error fetching evaluations:', error);
        }
    };

    // Handle progress update
    const handleProgressUpdate = async (values) => {
        try {
            setSubmitting(true);
            
            const progressData = {
                registration_number: registrationNumber,
                phase: values.phase,
                week: values.week,
                completion_percentage: values.completion_percentage,
                status: values.status
            };
            
            console.log('Submitting progress update:', progressData);
            
            // Use dev endpoint if in dev mode
            const endpoint = devMode 
                ? `${BACKEND_URL}/dev/student/${registrationNumber}/progress`
                : `${BACKEND_URL}/mentor/student/${registrationNumber}/progress`;
                
            const response = await axios.post(endpoint, progressData);
            
            if (response.data && response.data.message) {
                messageApi.success('Progress updated successfully');
                progressForm.resetFields();
                fetchProgressData();
                
                // Call parent refresh if provided
                if (refreshData) refreshData();
            }
        } catch (error) {
            console.error('Error updating progress:', error);
            messageApi.error('Failed to update progress: ' + 
                          (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    // Handle feedback submission
    const handleSubmitFeedback = async (values) => {
        try {
            setSubmitting(true);
            
            const feedbackData = {
                registration_number: registrationNumber,
                week: values.week,
                performance_rating: values.performance_rating,
                feedback: values.feedback,
                areas_of_improvement: values.areas_of_improvement,
                strengths: values.strengths,
                completion_percentage: values.completion_percentage || 0
            };
            
            console.log('Submitting feedback:', feedbackData);
            
            // Use dev endpoint if in dev mode
            const endpoint = devMode 
                ? `${BACKEND_URL}/dev/feedback/${registrationNumber}`
                : `${BACKEND_URL}/mentor/feedback/${registrationNumber}`;
                
            const response = await axios.post(endpoint, feedbackData);
            
            if (response.data && response.data.message) {
                messageApi.success('Feedback submitted successfully');
                feedbackForm.resetFields();
                setShowFeedbackModal(false);
                fetchFeedbackHistory();
                
                // Call parent refresh if provided
                if (refreshData) refreshData();
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            messageApi.error('Failed to submit feedback: ' + 
                          (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    // Handle evaluation submission
    const handleSubmitEvaluation = async (values) => {
        try {
            setSubmitting(true);
            
            const evaluationData = {
                registration_number: registrationNumber,
                evaluation_type: values.evaluation_type,
                marks: values.marks,
                feedback: values.feedback,
                remarks: values.remarks
            };
            
            console.log('Submitting evaluation:', evaluationData);
            
            // Use dev endpoint if in dev mode
            const endpoint = devMode 
                ? `${BACKEND_URL}/dev/evaluate/${registrationNumber}`
                : `${BACKEND_URL}/mentor/evaluate/${registrationNumber}`;
                
            const response = await axios.post(endpoint, evaluationData);
            
            if (response.data && response.data.message) {
                messageApi.success('Evaluation submitted successfully');
                fetchEvaluations();
                
                // Call parent refresh if provided
                if (refreshData) refreshData();
            }
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            messageApi.error('Failed to submit evaluation: ' + 
                          (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    // Render progress status badge
    const renderStatus = (status) => {
        const statusConfig = {
            'Completed': { color: 'green', text: 'Completed', icon: <CheckCircleOutlined /> },
            'In Progress': { color: 'blue', text: 'In Progress', icon: <ClockCircleOutlined /> },
            'Not Started': { color: 'orange', text: 'Not Started', icon: <ClockCircleOutlined /> },
            'Delayed': { color: 'red', text: 'Delayed', icon: <ClockCircleOutlined /> }
        };
        
        const config = statusConfig[status] || statusConfig['Not Started'];
        
        return (
            <Tag color={config.color} icon={config.icon}>
                {config.text}
            </Tag>
        );
    };

    return (
        <div className="progress-tracker">
            {contextHolder}
            
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Progress Overview" key="1">
                    <Card loading={loading} title="Current Progress">
                        {progressData ? (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                                    <Progress 
                                        type="circle" 
                                        percent={progressData.progress?.overall || 0} 
                                        width={120}
                                        format={percent => `${percent}%`}
                                    />
                                    <div style={{ marginLeft: 20 }}>
                                        <Title level={4}>Overall Internship Progress</Title>
                                        <Paragraph>
                                            Tracking progress across all phases of the internship
                                        </Paragraph>
                                    </div>
                                </div>
                                
                                <Divider />
                                
                                <Title level={4}>Progress by Phase</Title>
                                
                                {progressData.progress?.entries?.map((entry, index) => (
                                    <div key={index} style={{ marginBottom: 15 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text strong>{`Phase: ${entry.phase} - Week ${entry.week}`}</Text>
                                            {renderStatus(entry.status)}
                                        </div>
                                        <Progress 
                                            percent={entry.completion_percentage} 
                                            strokeColor={entry.status === 'Completed' ? '#52c41a' : 
                                                       entry.status === 'In Progress' ? '#1890ff' : 
                                                       entry.status === 'Delayed' ? '#f5222d' : '#faad14'}
                                            status={entry.status === 'Completed' ? 'success' : 'active'}
                                        />
                                        <Text type="secondary">
                                            Updated: {moment(entry.updated_at).format('MMMM Do YYYY, h:mm a')}
                                        </Text>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Text>No progress data available</Text>
                        )}
                    </Card>
                    
                    <Divider />
                    
                    <Card title="Update Progress">
                        <Form
                            form={progressForm}
                            layout="vertical"
                            onFinish={handleProgressUpdate}
                        >
                            <Form.Item
                                name="phase"
                                label="Phase"
                                rules={[{ required: true, message: 'Please select the phase' }]}
                            >
                                <Select placeholder="Select phase">
                                    <Option value="Orientation">Orientation</Option>
                                    <Option value="Requirements Analysis">Requirements Analysis</Option>
                                    <Option value="Design">Design</Option>
                                    <Option value="Implementation">Implementation</Option>
                                    <Option value="Testing">Testing</Option>
                                    <Option value="Deployment">Deployment</Option>
                                    <Option value="Documentation">Documentation</Option>
                                </Select>
                            </Form.Item>
                            
                            <Form.Item
                                name="week"
                                label="Week"
                                rules={[{ required: true, message: 'Please enter the week number' }]}
                            >
                                <InputNumber min={1} max={16} style={{ width: '100%' }} />
                            </Form.Item>
                            
                            <Form.Item
                                name="completion_percentage"
                                label="Completion Percentage"
                                rules={[{ required: true, message: 'Please specify completion percentage' }]}
                            >
                                <Slider
                                    marks={{
                                        0: '0%',
                                        25: '25%',
                                        50: '50%',
                                        75: '75%',
                                        100: '100%'
                                    }}
                                />
                            </Form.Item>
                            
                            <Form.Item
                                name="status"
                                label="Status"
                                rules={[{ required: true, message: 'Please select the status' }]}
                            >
                                <Select placeholder="Select status">
                                    <Option value="Not Started">Not Started</Option>
                                    <Option value="In Progress">In Progress</Option>
                                    <Option value="Completed">Completed</Option>
                                    <Option value="Delayed">Delayed</Option>
                                </Select>
                            </Form.Item>
                            
                            <Form.Item>
                                <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    loading={submitting}
                                    icon={<CheckCircleOutlined />}
                                >
                                    Update Progress
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </TabPane>
                
                <TabPane tab="Feedback" key="2">
                    <Card 
                        title="Weekly Feedback" 
                        extra={
                            <Button 
                                type="primary" 
                                icon={<SendOutlined />}
                                onClick={() => setShowFeedbackModal(true)}
                            >
                                Provide Feedback
                            </Button>
                        }
                    >
                        {feedbackHistory.length > 0 ? (
                            <List
                                itemLayout="vertical"
                                dataSource={feedbackHistory}
                                renderItem={item => (
                                    <List.Item
                                        key={item.id}
                                        extra={
                                            <div>
                                                <Tag color="blue">Week {item.week}</Tag>
                                                <Tag color="green">Rating: {item.performance_rating}/5</Tag>
                                            </div>
                                        }
                                    >
                                        <List.Item.Meta
                                            title={`Feedback from ${moment(item.created_at).format('MMMM Do YYYY')}`}
                                            description={
                                                <Text type="secondary">
                                                    Provided by: {item.mentor_name || 'Mentor'}
                                                </Text>
                                            }
                                        />
                                        
                                        <Paragraph style={{ marginTop: 10 }}>
                                            {item.feedback}
                                        </Paragraph>
                                        
                                        {item.strengths && (
                                            <div style={{ marginTop: 10 }}>
                                                <Text strong>Strengths:</Text>
                                                <Paragraph>{item.strengths}</Paragraph>
                                            </div>
                                        )}
                                        
                                        {item.areas_of_improvement && (
                                            <div style={{ marginTop: 10 }}>
                                                <Text strong>Areas of Improvement:</Text>
                                                <Paragraph>{item.areas_of_improvement}</Paragraph>
                                            </div>
                                        )}
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Text>No feedback history available</Text>
                        )}
                    </Card>
                </TabPane>
                
                <TabPane tab="Evaluations" key="3">
                    <Card 
                        title="Student Evaluations" 
                        extra={
                            <Button 
                                type="primary" 
                                icon={<FileTextOutlined />}
                                onClick={() => setActiveTab('4')}
                            >
                                New Evaluation
                            </Button>
                        }
                    >
                        {evaluations.length > 0 ? (
                            <List
                                itemLayout="vertical"
                                dataSource={evaluations}
                                renderItem={evaluation => (
                                    <List.Item
                                        key={evaluation.id}
                                        extra={
                                            <div>
                                                <Tag color="blue">{evaluation.evaluation_type}</Tag>
                                                <Progress 
                                                    type="circle" 
                                                    percent={Math.round(evaluation.marks)} 
                                                    width={60}
                                                    format={percent => `${percent}%`}
                                                />
                                            </div>
                                        }
                                    >
                                        <List.Item.Meta
                                            title={`Evaluation: ${evaluation.evaluation_type}`}
                                            description={
                                                <Text type="secondary">
                                                    Date: {moment(evaluation.submitted_at).format('MMMM Do YYYY')}
                                                </Text>
                                            }
                                        />
                                        
                                        <Paragraph style={{ marginTop: 10 }}>
                                            <Text strong>Feedback:</Text> {evaluation.feedback}
                                        </Paragraph>
                                        
                                        {evaluation.remarks && (
                                            <Paragraph>
                                                <Text strong>Remarks:</Text> {evaluation.remarks}
                                            </Paragraph>
                                        )}
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Text>No evaluations available</Text>
                        )}
                    </Card>
                </TabPane>
                
                <TabPane tab="New Evaluation" key="4">
                    <Card title="Submit New Evaluation">
                        <Form
                            layout="vertical"
                            onFinish={handleSubmitEvaluation}
                        >
                            <Form.Item
                                name="evaluation_type"
                                label="Evaluation Type"
                                rules={[{ required: true, message: 'Please select evaluation type' }]}
                            >
                                <Select placeholder="Select evaluation type">
                                    <Option value="Weekly">Weekly Progress</Option>
                                    <Option value="Synopsis">Synopsis</Option>
                                    <Option value="Mid-Term">Mid-Term</Option>
                                    <Option value="Final">Final</Option>
                                    <Option value="Report">Report</Option>
                                </Select>
                            </Form.Item>
                            
                            <Form.Item
                                name="marks"
                                label="Marks (out of 100)"
                                rules={[{ required: true, message: 'Please enter marks' }]}
                            >
                                <InputNumber min={0} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                            
                            <Form.Item
                                name="feedback"
                                label="Feedback"
                                rules={[{ required: true, message: 'Please provide feedback' }]}
                            >
                                <TextArea rows={4} placeholder="Provide detailed feedback" />
                            </Form.Item>
                            
                            <Form.Item
                                name="remarks"
                                label="Remarks (Optional)"
                            >
                                <TextArea rows={2} placeholder="Additional remarks or notes" />
                            </Form.Item>
                            
                            <Form.Item>
                                <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    loading={submitting}
                                    icon={<FileTextOutlined />}
                                >
                                    Submit Evaluation
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </TabPane>
            </Tabs>
            
            {/* Feedback Modal */}
            <Modal
                title="Provide Weekly Feedback"
                visible={showFeedbackModal}
                onCancel={() => setShowFeedbackModal(false)}
                footer={null}
                width={700}
            >
                <Form
                    form={feedbackForm}
                    layout="vertical"
                    onFinish={handleSubmitFeedback}
                >
                    <Form.Item
                        name="week"
                        label="Week"
                        rules={[{ required: true, message: 'Please select the week' }]}
                    >
                        <Select placeholder="Select week">
                            {[...Array(16)].map((_, i) => (
                                <Option key={i + 1} value={i + 1}>Week {i + 1}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="performance_rating"
                        label="Performance Rating (1-5)"
                        rules={[{ required: true, message: 'Please rate the performance' }]}
                    >
                        <InputNumber min={1} max={5} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item
                        name="feedback"
                        label="Feedback"
                        rules={[{ required: true, message: 'Please provide feedback' }]}
                    >
                        <TextArea 
                            rows={4} 
                            placeholder="Provide detailed feedback about the student's performance this week"
                        />
                    </Form.Item>
                    
                    <Form.Item
                        name="strengths"
                        label="Strengths"
                    >
                        <TextArea 
                            rows={2} 
                            placeholder="What did the student do well this week?"
                        />
                    </Form.Item>
                    
                    <Form.Item
                        name="areas_of_improvement"
                        label="Areas of Improvement"
                    >
                        <TextArea 
                            rows={2} 
                            placeholder="What could the student improve on?"
                        />
                    </Form.Item>
                    
                    <Form.Item>
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={submitting}
                                icon={<SendOutlined />}
                            >
                                Submit Feedback
                            </Button>
                            <Button onClick={() => setShowFeedbackModal(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProgressTracker; 