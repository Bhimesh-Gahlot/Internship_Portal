import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, Button, Space, Table, Tag, Form, Input, Select, message, Tabs, Typography, Alert, Layout, Menu, Badge, Row, Col, Statistic, Avatar, Tooltip, Modal, Progress, Empty, Drawer, InputNumber } from 'antd';
import { 
    ReloadOutlined, 
    UserOutlined, 
    TeamOutlined, 
    HomeOutlined, 
    LineChartOutlined, 
    ProfileOutlined,
    BellOutlined,
    SearchOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    SettingOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { theme, ConfigProvider } from 'antd';
import MentorProvideFeedback from './MentorProvideFeedback';
import MentorStudentManagement from './MentorStudentManagement';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Header, Content, Sider } = Layout;

// API URLs
const API_BASE_URL = 'http://localhost:5000/api';
const BACKEND_URL = 'http://localhost:5000';

const MentorDashboard = () => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mainActiveTab, setMainActiveTab] = useState('1');
    const [collapsed, setCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    // Fetch students data
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BACKEND_URL}/mentor/students`);
            
            if (response.data && response.data.students) {
                const studentsData = response.data.students;
                
                // Process the data to ensure consistent format
                const processedStudents = studentsData.map(student => ({
                    id: student.id,
                    key: student.id.toString(),
                    name: student.name || 'Unknown',
                    reg_number: student.registration_number || '',
                    email: student.email || '',
                    progress: student.internship ? 
                        (student.internship.progress || 0) : 0,
                    status: student.internship_status || 'pending',
                    lastUpdated: student.updated_at || new Date().toISOString()
                }));
                
                setStudents(processedStudents);
                messageApi.success('Successfully loaded students');
            } else {
                messageApi.warning('No students found or invalid response format');
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
    }, [messageApi]);

    // Status tag rendering
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
                percent={progress} 
                size="small" 
                strokeColor={strokeColor}
                style={{ width: 120 }}
            />
        );
    };

    // Handle student selection
    const handleStudentSelect = (student) => {
        // Open student details in new tab with the registration number
        if (student && student.reg_number) {
            console.log(`Opening student details for: ${student.reg_number}`);
            
            // Make sure URL is properly formatted with student registration number
            const url = `/student-details?registration_number=${student.reg_number}`;
            console.log(`Opening URL: ${url}`);
            
            window.open(url, '_blank');
        } else {
            console.error('Invalid student data:', student);
            messageApi.error('Invalid student data');
        }
    };

    // Load students on mount
    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Filter students based on search and filter
    const filteredStudents = students.filter(student => {
        const matchesSearch = searchQuery === '' || 
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.reg_number.toLowerCase().includes(searchQuery.toLowerCase());
            
        const matchesFilter = filterStatus === 'all' || student.status === filterStatus;
        
        return matchesSearch && matchesFilter;
    });

    // Table columns
    const studentColumns = [
        {
            title: 'Student',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <Avatar icon={<UserOutlined />}>
                        {text.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                        <div>{text}</div>
                        <div style={{ fontSize: '12px' }}>{record.reg_number}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: renderStatus,
        },
        {
            title: 'Progress',
            dataIndex: 'progress',
            key: 'progress',
            render: renderProgress,
        },
        {
            title: 'Last Updated',
            dataIndex: 'lastUpdated',
            key: 'lastUpdated',
            render: text => <Text>{moment(text).fromNow()}</Text>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button 
                    type="primary" 
                    onClick={() => handleStudentSelect(record)}
                >
                    View
                </Button>
            ),
        },
    ];

    // Main render
    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            }}
        >
            <Layout style={{ minHeight: '100vh' }}>
                {contextHolder}
                
                <Sider 
                    collapsible 
                    collapsed={collapsed} 
                    onCollapse={setCollapsed}
                    theme={isDarkMode ? "dark" : "light"}
                >
                    <div style={{ 
                        padding: '16px', 
                        color: isDarkMode ? 'white' : 'black',
                        textAlign: 'center'
                    }}>
                        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                            Mentor Portal
                        </Title>
                    </div>
                    
                    <Menu
                        theme={isDarkMode ? "dark" : "light"}
                        mode="inline"
                        selectedKeys={[mainActiveTab]}
                        onClick={({key}) => setMainActiveTab(key)}
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
                                key: '3',
                                icon: <LineChartOutlined />,
                                label: 'Progress'
                            },
                            {
                                key: '4',
                                icon: <ProfileOutlined />,
                                label: 'Reports'
                            }
                        ]}
                    />
                </Sider>
                
                <Layout>
                    <Header style={{ 
                        padding: '0 16px', 
                        background: isDarkMode ? '#1f1f1f' : '#fff',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Button 
                                type="text" 
                                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                onClick={() => setCollapsed(!collapsed)}
                            />
                            <Title level={4} style={{ margin: 0 }}>
                                Mentor Dashboard
                            </Title>
                        </div>
                        
                        <Space>
                            <Input 
                                placeholder="Search students..." 
                                prefix={<SearchOutlined />}
                                style={{ width: 200 }}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            
                            <Button 
                                type="primary" 
                                icon={<ReloadOutlined />}
                                onClick={fetchStudents}
                            >
                                Refresh
                            </Button>
                            
                            <Button
                                icon={<SettingOutlined />}
                                onClick={() => setIsDarkMode(!isDarkMode)}
                            >
                                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                            </Button>
                        </Space>
                    </Header>
                    
                    <Content style={{ margin: '16px' }}>
                        <div style={{ padding: 24, background: isDarkMode ? '#141414' : '#fff' }}>
                            {mainActiveTab === '1' && (
                                <>
                                    {/* Dashboard View */}
                                    <Row gutter={16} style={{ marginBottom: 16 }}>
                                        <Col span={6}>
                                            <Card>
                                                <Statistic title="Total Students" value={students.length} />
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card>
                                                <Statistic 
                                                    title="Active" 
                                                    value={students.filter(s => 
                                                        s.status === 'active' || 
                                                        s.status === 'In Progress'
                                                    ).length} 
                                                    valueStyle={{ color: '#52c41a' }} 
                                                />
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card>
                                                <Statistic 
                                                    title="Pending" 
                                                    value={students.filter(s => 
                                                        s.status === 'pending' || 
                                                        s.status === 'Not Started'
                                                    ).length} 
                                                    valueStyle={{ color: '#faad14' }} 
                                                />
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card>
                                                <Statistic 
                                                    title="Completed" 
                                                    value={students.filter(s => s.status === 'completed').length} 
                                                    valueStyle={{ color: '#1890ff' }} 
                                                />
                                            </Card>
                                        </Col>
                                    </Row>
                                    
                                    <Card
                                        title="Your Students" 
                                        extra={
                                            <Space>
                                                <Input
                                                    placeholder="Search students"
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    prefix={<SearchOutlined />}
                                                    style={{ width: 200 }}
                                                />
                                                <Select
                                                    defaultValue="all"
                                                    style={{ width: 120 }}
                                                    onChange={setFilterStatus}
                                                    value={filterStatus}
                                                >
                                                    <Option value="all">All Status</Option>
                                                    <Option value="active">Active</Option>
                                                    <Option value="In Progress">In Progress</Option>
                                                    <Option value="pending">Pending</Option>
                                                    <Option value="Not Started">Not Started</Option>
                                                    <Option value="completed">Completed</Option>
                                                </Select>
                                                <Button 
                                                    onClick={fetchStudents} 
                                                    icon={<ReloadOutlined />}
                                                >
                                                    Refresh
                                                </Button>
                                            </Space>
                                        }
                                    >
                                        <Table
                                            columns={studentColumns}
                                            dataSource={filteredStudents}
                                            loading={loading}
                                            pagination={{ pageSize: 5 }}
                                            rowKey="id"
                                        />
                                    </Card>
                                </>
                            )}
                            
                            {mainActiveTab === '2' && (
                                <MentorStudentManagement />
                            )}
                            
                            {mainActiveTab === '3' && (
                                <Card title="Progress Tracking">
                                    <Empty description="Progress tracking will be available soon" />
                                </Card>
                            )}
                            
                            {mainActiveTab === '4' && (
                                <Card title="Reports">
                                    <Empty description="Reports will be available soon" />
                                </Card>
                            )}
                        </div>
                    </Content>
                </Layout>
                
                {/* Student Details Drawer */}
                <Drawer
                    title={`Student Details: ${selectedStudent ? selectedStudent.name : 'Select a student'}`}
                    placement="right"
                    width={500}
                    onClose={() => setDrawerVisible(false)}
                    visible={drawerVisible}
                    extra={
                        <Space>
                            <Button onClick={() => setDrawerVisible(false)}>Close</Button>
                            <Button 
                                type="primary" 
                                onClick={() => {
                                    // Handle refresh for selected student
                                    fetchStudents();
                                    messageApi.info('Refreshing data...');
                                }}
                            >
                                <ReloadOutlined />
                            </Button>
                        </Space>
                    }
                >
                    {selectedStudent ? (
                        <div>
                            <Card>
                                <Tabs defaultActiveKey="1">
                                    <TabPane tab="Details" key="1">
                                        <p><strong>Email:</strong> {selectedStudent.email}</p>
                                        <p><strong>Registration Number:</strong> {selectedStudent.reg_number}</p>
                                        <p><strong>Progress:</strong> {renderProgress(selectedStudent.progress)}</p>
                                        <p><strong>Status:</strong> {renderStatus(selectedStudent.status)}</p>
                                        <p><strong>Last Updated:</strong> {moment(selectedStudent.lastUpdated).format('MMMM Do YYYY, h:mm a')}</p>
                                    </TabPane>
                                    <TabPane tab="Progress" key="2">
                                        <MentorProvideFeedback 
                                            studentId={selectedStudent.id} 
                                            onSuccess={() => {
                                                fetchStudents();
                                                messageApi.success('Student data updated');
                                            }}
                                        />
                                    </TabPane>
                                    <TabPane tab="Evaluation" key="3">
                                        <Alert
                                            message="Evaluation Tools"
                                            description="Here you can track the student's progress, provide feedback, and submit evaluations."
                                            type="info"
                                            showIcon
                                            style={{ marginBottom: 16 }}
                                        />
                                        
                                        <Form layout="vertical">
                                            <Form.Item label="Update Progress">
                                                <InputNumber 
                                                    min={0}
                                                    max={100}
                                                    defaultValue={selectedStudent.progress}
                                                    formatter={value => `${value}%`}
                                                    parser={value => value.replace('%', '')}
                                                    style={{ width: '100%' }}
                                                    onChange={value => {
                                                        // Handle progress update
                                                        if (value !== null && value !== undefined) {
                                                            axios.put(`${BACKEND_URL}/mentor/students/${selectedStudent.id}/progress`, {
                                                                progress: value,
                                                                status: value >= 100 ? 'completed' : 'In Progress'
                                                            })
                                                            .then(() => {
                                                                messageApi.success('Progress updated');
                                                                fetchStudents();
                                                            })
                                                            .catch(err => {
                                                                console.error('Failed to update progress:', err);
                                                                messageApi.error('Failed to update progress');
                                                            });
                                                        }
                                                    }}
                                                />
                                            </Form.Item>
                                        </Form>
                                    </TabPane>
                                </Tabs>
                            </Card>
                        </div>
                    ) : (
                        <Empty description="Select a student to view details" />
                    )}
                </Drawer>
            </Layout>
        </ConfigProvider>
    );
};

export default MentorDashboard; 