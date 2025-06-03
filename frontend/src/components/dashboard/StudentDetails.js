import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Descriptions, Tag, Button, Spin, Alert, Tabs, Space, Divider, Avatar, Statistic } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined, BankOutlined, TeamOutlined, CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const StudentDetails = ({ student, registrationNumber }) => {
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [internshipData, setInternshipData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student || registrationNumber) {
      fetchStudentDetails();
    }
  }, [student, registrationNumber]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Use registration number from props or from student object
      const regNumber = registrationNumber || (student && student.registration_number);
      
      if (!regNumber) {
        setError('No registration number provided');
        setLoading(false);
        return;
      }
      
      // First try development endpoint
      try {
        const response = await axios.get(`http://localhost:5000/mentor/dev/student/${regNumber}`);
        console.log('Student details (dev endpoint):', response.data);
        if (response.data && response.data.student) {
          setStudentData(response.data.student);
          setInternshipData(response.data.internship || null);
          setLoading(false);
          return;
        }
      } catch (devError) {
        console.log('Dev endpoint failed, trying regular endpoint');
      }
      
      // Fall back to regular endpoint
      const response = await axios.get(`http://localhost:5000/mentor/student/${regNumber}`);
      console.log('Student details:', response.data);
      
      if (response.data) {
        setStudentData(response.data);
        setInternshipData(response.data.internship || null);
      } else {
        setError('No student data found');
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      setError('Failed to fetch student details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>Loading student details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  if (!studentData) {
    return (
      <Alert
        message="No Student Selected"
        description="Please select a student to view their details."
        type="info"
        showIcon
      />
    );
  }

  return (
    <div>
      <Card>
        <Row gutter={[24, 24]}>
          <Col span={6}>
            <Avatar 
              size={100} 
              icon={<UserOutlined />} 
              src={studentData.profile_picture} 
            />
          </Col>
          <Col span={18}>
            <Title level={3}>{studentData.name}</Title>
            <Space direction="vertical">
              <Text><MailOutlined /> {studentData.email || 'Email not available'}</Text>
              <Text><PhoneOutlined /> {studentData.phone || 'Phone not available'}</Text>
              <Text><BankOutlined /> {studentData.department || 'Department not specified'}</Text>
              <Text><TeamOutlined /> Batch: {studentData.batch || 'Not specified'}</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      <Divider />

      <Tabs defaultActiveKey="1">
        <TabPane tab="Personal Information" key="1">
          <Card title="Personal Details">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Registration Number">{studentData.registration_number}</Descriptions.Item>
              <Descriptions.Item label="Batch">{studentData.batch || 'Not specified'}</Descriptions.Item>
              <Descriptions.Item label="Department">{studentData.department || 'Not specified'}</Descriptions.Item>
              <Descriptions.Item label="Program">{studentData.program || 'Not specified'}</Descriptions.Item>
              <Descriptions.Item label="Section">{studentData.section || 'Not specified'}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {studentData.date_of_birth ? moment(studentData.date_of_birth).format('DD MMM, YYYY') : 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Blood Group">{studentData.blood_group || 'Not specified'}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{studentData.address || 'Not specified'}</Descriptions.Item>
            </Descriptions>
          </Card>

          {studentData.hostel_name && (
            <Card title="Hostel Information" style={{ marginTop: '16px' }}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Hostel Name">{studentData.hostel_name}</Descriptions.Item>
                <Descriptions.Item label="Block">{studentData.hostel_block || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Room Number">{studentData.hostel_room_no || 'Not specified'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </TabPane>

        <TabPane tab="Internship Information" key="2">
          {internshipData ? (
            <Card title="Internship Details">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Company">{internshipData.company_name || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Type">{internshipData.internship_type || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Role">{internshipData.role || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Location">{internshipData.location || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Start Date">
                  {internshipData.start_date ? moment(internshipData.start_date).format('DD MMM, YYYY') : 'Not specified'}
                </Descriptions.Item>
                <Descriptions.Item label="End Date">
                  {internshipData.end_date ? moment(internshipData.end_date).format('DD MMM, YYYY') : 'Not specified'}
                </Descriptions.Item>
                <Descriptions.Item label="Stipend">
                  {internshipData.stipend ? `₹${internshipData.stipend}` : 'Not specified'}
                </Descriptions.Item>
                <Descriptions.Item label="Approval Status">
                  {internshipData.mentor_approval ? 
                    <Tag color="green" icon={<CheckCircleOutlined />}>Approved</Tag> : 
                    <Tag color="orange" icon={<CloseCircleOutlined />}>Pending Approval</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="HR Contact" span={2}>{internshipData.hr_contact || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="HR Email" span={2}>{internshipData.hr_email || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>{internshipData.description || 'No description provided'}</Descriptions.Item>
                <Descriptions.Item label="Skills/Technologies" span={2}>{internshipData.skills || 'Not specified'}</Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <Alert
              message="No Internship Information"
              description="This student has not submitted internship details yet."
              type="info"
              showIcon
            />
          )}
        </TabPane>

        <TabPane tab="Progress & Evaluation" key="3">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Overall Progress"
                  value={studentData.progress ? studentData.progress.overall : 0}
                  suffix="%" 
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Latest Evaluation"
                  value={studentData.latest_evaluation ? studentData.latest_evaluation.marks : 'N/A'}
                  suffix={studentData.latest_evaluation ? "/100" : ""} 
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="Reports Submitted"
                  value={studentData.weekly_reports ? studentData.weekly_reports.length : 0}
                />
              </Card>
            </Col>
          </Row>

          {studentData.latest_evaluation && (
            <Card title="Latest Evaluation" style={{ marginTop: '16px' }}>
              <Descriptions bordered>
                <Descriptions.Item label="Type">{studentData.latest_evaluation.evaluation_type || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Marks">{studentData.latest_evaluation.marks || 'Not specified'}</Descriptions.Item>
                <Descriptions.Item label="Date">
                  {studentData.latest_evaluation.submitted_at ? 
                    moment(studentData.latest_evaluation.submitted_at).format('DD MMM, YYYY') : 
                    'Not specified'}
                </Descriptions.Item>
                <Descriptions.Item label="Feedback" span={3}>{studentData.latest_evaluation.feedback || 'No feedback provided'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </TabPane>
      </Tabs>

      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        <Button type="primary" onClick={fetchStudentDetails}>Refresh Data</Button>
      </div>
    </div>
  );
};

export default StudentDetails; 