import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Form, Input, Select, InputNumber, Progress, Tag, Typography, Collapse, Timeline, message, Space, Upload, Modal, Spin, Empty, Row, Col, Statistic } from 'antd';
import { FileOutlined, CommentOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, UploadOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const MentorProgressTracking = ({ selectedStudent }) => {
    const [loading, setLoading] = useState(false);
    const [weeklyReports, setWeeklyReports] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [progressData, setProgressData] = useState([]);
    const [evaluationForm] = Form.useForm();
    const [feedbackForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState('1');
    const [evaluationModalVisible, setEvaluationModalVisible] = useState(false);
    const [evaluationType, setEvaluationType] = useState('weekly');
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        if (selectedStudent && selectedStudent.id) {
            fetchStudentData();
        }
    }, [selectedStudent]);

    const fetchStudentData = async () => {
        if (!selectedStudent) return;
        
        setLoading(true);
        try {
            // Fetch weekly reports
            const reportsResponse = await axios.get(`http://localhost:5000/mentor/student/${selectedStudent.id}/reports`);
            setWeeklyReports(reportsResponse.data.reports || []);
            
            // Fetch evaluations
            const evaluationsResponse = await axios.get(`http://localhost:5000/mentor/evaluations/${selectedStudent.id}`);
            setEvaluations(evaluationsResponse.data.evaluations || []);
            
            // Fetch progress data
            const progressResponse = await axios.get(`http://localhost:5000/mentor/student/${selectedStudent.id}/progress`);
            if (progressResponse.data && progressResponse.data.progress_data) {
                setProgressData(progressResponse.data.progress_data);
            } else {
                // If no progress data, initialize with default structure
                generateDefaultProgressData();
            }
            
            // Fetch weekly feedback
            const feedbackResponse = await axios.get(`http://localhost:5000/mentor/student/${selectedStudent.id}/weekly-feedback`);
            // We'll use this data in weekly feedback display
            console.log("Weekly feedback:", feedbackResponse.data.weekly_feedback);
        } catch (error) {
            console.error('Error fetching student data:', error);
            messageApi.error('Failed to fetch student data');
            // If API calls fail, initialize with default data
            generateDefaultProgressData();
        } finally {
            setLoading(false);
        }
    };

    const generateDefaultProgressData = () => {
        // Default progress data structure
        const progress = [
            { week: 1, phase: 'Orientation', completion: 0, status: 'not-started' },
            { week: 2, phase: 'Project Setup', completion: 0, status: 'not-started' },
            { week: 3, phase: 'Implementation - Phase 1', completion: 0, status: 'not-started' },
            { week: 4, phase: 'Implementation - Phase 2', completion: 0, status: 'not-started' },
            { week: 5, phase: 'Testing', completion: 0, status: 'not-started' },
            { week: 6, phase: 'Documentation', completion: 0, status: 'not-started' },
            { week: 7, phase: 'Presentation', completion: 0, status: 'not-started' },
            { week: 8, phase: 'Final Evaluation', completion: 0, status: 'not-started' },
        ];
        
        setProgressData(progress);
    };

    const handleEvaluationSubmit = async (values) => {
        try {
            setLoading(true);
            
            // Add student info to the evaluation
            const evaluationData = {
                ...values,
                student_id: selectedStudent.id,
                type: evaluationType === 'report' ? values.type : 'weekly',
                report_id: selectedReportId
            };
            
            const response = await axios.post(
                `http://localhost:5000/mentor/evaluate/${selectedStudent.user_id || selectedStudent.id}`,
                evaluationData
            );
            
            messageApi.success('Evaluation submitted successfully');
            setEvaluationModalVisible(false);
            evaluationForm.resetFields();
            
            // Refresh data
            fetchStudentData();
        } catch (error) {
            console.error('Evaluation submission error:', error);
            messageApi.error('Failed to submit evaluation: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleWeeklyFeedback = async (values) => {
        try {
            setLoading(true);
            
            const feedbackData = {
                ...values,
                student_id: selectedStudent.id,
                week: parseInt(values.week)
            };
            
            await axios.post(
                `http://localhost:5000/mentor/feedback/${selectedStudent.id}`,
                feedbackData
            );
            
            messageApi.success('Weekly feedback submitted successfully');
            feedbackForm.resetFields();
            
            // Refresh data
            fetchStudentData();
        } catch (error) {
            console.error('Feedback submission error:', error);
            messageApi.error('Failed to submit feedback: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleProgressUpdate = async (record, newPercentage, newStatus) => {
        try {
            if (!selectedStudent || !selectedStudent.id) {
                messageApi.error('No student selected');
                return;
            }

            if (newPercentage === undefined || newPercentage < 0 || newPercentage > 100) {
                messageApi.error('Invalid completion percentage');
                return;
            }
            
            setLoading(true);
            
            const updatedStatus = newStatus || (newPercentage === 100 ? 'completed' : newPercentage > 0 ? 'in-progress' : 'not-started');
            
            const progressData = {
                phase: record.phase,
                week: record.week,
                completion_percentage: newPercentage,
                status: updatedStatus,
                student_id: selectedStudent.id
            };
            
            await axios.post(
                `http://localhost:5000/mentor/student/${selectedStudent.id}/progress`,
                progressData
            );
            
            // Update local state to avoid a full refetch
            setProgressData(prevData => 
                prevData.map(item => 
                    item.week === record.week ? 
                    {...item, completion_percentage: newPercentage, status: updatedStatus} : 
                    item
                )
            );
            
            messageApi.success('Progress updated successfully');
        } catch (error) {
            console.error('Progress update error:', error);
            messageApi.error('Failed to update progress: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const openEvaluationModal = (type, reportId = null) => {
        setEvaluationType(type);
        setSelectedReportId(reportId);
        evaluationForm.resetFields();
        setEvaluationModalVisible(true);
    };

    const renderStatusTag = (status) => {
        const statusMap = {
            'completed': { icon: <CheckCircleOutlined />, color: 'success', text: 'Completed' },
            'in-progress': { icon: <SyncOutlined spin />, color: 'processing', text: 'In Progress' },
            'not-started': { icon: <ClockCircleOutlined />, color: 'default', text: 'Not Started' }
        };

        const currentStatus = statusMap[status] || { icon: null, color: 'default', text: status };
        
        return (
            <Tag 
                icon={currentStatus.icon} 
                color={currentStatus.color}
                style={{ cursor: 'pointer' }}
            >
                {currentStatus.text}
            </Tag>
        );
    };

    const progressColumns = [
        {
            title: 'Week',
            dataIndex: 'week',
            key: 'week',
        },
        {
            title: 'Phase',
            dataIndex: 'phase',
            key: 'phase',
        },
        {
            title: 'Progress',
            dataIndex: 'completion_percentage',
            key: 'progress',
            render: (completion_percentage, record) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Progress 
                        percent={completion_percentage || 0} 
                        size="small"
                        status={
                            record.status === 'completed' ? 'success' :
                            record.status === 'in-progress' ? 'active' : 'normal'
                        }
                        style={{ 
                            cursor: 'pointer', 
                            width: '80%' 
                        }}
                        onClick={() => {
                            Modal.confirm({
                                title: `Update progress for Week ${record.week}: ${record.phase}`,
                                content: (
                                    <div>
                                        <p>Current completion: {completion_percentage || 0}%</p>
                                        <InputNumber
                                            min={0}
                                            max={100}
                                            defaultValue={completion_percentage || 0}
                                            onChange={(value) => record.tempProgress = value}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                ),
                                onOk: () => handleProgressUpdate(
                                    record, 
                                    record.tempProgress !== undefined ? record.tempProgress : completion_percentage || 0
                                ),
                                okText: 'Update',
                                cancelText: 'Cancel',
                            });
                        }}
                    />
                    <Text style={{ marginLeft: 10 }}>{completion_percentage || 0}%</Text>
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => (
                <div
                    onClick={() => {
                        const statusOptions = [
                            { value: 'not-started', label: 'Not Started' },
                            { value: 'in-progress', label: 'In Progress' },
                            { value: 'completed', label: 'Completed' }
                        ];
                        
                        Modal.confirm({
                            title: `Update status for Week ${record.week}: ${record.phase}`,
                            content: (
                                <div>
                                    <p>Current status: {status}</p>
                                    <Select
                                        defaultValue={status}
                                        style={{ width: '100%' }}
                                        onChange={(value) => record.tempStatus = value}
                                    >
                                        {statusOptions.map(option => (
                                            <Option key={option.value} value={option.value}>
                                                {option.label}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                            ),
                            onOk: () => {
                                const newStatus = record.tempStatus || status;
                                // If status changed to completed, set completion to 100%
                                const newCompletion = newStatus === 'completed' ? 100 : 
                                                      newStatus === 'not-started' ? 0 : 
                                                      record.completion_percentage || 0;
                                handleProgressUpdate(record, newCompletion, newStatus);
                            },
                            okText: 'Update',
                            cancelText: 'Cancel',
                        });
                    }}
                >
                    {renderStatusTag(status)}
                </div>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button 
                        icon={<CommentOutlined />} 
                        onClick={() => {
                            feedbackForm.setFieldsValue({
                                week: record.week,
                                completion_percentage: record.completion_percentage || 0
                            });
                            document.getElementById('weekly-feedback-form').scrollIntoView({ behavior: 'smooth' });
                        }}
                        type="primary"
                        size="small"
                    >
                        Provide Feedback
                    </Button>
                </Space>
            ),
        },
    ];

    const reportsColumns = [
        {
            title: 'Type',
            dataIndex: 'report_type',
            key: 'report_type',
            render: (type) => <Tag color={type === 'MTE' ? 'blue' : 'green'}>{type}</Tag>,
        },
        {
            title: 'Submission Date',
            dataIndex: 'submission_date',
            key: 'submission_date',
            render: (date) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Status',
            dataIndex: 'marks',
            key: 'status',
            render: (marks) => marks ? 
                <Tag color="success">Evaluated</Tag> : 
                <Tag color="warning">Pending Evaluation</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button 
                        icon={<DownloadOutlined />} 
                        href={record.report_file_path}
                        size="small"
                    >
                        Download Report
                    </Button>
                    <Button 
                        icon={<DownloadOutlined />} 
                        href={record.presentation_file_path}
                        size="small"
                    >
                        Download Presentation
                    </Button>
                    {!record.marks && (
                        <Button 
                            icon={<EditOutlined />} 
                            onClick={() => openEvaluationModal('report', record.id)}
                            type="primary"
                            size="small"
                        >
                            Evaluate
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const evaluationsColumns = [
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                let color = 'default';
                if (type === 'mte') color = 'blue';
                if (type === 'ete') color = 'green';
                if (type === 'synopsis') color = 'purple';
                if (type === 'weekly') color = 'cyan';
                
                return <Tag color={color}>{type.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Marks',
            dataIndex: 'marks',
            key: 'marks',
            render: (marks) => marks ? `${marks}/100` : 'N/A',
        },
        {
            title: 'Feedback',
            dataIndex: 'feedback',
            key: 'feedback',
            ellipsis: true,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button 
                    onClick={() => showEvaluationDetails(record)}
                    size="small"
                    icon={<FileOutlined />}
                >
                    View Details
                </Button>
            ),
        },
    ];

    const showEvaluationDetails = (evaluation) => {
        Modal.info({
            title: `${evaluation.type.toUpperCase()} Evaluation`,
            content: (
                <div>
                    <p><strong>Date:</strong> {new Date(evaluation.date).toLocaleDateString()}</p>
                    <p><strong>Marks:</strong> {evaluation.marks}/100</p>
                    <Paragraph>
                        <strong>Feedback:</strong>
                        <br />
                        {evaluation.feedback}
                    </Paragraph>
                    {evaluation.remarks && (
                        <Paragraph>
                            <strong>Remarks:</strong>
                            <br />
                            {evaluation.remarks}
                        </Paragraph>
                    )}
                </div>
            ),
            width: 600,
        });
    };

    const renderWeeklyReportForm = () => (
        <Card title="Provide Weekly Feedback" style={{ marginTop: 16 }} id="weekly-feedback-form">
            <Form
                form={feedbackForm}
                layout="vertical"
                onFinish={handleWeeklyFeedback}
            >
                <Form.Item
                    name="week"
                    label="Week"
                    rules={[{ required: true, message: 'Please select the week' }]}
                >
                    <Select>
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(week => (
                            <Option key={week} value={week}>Week {week}</Option>
                        ))}
                    </Select>
                </Form.Item>
                
                <Form.Item
                    name="feedback"
                    label="Feedback"
                    rules={[{ required: true, message: 'Please provide feedback' }]}
                >
                    <TextArea rows={4} />
                </Form.Item>
                
                <Form.Item
                    name="completion_percentage"
                    label="Completion Percentage"
                    rules={[{ required: true, message: 'Please input completion percentage' }]}
                >
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
                
                <Form.Item>
                    <Button 
                        type="primary" 
                        htmlType="submit"
                        loading={loading}
                    >
                        Submit Feedback
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );

    if (!selectedStudent) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">Select a student to view progress tracking</Text>
                </div>
            </Card>
        );
    }

    return (
        <Spin spinning={loading}>
            {contextHolder}
            <Card>
                <Title level={4}>Progress Tracking for {selectedStudent.name}</Title>
                <Text type="secondary">Registration: {selectedStudent.registration_number} | Email: {selectedStudent.email}</Text>
                
                <Tabs defaultActiveKey="1" onChange={setActiveTab} style={{ marginTop: 16 }}>
                    <TabPane tab="Progress Overview" key="1">
                        <Card title="Internship Progress" style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 20 }}>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Statistic
                                            title="Overall Completion"
                                            value={progressData.length > 0 
                                                ? Math.round(progressData.reduce((sum, item) => sum + (item.completion_percentage || 0), 0) / progressData.length) 
                                                : 0}
                                            suffix="%"
                                            valueStyle={{ color: '#3f8600' }}
                                        />
                                        <Progress 
                                            percent={progressData.length > 0 
                                                ? Math.round(progressData.reduce((sum, item) => sum + (item.completion_percentage || 0), 0) / progressData.length) 
                                                : 0} 
                                            status="active" 
                                            style={{ marginTop: 8 }}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic
                                            title="Completed Phases"
                                            value={progressData.filter(item => item.status === 'completed').length}
                                            suffix={`/ ${progressData.length}`}
                                            valueStyle={{ color: '#3f8600' }}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic
                                            title="In Progress Phases"
                                            value={progressData.filter(item => item.status === 'in-progress').length}
                                            suffix={`/ ${progressData.length}`}
                                            valueStyle={{ color: '#1890ff' }}
                                        />
                                    </Col>
                                </Row>
                            </div>
                            <Table 
                                dataSource={progressData} 
                                columns={progressColumns} 
                                rowKey="week"
                                pagination={false}
                            />
                        </Card>
                        
                        {renderWeeklyReportForm()}
                    </TabPane>
                    
                    <TabPane tab="Reports & Submissions" key="2">
                        <Card title="Student Reports">
                            {weeklyReports.length > 0 ? (
                                <Table 
                                    dataSource={weeklyReports} 
                                    columns={reportsColumns} 
                                    rowKey="id"
                                />
                            ) : (
                                <Empty description="No reports submitted yet" />
                            )}
                        </Card>
                    </TabPane>
                    
                    <TabPane tab="Evaluations History" key="3">
                        <Card title="Evaluation History">
                            {evaluations.length > 0 ? (
                                <Table 
                                    dataSource={evaluations} 
                                    columns={evaluationsColumns} 
                                    rowKey="id"
                                />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <Text type="secondary">No evaluations yet</Text>
                                </div>
                            )}
                        </Card>
                    </TabPane>
                    
                    <TabPane tab="Progress Timeline" key="4">
                        <Card title="Internship Journey Timeline">
                            {progressData.length > 0 ? (
                                <Timeline mode="left" style={{ marginTop: 20, marginBottom: 20 }}>
                                    {progressData.map((item) => {
                                        let color = 'blue';
                                        let dot = null;
                                        
                                        if (item.status === 'completed') {
                                            color = 'green';
                                            dot = <CheckCircleOutlined />;
                                        } else if (item.status === 'in-progress') {
                                            color = 'blue';
                                            dot = <SyncOutlined spin />;
                                        } else {
                                            color = 'gray';
                                            dot = <ClockCircleOutlined />;
                                        }
                                        
                                        return (
                                            <Timeline.Item 
                                                key={item.week} 
                                                color={color} 
                                                dot={dot}
                                                label={`Week ${item.week}`}
                                            >
                                                <div style={{ marginBottom: 8 }}>
                                                    <Text strong>{item.phase}</Text>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <Progress 
                                                        percent={item.completion_percentage || 0} 
                                                        size="small" 
                                                        style={{ width: 180, marginRight: 10 }} 
                                                    />
                                                    <Text type="secondary">
                                                        {item.completion_percentage || 0}% Complete
                                                    </Text>
                                                </div>
                                                {evaluations.filter(evaluation => 
                                                    evaluation.week === item.week || 
                                                    (evaluation.type === 'mte' && item.week === 4) || 
                                                    (evaluation.type === 'ete' && item.week === 8)
                                                ).map(evaluation => (
                                                    <Tag 
                                                        color="purple" 
                                                        style={{ marginTop: 8, marginRight: 4 }}
                                                        key={evaluation.id}
                                                    >
                                                        {evaluation.type.toUpperCase()} Evaluation: {evaluation.marks}/100
                                                    </Tag>
                                                ))}
                                            </Timeline.Item>
                                        );
                                    })}
                                </Timeline>
                            ) : (
                                <Empty description="No progress data available" />
                            )}
                        </Card>
                    </TabPane>
                    
                    <TabPane tab="Mid-Term & End-Term Evaluation" key="5">
                        <Card title="Official Evaluations">
                            <div style={{ marginBottom: 16 }}>
                                <Space>
                                    <Button 
                                        type="primary" 
                                        onClick={() => openEvaluationModal('report')}
                                        icon={<FileOutlined />}
                                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                                    >
                                        Submit Mid-Term Evaluation
                                    </Button>
                                    <Button
                                        type="primary"
                                        onClick={() => openEvaluationModal('report')}
                                        icon={<FileOutlined />}
                                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                                    >
                                        Submit End-Term Evaluation
                                    </Button>
                                </Space>
                            </div>
                            
                            <Collapse defaultActiveKey={['1']}>
                                <Panel header="Evaluation Guidelines" key="1">
                                    <ul>
                                        <li>Mid-Term Evaluation (MTE) should be submitted by the 4th week of internship</li>
                                        <li>End-Term Evaluation (ETE) should be submitted within a week after internship completion</li>
                                        <li>Both evaluations require marks and detailed feedback</li>
                                        <li>Consider project completion, quality, timeliness, and student's learning curve</li>
                                    </ul>
                                </Panel>
                                <Panel header="Marking Scheme" key="2">
                                    <ul>
                                        <li><strong>90-100:</strong> Exceptional performance, exceeding all expectations</li>
                                        <li><strong>80-89:</strong> Excellent work, exceeding most expectations</li>
                                        <li><strong>70-79:</strong> Good work, meeting all expectations</li>
                                        <li><strong>60-69:</strong> Satisfactory, meeting basic expectations</li>
                                        <li><strong>Below 60:</strong> Needs improvement</li>
                                    </ul>
                                </Panel>
                            </Collapse>
                        </Card>
                    </TabPane>
                </Tabs>
            </Card>
            
            {/* Evaluation Modal */}
            <Modal
                title={`${evaluationType === 'report' ? 'Report' : 'Weekly'} Evaluation`}
                open={evaluationModalVisible}
                onCancel={() => setEvaluationModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form
                    form={evaluationForm}
                    layout="vertical"
                    onFinish={handleEvaluationSubmit}
                >
                    {evaluationType === 'report' && (
                        <Form.Item
                            name="type"
                            label="Evaluation Type"
                            initialValue="mte"
                            rules={[{ required: true, message: 'Please select evaluation type' }]}
                        >
                            <Select>
                                <Option value="mte">Mid Term Evaluation</Option>
                                <Option value="ete">End Term Evaluation</Option>
                                <Option value="synopsis">Synopsis</Option>
                            </Select>
                        </Form.Item>
                    )}
                    
                    <Form.Item
                        name="marks"
                        label="Marks"
                        rules={[{ required: true, message: 'Please input marks' }]}
                    >
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item
                        name="feedback"
                        label="Feedback"
                        rules={[{ required: true, message: 'Please provide feedback' }]}
                    >
                        <TextArea rows={4} />
                    </Form.Item>
                    
                    <Form.Item
                        name="remarks"
                        label="Remarks"
                    >
                        <TextArea rows={2} />
                    </Form.Item>
                    
                    <Form.Item>
                        <Button 
                            type="primary" 
                            htmlType="submit"
                            loading={loading}
                            style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                        >
                            Submit Evaluation
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Spin>
    );
};

export default MentorProgressTracking; 