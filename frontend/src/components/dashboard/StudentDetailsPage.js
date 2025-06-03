import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useLocation } from 'react-router-dom';
import { 
    Card, Tabs, Typography, Button, Descriptions, Tag, Spin, message, 
    Row, Col, Divider, Form, Input, Select, Space, Modal, Table, Progress, InputNumber
} from 'antd';
import { 
    UserOutlined, BookOutlined, TeamOutlined, HistoryOutlined, 
    EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined,
    PlusOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
    LineChartOutlined
} from '@ant-design/icons';
import moment from 'moment';
import ProgressTracker from './ProgressTracker';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const BACKEND_URL = 'http://localhost:5000';

const StudentDetailsPage = () => {
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messageApi, contextHolder] = message.useMessage();
    
    // Dev mode toggle
    const [devMode, setDevMode] = useState(true); // Default to true for easier testing
    
    // Edit states
    const [editingPersonal, setEditingPersonal] = useState(false);
    const [editingInternship, setEditingInternship] = useState(false);
    const [editingParents, setEditingParents] = useState(false);
    const [personalForm] = Form.useForm();
    const [internshipForm] = Form.useForm();
    const [parentsForm] = Form.useForm();
    
    // Add states
    const [addingParent, setAddingParent] = useState(false);
    const [addParentForm] = Form.useForm();
    
    // Progress and feedback
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackForm] = Form.useForm();
    
    // Alumni data
    const [alumniData, setAlumniData] = useState(null);
    
    // Get registration number from URL params or query params for backward compatibility
    const { registrationNumber: paramRegNumber } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const queryRegNumber = queryParams.get('registration_number');
    
    // Use param from URL path if available, otherwise use from query
    const registrationNumber = paramRegNumber || queryRegNumber;
    
    useEffect(() => {
        if (registrationNumber) {
            fetchStudentDetails();
        } else {
            setLoading(false);
            messageApi.error('No registration number provided');
        }
    }, [registrationNumber]);
    
    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            console.log(`Fetching details for student with registration number: ${registrationNumber}`);
            
            // Use the debug endpoint that doesn't require authentication
            const response = await axios.get(`${BACKEND_URL}/mentor/debug/get-student/${registrationNumber}`);
            console.log('Student data response:', response.data);
            
            if (response.data) {
                // Set the student data
                setStudentData(response.data);
                
                // Initialize form values
                personalForm.setFieldsValue({
                    name: response.data.name || '',
                    email: response.data.email || '',
                    registration_number: response.data.registration_number || '',
                    batch: response.data.batch || '',
                    phone: response.data.phone || '',
                    address: response.data.address || '',
                    department: response.data.department || '',
                    section: response.data.section || '',
                    program: response.data.program || '',
                    blood_group: response.data.blood_group || '',
                    hostel_name: response.data.hostel_name || '',
                    hostel_block: response.data.hostel_block || '',
                    hostel_room_no: response.data.hostel_room_no || '',
                });
                
                // If the student has internship data
                if (response.data.internship) {
                    internshipForm.setFieldsValue({
                        name: response.data.internship.name || '',
                        company_name: response.data.internship.company_name || '',
                        internship_type: response.data.internship.internship_type || '',
                        start_date: response.data.internship.start_date || '',
                        end_date: response.data.internship.end_date || '',
                        stipend: response.data.internship.stipend || '',
                        location: response.data.internship.location || '',
                        hr_contact: response.data.internship.hr_contact || '',
                        hr_email: response.data.internship.hr_email || '',
                    });
                }
                
                // Set parent data if available
                if (response.data.parent) {
                    parentsForm.setFieldsValue({
                        // Father details
                        father_name: response.data.parent.father_name || '',
                        father_mobile_no: response.data.parent.father_mobile_no || '',
                        father_email: response.data.parent.father_email || '',
                        father_organization: response.data.parent.father_organization || '',
                        father_designation: response.data.parent.father_designation || '',
                        
                        // Mother details
                        mother_name: response.data.parent.mother_name || '',
                        mother_mobile_no: response.data.parent.mother_mobile_no || '',
                        mother_email: response.data.parent.mother_email || '',
                        mother_organization: response.data.parent.mother_organization || '',
                        mother_designation: response.data.parent.mother_designation || '',
                        
                        // Address
                        communication_address: response.data.parent.communication_address || '',
                        permanent_address: response.data.parent.permanent_address || '',
                        pin_code: response.data.parent.pin_code || '',
                    });
                }
                
                // Set alumni data if available
                if (response.data.alumni_relation) {
                    setAlumniData(response.data.alumni_relation);
                }
            } else {
                messageApi.error('Failed to load student details - empty response');
            }
        } catch (error) {
            console.error('Error fetching student details:', error);
            messageApi.error('Failed to load student: ' + 
                          (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handlePersonalSave = async (values) => {
        try {
            setLoading(true);
            const response = await axios.put(`${BACKEND_URL}/mentor/students/${registrationNumber}`, values);
            
            if (response.data && response.data.message) {
                messageApi.success('Personal details updated successfully');
                setStudentData({...studentData, ...values});
                setEditingPersonal(false);
            } else {
                messageApi.error('Failed to update personal details');
            }
        } catch (error) {
            console.error('Error updating personal details:', error);
            messageApi.error('Failed to update: ' + 
                          (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handleInternshipSave = async (values) => {
        try {
            setLoading(true);
            const response = await axios.put(
                `${BACKEND_URL}/mentor/students/${registrationNumber}/internship`, 
                values
            );
            
            if (response.data && response.data.success) {
                messageApi.success('Internship details updated successfully');
                setStudentData({
                    ...studentData, 
                    internship: {...studentData.internship, ...values}
                });
                setEditingInternship(false);
            } else {
                messageApi.error('Failed to update internship details');
            }
        } catch (error) {
            console.error('Error updating internship details:', error);
            messageApi.error('Failed to update: ' + 
                          (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddParent = async (values) => {
        try {
            setLoading(true);
            const response = await axios.post(
                `${BACKEND_URL}/mentor/students/${registrationNumber}/parents`, 
                values
            );
            
            if (response.data && response.data.success) {
                messageApi.success('Parent added successfully');
                
                // Update student data with new parent
                const updatedParents = [...(studentData.parents || []), response.data.parent];
                setStudentData({...studentData, parents: updatedParents});
                
                setAddingParent(false);
                addParentForm.resetFields();
            } else {
                messageApi.error('Failed to add parent');
            }
        } catch (error) {
            console.error('Error adding parent:', error);
            messageApi.error('Failed to add parent: ' + 
                          (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handleEditParent = async (values, parentId) => {
        try {
            setLoading(true);
            const response = await axios.put(
                `${BACKEND_URL}/mentor/students/${registrationNumber}/parents/${parentId}`, 
                values
            );
            
            if (response.data && response.data.success) {
                messageApi.success('Parent updated successfully');
                
                // Update student data with updated parent
                const updatedParents = studentData.parents.map(parent => 
                    parent.id === parentId ? {...parent, ...values} : parent
                );
                setStudentData({...studentData, parents: updatedParents});
                
                setEditingParents(false);
            } else {
                messageApi.error('Failed to update parent');
            }
        } catch (error) {
            console.error('Error updating parent:', error);
            messageApi.error('Failed to update parent: ' + 
                          (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteParent = async (parentId) => {
        try {
            setLoading(true);
            const response = await axios.delete(
                `${BACKEND_URL}/mentor/students/${registrationNumber}/parents/${parentId}`
            );
            
            if (response.data && response.data.success) {
                messageApi.success('Parent deleted successfully');
                
                // Update student data by removing parent
                const updatedParents = studentData.parents.filter(parent => parent.id !== parentId);
                setStudentData({...studentData, parents: updatedParents});
            } else {
                messageApi.error('Failed to delete parent');
            }
        } catch (error) {
            console.error('Error deleting parent:', error);
            messageApi.error('Failed to delete parent: ' + 
                          (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };
    
    const handleSubmitFeedback = async (values) => {
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
                    await axios.put(`${BACKEND_URL}/mentor/students/${registrationNumber}/progress`, {
                        progress: values.completion_percentage,
                        status: values.completion_percentage >= 100 ? 'completed' : 'In Progress'
                    });
                } catch (progressError) {
                    console.error('Failed to update progress:', progressError);
                    messageApi.warning('Progress update failed, but will continue with feedback submission');
                }
            }
            
            // Submit feedback
            const response = await axios.post(`${BACKEND_URL}/mentor/students/${registrationNumber}/feedback`, feedbackData);
            
            if (response.data && response.data.success) {
                messageApi.success('Feedback submitted successfully');
                feedbackForm.resetFields();
                setShowFeedbackModal(false);
                fetchStudentDetails(); // Refresh student details
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
    
    const renderStatus = (status) => {
        const statusConfig = {
            active: { color: 'green', text: 'Active', icon: <CheckCircleOutlined /> },
            pending: { color: 'orange', text: 'Pending', icon: <ClockCircleOutlined /> },
            completed: { color: 'blue', text: 'Completed', icon: <CheckCircleOutlined /> },
            'In Progress': { color: 'green', text: 'In Progress', icon: <CheckCircleOutlined /> },
            'Not Started': { color: 'orange', text: 'Not Started', icon: <ClockCircleOutlined /> }
        };
        
        const config = statusConfig[status] || statusConfig.pending;
        
        return (
            <Tag color={config.color} icon={config.icon}>
                {config.text}
            </Tag>
        );
    };
    
    // Progress indicator
    const renderProgress = (progress) => {
        let strokeColor = '#1890ff';
        if (progress < 30) strokeColor = '#f5222d';
        else if (progress < 70) strokeColor = '#faad14';
        
        return (
            <Progress 
                percent={progress || 0} 
                size="small" 
                strokeColor={strokeColor}
                style={{ width: 200 }}
            />
        );
    };
    
    if (loading && !studentData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }
    
    if (!studentData) {
        return (
            <div style={{ padding: 24 }}>
                <Title level={3}>Student Not Found</Title>
                <Paragraph>
                    The requested student details could not be loaded. Please go back to the dashboard and try again.
                </Paragraph>
                <Button type="primary" onClick={() => window.close()}>Close Tab</Button>
            </div>
        );
    }
    
    return (
        <div style={{ padding: 24 }}>
            {contextHolder}
            
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3}>{studentData.name} - {studentData.registration_number}</Title>
                <Space>
                    <Button 
                        type="primary"
                        onClick={() => setShowFeedbackModal(true)}
                        icon={<FileTextOutlined />}
                    >
                        Provide Feedback
                    </Button>
                    <Button 
                        type={devMode ? "primary" : "default"}
                        onClick={() => setDevMode(!devMode)}
                        style={{ marginRight: 8 }}
                    >
                        {devMode ? "Dev Mode: ON" : "Dev Mode: OFF"}
                    </Button>
                    <Button onClick={() => window.close()}>Close Tab</Button>
                </Space>
            </div>
            
            <Tabs defaultActiveKey="1">
                <TabPane 
                    tab={<span><UserOutlined /> Personal Information</span>} 
                    key="1"
                >
                    <Card>
                        <div className="flex justify-between mb-4">
                            <div></div>
                            {!editingPersonal && (
                                    <Button 
                                        type="primary"
                                    icon={<EditOutlined />}
                                    onClick={() => setEditingPersonal(true)}
                                >
                                    Edit
                                </Button>
                            )}
                        </div>
                        
                        {editingPersonal ? (
                            <Form
                                form={personalForm}
                                layout="vertical"
                                onFinish={handlePersonalSave}
                            >
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item 
                                            name="name" 
                                            label="Full Name"
                                            rules={[{ required: true, message: 'Please enter the name' }]}
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item 
                                            name="email" 
                                            label="Email"
                                            rules={[{ required: true, message: 'Please enter the email' }]}
                                        >
                                            <Input type="email" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item 
                                            name="registration_number" 
                                            label="Registration Number"
                                            rules={[{ required: true, message: 'Please enter the registration number' }]}
                                        >
                                            <Input disabled />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item 
                                            name="batch" 
                                            label="Batch"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            name="phone"
                                            label="Phone"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item 
                                            name="department"
                                            label="Department"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            name="section"
                                            label="Section"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            name="program"
                                            label="Program"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item
                                            name="blood_group"
                                            label="Blood Group"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item 
                                            name="address" 
                                            label="Address"
                                        >
                                            <Input.TextArea />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item
                                            name="hostel_name"
                                            label="Hostel Name"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            name="hostel_block"
                                            label="Hostel Block"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            name="hostel_room_no"
                                            label="Room Number"
                                        >
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item>
                                    <Space>
                                        <Button type="primary" htmlType="submit" loading={loading}>
                                            Save
                                        </Button>
                                        <Button onClick={() => setEditingPersonal(false)}>
                                            Cancel
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        ) : (
                            <Descriptions bordered column={2}>
                                <Descriptions.Item label="Full Name">{studentData.name}</Descriptions.Item>
                                <Descriptions.Item label="Email">{studentData.email}</Descriptions.Item>
                                <Descriptions.Item label="Registration Number">{studentData.registration_number}</Descriptions.Item>
                                <Descriptions.Item label="Batch">{studentData.batch}</Descriptions.Item>
                                <Descriptions.Item label="Phone">{studentData.phone || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Department">{studentData.department || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Section">{studentData.section || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Program">{studentData.program || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Blood Group">{studentData.blood_group || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Address">{studentData.address || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Hostel Name">{studentData.hostel_name || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Hostel Block">{studentData.hostel_block || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Hostel Room No.">{studentData.hostel_room_no || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Status">{renderStatus(studentData.internship_status || 'Not Started')}</Descriptions.Item>
                                <Descriptions.Item label="Progress" span={2}>
                                    {studentData.progress ? renderProgress(studentData.progress.overall) : renderProgress(0)}
                                </Descriptions.Item>
                            </Descriptions>
                        )}
                    </Card>
                </TabPane>
                
                <TabPane 
                    tab={<span><BookOutlined /> Internship Details</span>} 
                    key="2"
                >
                    <Card>
                        <div className="flex justify-between mb-4">
                            <div></div>
                            {studentData.internship && !editingInternship ? (
                                    <Button 
                                        type="primary"
                                    icon={<EditOutlined />}
                                    onClick={() => setEditingInternship(true)}
                                >
                                    Edit
                                </Button>
                            ) : null}
                        </div>
                        
                        {studentData.internship ? (
                            <>
                                {editingInternship ? (
                                    <Form
                                        form={internshipForm}
                                        layout="vertical"
                                        onFinish={handleInternshipSave}
                                    >
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item 
                                                    name="name"
                                                    label="Internship Name"
                                                    rules={[{ required: true, message: 'Please enter the internship name' }]}
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item 
                                                    name="company_name"
                                                    label="Company Name"
                                                    rules={[{ required: true, message: 'Please enter the company name' }]}
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={8}>
                                                <Form.Item
                                                    name="internship_type"
                                                    label="Internship Type"
                                                >
                                                    <Select>
                                                        <Option value="in-office">In-Office</Option>
                                                        <Option value="remote">Remote</Option>
                                                        <Option value="hybrid">Hybrid</Option>
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item 
                                                    name="start_date" 
                                                    label="Start Date"
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item 
                                                    name="end_date" 
                                                    label="End Date"
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={8}>
                                                <Form.Item
                                                    name="stipend"
                                                    label="Stipend"
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={16}>
                                                <Form.Item
                                                    name="location"
                                                    label="Location"
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item 
                                                    name="hr_contact"
                                                    label="HR Contact"
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item 
                                                    name="hr_email"
                                                    label="HR Email"
                                                >
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Form.Item>
                                            <Space>
                                                <Button type="primary" htmlType="submit" loading={loading}>
                                                    Save
                                                </Button>
                                                <Button onClick={() => setEditingInternship(false)}>
                                                    Cancel
                                                </Button>
                                            </Space>
                                        </Form.Item>
                                    </Form>
                                ) : (
                                    <Descriptions bordered column={2}>
                                        <Descriptions.Item label="Internship Name">{studentData.internship.name || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Company">{studentData.internship.company_name || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Internship Type">{studentData.internship.internship_type || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Location">{studentData.internship.location || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Start Date">
                                            {studentData.internship.start_date ? moment(studentData.internship.start_date).format('YYYY-MM-DD') : 'N/A'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="End Date">
                                            {studentData.internship.end_date ? moment(studentData.internship.end_date).format('YYYY-MM-DD') : 'N/A'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Stipend">{studentData.internship.stipend || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="HR Contact">{studentData.internship.hr_contact || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="HR Email">{studentData.internship.hr_email || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Created At">
                                            {studentData.internship.created_at ? moment(studentData.internship.created_at).format('YYYY-MM-DD') : 'N/A'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Mentor Approval">
                                            {studentData.internship.mentor_approval ? 
                                                <Tag color="green">Approved</Tag> : 
                                                <Tag color="red">Not Approved</Tag>}
                                        </Descriptions.Item>
                                    </Descriptions>
                                )}
                            </>
                        ) :
                            <div>
                                <Paragraph>No internship data available for this student.</Paragraph>
                                <Button 
                                    type="primary" 
                                    onClick={() => setEditingInternship(true)}
                                    icon={<PlusOutlined />}
                                >
                                    Add Internship Details
                                </Button>
                            </div>
                        }
                    </Card>
                </TabPane>
                
                <TabPane 
                    tab={<span><TeamOutlined /> Parents Information</span>} 
                    key="3"
                >
                    <Card>
                        <div className="flex justify-between mb-4">
                            <div></div>
                            {studentData.parent ? (
                                <Button 
                                    type="primary" 
                                    icon={<EditOutlined />} 
                                    onClick={() => setEditingParents(true)}
                                >
                                    Edit
                                </Button>
                            ) : (
                                <Button 
                                    type="primary" 
                                    icon={<PlusOutlined />} 
                                    onClick={() => setAddingParent(true)}
                                >
                                    Add
                                </Button>
                            )}
                        </div>
                        
                        {studentData.parent ? (
                            <div>
                                <Divider orientation="left">Father's Information</Divider>
                                <Descriptions bordered column={2}>
                                    <Descriptions.Item label="Name">{studentData.parent.father_name || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Mobile Number">{studentData.parent.father_mobile_no || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Email">{studentData.parent.father_email || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Occupation Type">
                                        {studentData.parent.father_is_entrepreneur && <Tag color="green">Entrepreneur</Tag>}
                                        {studentData.parent.father_is_family_business && <Tag color="blue">Family Business</Tag>}
                                        {studentData.parent.father_is_public_sector && <Tag color="purple">Public Sector</Tag>}
                                        {studentData.parent.father_is_professional && <Tag color="orange">Professional</Tag>}
                                        {studentData.parent.father_is_govt_employee && <Tag color="cyan">Govt Employee</Tag>}
                                        {studentData.parent.father_is_private_company && <Tag color="magenta">Private Company</Tag>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Organization">{studentData.parent.father_organization || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Designation">{studentData.parent.father_designation || 'N/A'}</Descriptions.Item>
                                </Descriptions>
                                
                                <Divider orientation="left">Mother's Information</Divider>
                                <Descriptions bordered column={2}>
                                    <Descriptions.Item label="Name">{studentData.parent.mother_name || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Mobile Number">{studentData.parent.mother_mobile_no || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Email">{studentData.parent.mother_email || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Occupation Type">
                                        {studentData.parent.mother_is_entrepreneur && <Tag color="green">Entrepreneur</Tag>}
                                        {studentData.parent.mother_is_family_business && <Tag color="blue">Family Business</Tag>}
                                        {studentData.parent.mother_is_public_sector && <Tag color="purple">Public Sector</Tag>}
                                        {studentData.parent.mother_is_professional && <Tag color="orange">Professional</Tag>}
                                        {studentData.parent.mother_is_govt_employee && <Tag color="cyan">Govt Employee</Tag>}
                                        {studentData.parent.mother_is_private_company && <Tag color="magenta">Private Company</Tag>}
                                        {studentData.parent.mother_is_home_maker && <Tag color="gold">Home Maker</Tag>}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Organization">{studentData.parent.mother_organization || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Designation">{studentData.parent.mother_designation || 'N/A'}</Descriptions.Item>
                                </Descriptions>
                                
                                <Divider orientation="left">Address Information</Divider>
                                <Descriptions bordered column={1}>
                                    <Descriptions.Item label="Communication Address">{studentData.parent.communication_address || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Permanent Address">{studentData.parent.permanent_address || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="PIN Code">{studentData.parent.pin_code || 'N/A'}</Descriptions.Item>
                                </Descriptions>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <Text type="secondary">No parent information available</Text>
                            </div>
                        )}
                    </Card>
                </TabPane>
                
                <TabPane 
                    tab={<span><LineChartOutlined /> Progress Tracking</span>} 
                    key="4"
                >
                    <Card title="Progress Overview">
                        {studentData.progress ? (
                            <div>
                                <div className="mb-6">
                                    <Progress 
                                        percent={studentData.progress.overall} 
                                        status="active" 
                                        strokeColor={{
                                            '0%': '#108ee9',
                                            '100%': '#87d068',
                                        }}
                                    />
                                    <div className="text-center">
                                        <Text strong>Overall Progress: {studentData.progress.overall}%</Text>
                                    </div>
                                </div>
                                
                                <Divider orientation="left">Weekly Progress</Divider>
                                <Table 
                                    dataSource={studentData.progress.entries} 
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                >
                                    <Table.Column title="Week" dataIndex="week" key="week" />
                                    <Table.Column title="Phase" dataIndex="phase" key="phase" />
                                    <Table.Column 
                                        title="Completion" 
                                        dataIndex="completion_percentage" 
                                        key="completion" 
                                        render={(text) => `${text}%`}
                                    />
                                    <Table.Column 
                                        title="Status" 
                                        dataIndex="status" 
                                        key="status"
                                        render={(status) => {
                                            let color = 'blue';
                                            if (status === 'Completed') color = 'green';
                                            else if (status === 'Not Started') color = 'volcano';
                                            return <Tag color={color}>{status}</Tag>;
                                        }}
                                    />
                                    <Table.Column 
                                        title="Updated At" 
                                        dataIndex="updated_at" 
                                        key="updated_at"
                                        render={(date) => date ? moment(date).format('YYYY-MM-DD') : 'N/A'}
                                    />
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <Text type="secondary">No progress data available</Text>
                            </div>
                        )}
                    </Card>
                </TabPane>
                
                <TabPane 
                    tab={<span><FileTextOutlined /> Weekly Feedback</span>} 
                    key="5"
                >
                    <Card 
                        title="Mentor Feedback" 
                        extra={
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={() => setShowFeedbackModal(true)}
                            >
                                Add Feedback
                            </Button>
                        }
                    >
                        {studentData.weekly_feedback && studentData.weekly_feedback.length > 0 ? (
                            <Table
                                dataSource={studentData.weekly_feedback} 
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                            >
                                <Table.Column title="Week" dataIndex="week" key="week" />
                                <Table.Column title="Mentor" dataIndex="mentor_name" key="mentor_name" />
                                <Table.Column 
                                    title="Completion" 
                                    dataIndex="completion_percentage" 
                                    key="completion" 
                                    render={(text) => `${text}%`}
                                />
                                <Table.Column 
                                    title="Created At" 
                                    dataIndex="created_at" 
                                    key="created_at"
                                    render={(date) => date ? moment(date).format('YYYY-MM-DD') : 'N/A'}
                                />
                                <Table.Column 
                                    title="Feedback" 
                                    dataIndex="feedback" 
                                    key="feedback"
                                    ellipsis={{ showTitle: false }}
                                    render={(text) => (
                                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
                                            {text}
                                        </Paragraph>
                                    )}
                                />
                            </Table>
                        ) : (
                            <div className="text-center py-10">
                                <Text type="secondary">No feedback available</Text>
                            </div>
                        )}
                    </Card>
                </TabPane>
                
                {studentData.alumni_relation && (
                <TabPane 
                        tab={<span><UserOutlined /> Alumni Relation</span>} 
                        key="6"
                >
                        <Card title="MUJ Alumni Relation">
                        <Descriptions bordered column={2}>
                                <Descriptions.Item label="Alumni Name">{studentData.alumni_relation.alumni_name || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Registration Number">{studentData.alumni_relation.alumni_registration_number || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Branch">{studentData.alumni_relation.alumni_branch || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Program">{studentData.alumni_relation.alumni_program || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Batch">{studentData.alumni_relation.alumni_batch || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Relation">{studentData.alumni_relation.relation_with_student || 'N/A'}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </TabPane>
                )}
                
                <TabPane 
                    tab={<span><HistoryOutlined /> Evaluations</span>} 
                    key="7"
                >
                    <Card title="Student Evaluations">
                        {studentData.evaluations && studentData.evaluations.length > 0 ? (
                            <Table 
                                dataSource={studentData.evaluations} 
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                            >
                                <Table.Column 
                                    title="Evaluation Type" 
                                    dataIndex="evaluation_type_name" 
                                    key="evaluation_type" 
                                />
                                <Table.Column title="Mentor" dataIndex="mentor_name" key="mentor_name" />
                                <Table.Column title="Marks" dataIndex="marks" key="marks" />
                                <Table.Column 
                                    title="Submitted At" 
                                    dataIndex="submitted_at" 
                                    key="submitted_at"
                                    render={(date) => date ? moment(date).format('YYYY-MM-DD') : 'N/A'}
                                />
                                <Table.Column 
                                    title="Feedback" 
                                    dataIndex="feedback" 
                                    key="feedback"
                                    ellipsis={{ showTitle: false }}
                                    render={(text) => (
                                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
                                            {text}
                                        </Paragraph>
                                    )}
                                />
                                <Table.Column 
                                    title="Remarks" 
                                    dataIndex="remarks" 
                                    key="remarks"
                                    ellipsis={{ showTitle: false }}
                                    render={(text) => (
                                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
                                            {text}
                                        </Paragraph>
                                    )}
                                />
                            </Table>
                        ) : (
                            <div className="text-center py-10">
                                <Text type="secondary">No evaluations available</Text>
                            </div>
                        )}
                    </Card>
                </TabPane>
                
                {/* Weekly Reports Tab */}
                <TabPane 
                    tab={<span><FileTextOutlined /> Weekly Reports</span>} 
                    key="8"
                >
                    <Card title="Student Weekly Reports">
                        {studentData.weekly_reports && studentData.weekly_reports.length > 0 ? (
                            <Table 
                                dataSource={studentData.weekly_reports} 
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                            >
                                <Table.Column title="Week" dataIndex="week_number" key="week" />
                                <Table.Column 
                                    title="Created At" 
                                    dataIndex="created_at" 
                                    key="created_at"
                                    render={(date) => date ? moment(date).format('YYYY-MM-DD') : 'N/A'}
                                />
                                <Table.Column 
                                    title="Report Text" 
                                    dataIndex="report_text" 
                                    key="report_text"
                                    ellipsis={{ showTitle: false }}
                                    render={(text) => (
                                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
                                            {text}
                                        </Paragraph>
                                    )}
                                />
                            </Table>
                        ) : (
                            <div className="text-center py-10">
                                <Text type="secondary">No weekly reports available</Text>
                            </div>
                        )}
                    </Card>
                </TabPane>
            </Tabs>
            
            {/* Add Parent Modal */}
            <Modal
                title="Add Parent Information"
                visible={addingParent}
                onCancel={() => setAddingParent(false)}
                footer={null}
                width={800}
            >
                <Form
                    form={addParentForm}
                    layout="vertical"
                    onFinish={handleAddParent}
                >
                    <Divider orientation="left">Father's Information</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                    <Form.Item
                                name="father_name"
                                label="Father's Name"
                                rules={[{ required: true, message: 'Please enter father\'s name' }]}
                            >
                                <Input />
                    </Form.Item>
                        </Col>
                        <Col span={12}>
                    <Form.Item
                                name="father_mobile_no"
                                label="Father's Mobile Number"
                                rules={[{ required: true, message: 'Please enter father\'s mobile number' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="father_email"
                                label="Father's Email"
                            >
                                <Input type="email" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="father_occupation_type"
                                label="Father's Occupation Type"
                            >
                                <Select mode="multiple" placeholder="Select occupation type">
                                    <Option value="entrepreneur">Entrepreneur</Option>
                                    <Option value="family_business">Family Business</Option>
                                    <Option value="public_sector">Public Sector</Option>
                                    <Option value="professional">Professional</Option>
                                    <Option value="govt_employee">Government Employee</Option>
                                    <Option value="private_company">Private Company</Option>
                        </Select>
                    </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="father_organization"
                                label="Father's Organization"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="father_designation"
                                label="Father's Designation"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Divider orientation="left">Mother's Information</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                    <Form.Item
                                name="mother_name"
                                label="Mother's Name"
                                rules={[{ required: true, message: 'Please enter mother\'s name' }]}
                            >
                                <Input />
                    </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="mother_mobile_no"
                                label="Mother's Mobile Number"
                                rules={[{ required: true, message: 'Please enter mother\'s mobile number' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="mother_email"
                                label="Mother's Email"
                            >
                                <Input type="email" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="mother_occupation_type"
                                label="Mother's Occupation Type"
                            >
                                <Select mode="multiple" placeholder="Select occupation type">
                                    <Option value="entrepreneur">Entrepreneur</Option>
                                    <Option value="family_business">Family Business</Option>
                                    <Option value="public_sector">Public Sector</Option>
                                    <Option value="professional">Professional</Option>
                                    <Option value="govt_employee">Government Employee</Option>
                                    <Option value="private_company">Private Company</Option>
                                    <Option value="home_maker">Home Maker</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="mother_organization"
                                label="Mother's Organization"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="mother_designation"
                                label="Mother's Designation"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Divider orientation="left">Address Information</Divider>
                    <Row gutter={16}>
                        <Col span={24}>
                    <Form.Item
                                name="communication_address"
                                label="Communication Address"
                                rules={[{ required: true, message: 'Please enter communication address' }]}
                    >
                                <Input.TextArea rows={3} />
                    </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="permanent_address"
                                label="Permanent Address"
                                rules={[{ required: true, message: 'Please enter permanent address' }]}
                            >
                                <Input.TextArea rows={3} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="pin_code"
                                label="PIN Code"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Add Parent
                            </Button>
                            <Button onClick={() => setAddingParent(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
            
            {/* Edit Parents Modal */}
            <Modal
                title="Edit Parent Information"
                visible={editingParents}
                onCancel={() => setEditingParents(false)}
                footer={null}
                width={800}
            >
                <Form
                    form={parentsForm}
                    layout="vertical"
                    onFinish={(values) => {
                        handleEditParent(values, studentData.parent.id);
                    }}
                >
                    <Divider orientation="left">Father's Information</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                    <Form.Item
                                name="father_name"
                                label="Father's Name"
                                rules={[{ required: true, message: 'Please enter father\'s name' }]}
                            >
                                <Input />
                    </Form.Item>
                        </Col>
                        <Col span={12}>
                    <Form.Item
                                name="father_mobile_no"
                                label="Father's Mobile Number"
                                rules={[{ required: true, message: 'Please enter father\'s mobile number' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="father_email"
                                label="Father's Email"
                            >
                                <Input type="email" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="father_occupation_type"
                                label="Father's Occupation Type"
                            >
                                <Select mode="multiple" placeholder="Select occupation type">
                                    <Option value="entrepreneur">Entrepreneur</Option>
                                    <Option value="family_business">Family Business</Option>
                                    <Option value="public_sector">Public Sector</Option>
                                    <Option value="professional">Professional</Option>
                                    <Option value="govt_employee">Government Employee</Option>
                                    <Option value="private_company">Private Company</Option>
                        </Select>
                    </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="father_organization"
                                label="Father's Organization"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="father_designation"
                                label="Father's Designation"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Divider orientation="left">Mother's Information</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                    <Form.Item
                                name="mother_name"
                                label="Mother's Name"
                                rules={[{ required: true, message: 'Please enter mother\'s name' }]}
                            >
                                <Input />
                    </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="mother_mobile_no"
                                label="Mother's Mobile Number"
                                rules={[{ required: true, message: 'Please enter mother\'s mobile number' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="mother_email"
                                label="Mother's Email"
                            >
                                <Input type="email" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="mother_occupation_type"
                                label="Mother's Occupation Type"
                            >
                                <Select mode="multiple" placeholder="Select occupation type">
                                    <Option value="entrepreneur">Entrepreneur</Option>
                                    <Option value="family_business">Family Business</Option>
                                    <Option value="public_sector">Public Sector</Option>
                                    <Option value="professional">Professional</Option>
                                    <Option value="govt_employee">Government Employee</Option>
                                    <Option value="private_company">Private Company</Option>
                                    <Option value="home_maker">Home Maker</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="mother_organization"
                                label="Mother's Organization"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="mother_designation"
                                label="Mother's Designation"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Divider orientation="left">Address Information</Divider>
                    <Row gutter={16}>
                        <Col span={24}>
                    <Form.Item
                                name="communication_address"
                                label="Communication Address"
                                rules={[{ required: true, message: 'Please enter communication address' }]}
                    >
                                <Input.TextArea rows={3} />
                    </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="permanent_address"
                                label="Permanent Address"
                                rules={[{ required: true, message: 'Please enter permanent address' }]}
                            >
                                <Input.TextArea rows={3} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="pin_code"
                                label="PIN Code"
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Update Parent
                            </Button>
                            <Button onClick={() => setEditingParents(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Feedback Modal */}
            <Modal
                title="Provide Feedback"
                visible={showFeedbackModal}
                onCancel={() => setShowFeedbackModal(false)}
                footer={null}
            >
                <Form
                    form={feedbackForm}
                    layout="vertical"
                    onFinish={handleSubmitFeedback}
                    initialValues={{
                        week: 1,
                        completion_percentage: studentData.internship ? 
                            studentData.internship.progress || 0 : 0,
                        updateProgress: true
                    }}
                >
                    <Form.Item
                        name="week"
                        label="Week"
                        rules={[{ required: true, message: 'Please select the week' }]}
                    >
                        <Select>
                            {[...Array(12)].map((_, i) => (
                                <Option key={i + 1} value={i + 1}>Week {i + 1}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="completion_percentage"
                        label="Completion Percentage"
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
                        name="updateProgress"
                        label="Update Student Progress"
                        valuePropName="checked"
                    >
                        <Select>
                            <Option value={true}>Yes, update student progress</Option>
                            <Option value={false}>No, just provide feedback</Option>
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="feedback"
                        label="Feedback"
                        rules={[{ required: true, message: 'Please enter your feedback' }]}
                    >
                        <TextArea 
                            rows={6} 
                            placeholder="Provide detailed feedback on student's performance"
                        />
                    </Form.Item>
                    
                    <Form.Item>
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={loading}
                                icon={<SaveOutlined />}
                            >
                                Submit Feedback
                            </Button>
                            <Button 
                                onClick={() => setShowFeedbackModal(false)}
                                icon={<CloseOutlined />}
                            >
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentDetailsPage; 