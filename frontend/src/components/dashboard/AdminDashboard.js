import React, { useState, useEffect } from 'react';
import { Layout, Menu, Table, Typography, DatePicker, Space, Button, Select, Card, Tabs, Col } from 'antd';
import {
    UserOutlined,
    TeamOutlined,
    FileOutlined,
    KeyOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import axios from 'axios';
import StudentManagement from './StudentManagement';
import MentorManagement from './MentorManagement';
import UserManagement from './UserManagement';
import { useNavigate } from 'react-router-dom';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const AdminDashboard = () => {
    const [selectedMenu, setSelectedMenu] = useState('students');
    const [collapsed, setCollapsed] = useState(false);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState(null);
    const [reportType, setReportType] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        if (selectedMenu === 'reports') {
            fetchReports();
        }
    }, [selectedMenu, dateRange, reportType]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = 'http://localhost:5000/admin/reports';
            
            // Add query parameters for filtering
            const params = new URLSearchParams();
            if (reportType !== 'all') {
                params.append('type', reportType);
            }
            if (dateRange) {
                params.append('start_date', dateRange[0].format('YYYY-MM-DD'));
                params.append('end_date', dateRange[1].format('YYYY-MM-DD'));
            }
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setReports(response.data.reports || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
            // Use mock data when API fails
            setReports(getMockReports());
        } finally {
            setLoading(false);
        }
    };

    const getMockReports = () => {
        return [
            { id: 1, student_name: 'John Doe', type: 'weekly', week: 1, submission_date: '2023-06-01', status: 'approved' },
            { id: 2, student_name: 'Jane Smith', type: 'weekly', week: 1, submission_date: '2023-06-02', status: 'pending' },
            { id: 3, student_name: 'Michael Brown', type: 'weekly', week: 2, submission_date: '2023-06-08', status: 'approved' },
            { id: 4, student_name: 'Sarah Johnson', type: 'monthly', month: 'June', submission_date: '2023-06-30', status: 'rejected' },
            { id: 5, student_name: 'David Williams', type: 'final', submission_date: '2023-07-15', status: 'approved' }
        ];
    };

    const renderContent = () => {
        switch (selectedMenu) {
            case 'students':
                return <StudentManagement />;
            case 'mentors':
                return <MentorManagement />;
            case 'users':
                return <UserManagement />;
            case 'reports':
                return (
                    <div>
                        <Title level={3}>Student Reports</Title>
                        <Card>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Space style={{ marginBottom: 16 }}>
                                    <Text>Filter by date range:</Text>
                                    <RangePicker onChange={setDateRange} />
                                    <Text>Report type:</Text>
                                    <Select 
                                        defaultValue="all" 
                                        style={{ width: 120 }} 
                                        onChange={setReportType}
                                    >
                                        <Option value="all">All</Option>
                                        <Option value="weekly">Weekly</Option>
                                        <Option value="monthly">Monthly</Option>
                                        <Option value="final">Final</Option>
                                    </Select>
                                    <Button 
                                        type="primary" 
                                        icon={<DownloadOutlined />}
                                        onClick={() => alert('Download functionality would be implemented here')}
                                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white'}}
                                    >
                                        Export
                                    </Button>
                                </Space>
                                
                                <Tabs defaultActiveKey="1">
                                    <TabPane tab="All Reports" key="1">
                                        <Table 
                                            dataSource={reports} 
                                            rowKey="id"
                                            loading={loading}
                                            columns={[
                                                { title: 'Student Name', dataIndex: 'student_name', key: 'student_name' },
                                                { title: 'Report Type', dataIndex: 'type', key: 'type', 
                                                    render: (text) => text.charAt(0).toUpperCase() + text.slice(1) 
                                                },
                                                { 
                                                    title: 'Period', 
                                                    key: 'period',
                                                    render: (_, record) => {
                                                        if (record.type === 'weekly') return `Week ${record.week}`;
                                                        if (record.type === 'monthly') return record.month;
                                                        return 'Final';
                                                    }
                                                },
                                                { title: 'Submission Date', dataIndex: 'submission_date', key: 'submission_date' },
                                                { 
                                                    title: 'Status', 
                                                    dataIndex: 'status', 
                                                    key: 'status',
                                                    render: (status) => {
                                                        let color = 'blue';
                                                        if (status === 'approved') color = 'green';
                                                        if (status === 'rejected') color = 'red';
                                                        return <Text style={{ color }}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>;
                                                    }
                                                },
                                                {
                                                    title: 'Action',
                                                    key: 'action',
                                                    render: (_, record) => (
                                                        <Button type="link" onClick={() => alert(`View report ${record.id}`)}>
                                                            View
                                                        </Button>
                                                    )
                                                }
                                            ]}
                                        />
                                    </TabPane>
                                    <TabPane tab="Statistics" key="2">
                                        <div style={{ padding: 20, textAlign: 'center' }}>
                                            <Text>Report submission statistics will be displayed here</Text>
                                            <div style={{ marginTop: 20 }}>
                                                <Card title="Submission Rates" style={{ width: 300, display: 'inline-block', margin: 10 }}>
                                                    <Text>Weekly: 85%</Text><br />
                                                    <Text>Monthly: 78%</Text><br />
                                                    <Text>Final: 92%</Text>
                                                </Card>
                                                <Card title="Approval Rates" style={{ width: 300, display: 'inline-block', margin: 10 }}>
                                                    <Text>Approved: 72%</Text><br />
                                                    <Text>Pending: 18%</Text><br />
                                                    <Text>Rejected: 10%</Text>
                                                </Card>
                                            </div>
                                        </div>
                                    </TabPane>
                                </Tabs>
                            </Space>
                        </Card>
                    </div>
                );
            default:
                return <StudentManagement />;
        }
    };

    // Define menu items using the Ant Design v5 format
    const menuItems = [
        {
            key: 'students',
            icon: <TeamOutlined />,
            label: 'Students'
        },
        {
            key: 'mentors',
            icon: <UserOutlined />,
            label: 'Mentors'
        },
        {
            key: 'users',
            icon: <KeyOutlined />,
            label: 'User Accounts'
        },
        {
            key: 'reports',
            icon: <FileOutlined />,
            label: 'Reports'
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                <div style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
                <Menu
                    theme="dark"
                    defaultSelectedKeys={['students']}
                    mode="inline"
                    items={menuItems}
                    onSelect={({ key }) => setSelectedMenu(key)}
                />
            </Sider>
            <Layout>
                <Content style={{ margin: '16px' }}>
                    <div style={{ padding: 24, minHeight: 360, background: '#fff' }}>
                        {renderContent()}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminDashboard; 