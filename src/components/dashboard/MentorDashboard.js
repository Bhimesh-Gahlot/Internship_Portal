import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Card, Button, Space, Table, Tag, Form, Input, Select, InputNumber, message, Tabs, Typography, Alert, Layout, Menu, Badge, Row, Col, Statistic, Avatar, Tooltip, Modal, Checkbox, DatePicker, Progress, Skeleton, Divider, Empty, Drawer, Segmented, Timeline, Descriptions, List, Rate, Result, Dropdown, Spin } from 'antd';
import { 
    ReloadOutlined, 
    FormOutlined, 
    MailOutlined, 
    FileTextOutlined, 
    UserOutlined, 
    FileOutlined, 
    TeamOutlined, 
    HomeOutlined, 
    LineChartOutlined, 
    ProfileOutlined,
    BellOutlined,
    MessageOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    EditOutlined,
    SearchOutlined,
    FileAddOutlined,
    ToolOutlined,
    ArrowLeftOutlined,
    FolderOpenOutlined,
    FileSearchOutlined,
    BarChartOutlined,
    SmileOutlined,
    EnvironmentOutlined,
    DollarOutlined,
    PhoneOutlined,
    GlobalOutlined,
    PieChartOutlined,
    EllipsisOutlined,
    FilterOutlined,
    StarOutlined,
    ThunderboltOutlined,
    EyeInvisibleOutlined,
    LockOutlined,
    UnlockOutlined,
    CheckOutlined,
    CloseOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    SettingOutlined,
    DownloadOutlined,
    BriefcaseOutlined,
    BulbOutlined,
    BulbFilled,
    FolderOutlined,
    SaveOutlined
} from '@ant-design/icons';
import MentorStudentManagement from './MentorStudentManagement';
import MentorProgressTracking from './MentorProgressTracking';
import moment from 'moment';
import { theme, ConfigProvider } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Header, Content, Footer, Sider } = Layout;

// Config for API URLs
const API_BASE_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000/api'
    : '/api';

// Fallback directly to the backend URL if needed
const BACKEND_URL = 'http://localhost:5000';

// Helper function to get evaluation color
const getEvaluationColor = (marks, total) => {
    const percentage = (marks / total) * 100;
    if (percentage >= 80) return 'green';
    if (percentage >= 60) return 'blue';
    if (percentage >= 40) return 'orange';
    return 'red';
};

// Helper function to get progress color
const getProgressColor = (progress) => {
    if (progress < 30) return '#f5222d';
    if (progress < 70) return '#faad14';
    return '#52c41a';
};

// Student Evaluations Component
const StudentEvaluations = ({ student, onRefresh }) => {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    
    useEffect(() => {
        if (student) {
            fetchEvaluations();
        }
    }, [student]);
    
    const fetchEvaluations = async () => {
        if (!student || !student.registration_number) return;
        
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/evaluations/${student.registration_number}`,
                { withCredentials: true }
            );
            
            if (response.data && Array.isArray(response.data.evaluations)) {
                setEvaluations(response.data.evaluations);
            }
        } catch (error) {
            console.error('Error fetching evaluations:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {contextHolder}
            <Card title="Student Evaluations">
                {loading ? (
                    <Skeleton active />
                ) : evaluations.length > 0 ? (
                    <List
                        itemLayout="vertical"
                        dataSource={evaluations}
                        renderItem={evaluation => (
                            <List.Item
                                key={evaluation.id}
                                extra={
                                    <Tag color={getEvaluationColor(evaluation.marks_obtained, evaluation.total_marks)}>
                                        {evaluation.marks_obtained}/{evaluation.total_marks} Marks
                                    </Tag>
                                }
                            >
                                <List.Item.Meta
                                    title={`${evaluation.evaluation_type.toUpperCase()} Evaluation`}
                                    description={`Evaluated on ${moment(evaluation.submitted_at).format('DD MMM YYYY')}`}
                                />
                                <div style={{ marginTop: 16 }}>
                                    <p><strong>Feedback:</strong> {evaluation.feedback}</p>
                                    {evaluation.remarks && (
                                        <p><strong>Remarks:</strong> {evaluation.remarks}</p>
                                    )}
                                </div>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty description="No evaluations found" />
                )}
            </Card>
        </div>
    );
};

// Main component
const MentorDashboard = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            }}
        >
            <Layout style={{ minHeight: '100vh' }}>
                <Sider
                    collapsible
                    theme={isDarkMode ? "dark" : "light"}
                >
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <Title level={4} style={{ color: '#1890ff' }}>Mentor Portal</Title>
                    </div>
                    <Menu
                        theme={isDarkMode ? "dark" : "light"}
                        mode="inline"
                        selectedKeys={[activeTab]}
                        items={[
                            {
                                key: '1',
                                icon: <HomeOutlined />,
                                label: 'Dashboard'
                            },
                            {
                                key: '2',
                                icon: <TeamOutlined />,
                                label: 'Students'
                            },
                            {
                                key: 'theme',
                                icon: isDarkMode ? <BulbOutlined /> : <BulbFilled />,
                                label: isDarkMode ? 'Light Mode' : 'Dark Mode',
                                onClick: () => setIsDarkMode(!isDarkMode)
                            }
                        ]}
                        onClick={({ key }) => {
                            if (key !== 'theme') {
                                setActiveTab(key);
                            }
                        }}
                    />
                </Sider>
                <Layout>
                    <Header style={{ background: '#fff', padding: '0 16px' }}>
                        <Title level={4}>Mentor Dashboard</Title>
                    </Header>
                    <Content style={{ margin: '16px', background: '#fff', padding: '24px' }}>
                        {activeTab === '1' && (
                            <div>
                                <Title level={4}>Dashboard Content</Title>
                                <p>Welcome to the Mentor Dashboard!</p>
                            </div>
                        )}
                        {activeTab === '2' && (
                            <MentorStudentManagement />
                        )}
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
};

export default MentorDashboard;