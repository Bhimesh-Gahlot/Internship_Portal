import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Modal, Form, Input, DatePicker, Select, Button, Typography, Card, List, Tooltip, Tabs, Tag, message } from 'antd';
import moment from 'moment';
import axios from 'axios';
import {
    CalendarOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    PlusOutlined,
    InfoCircleOutlined,
    BellOutlined,
    UserOutlined,
    TeamOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const Schedule = () => {
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(moment());
    const [modalVisible, setModalVisible] = useState(false);
    const [eventForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    
    useEffect(() => {
        fetchEvents();
    }, []);
    
    const fetchEvents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/schedule/events', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEvents(response.data.events || []);
        } catch (error) {
            console.error('Error fetching events:', error);
            // Use mock data when API fails
            setEvents(getMockEvents());
        } finally {
            setLoading(false);
        }
    };
    
    const getMockEvents = () => {
        return [
            {
                id: 1,
                title: 'Internship Orientation',
                date: '2024-06-01',
                start_time: '10:00',
                end_time: '12:00',
                type: 'meeting',
                description: 'Introduction to internship program and expectations',
                location: 'Main Hall',
                attendees: ['All Students', 'Program Coordinators']
            },
            {
                id: 2,
                title: 'Weekly Report Due',
                date: '2024-06-08',
                type: 'deadline',
                description: 'Submit your first weekly progress report',
                location: 'Online Portal'
            },
            {
                id: 3,
                title: 'Mid-term Presentation',
                date: '2024-07-15',
                start_time: '09:00',
                end_time: '17:00',
                type: 'presentation',
                description: 'Present your internship progress to faculty panel',
                location: 'Conference Room 2',
                attendees: ['All Students', 'Faculty Panel', 'Mentors']
            },
            {
                id: 4,
                title: 'Monthly Report Due',
                date: '2024-06-30',
                type: 'deadline',
                description: 'Submit your monthly progress report',
                location: 'Online Portal'
            },
            {
                id: 5,
                title: 'Mentor Feedback Session',
                date: '2024-06-15',
                start_time: '14:00',
                end_time: '16:00',
                type: 'meeting',
                description: 'One-on-one feedback session with your mentor',
                location: 'Meeting Room 3',
                attendees: ['Student', 'Mentor']
            },
            {
                id: 6,
                title: 'Final Report Submission',
                date: '2024-08-15',
                type: 'deadline',
                description: 'Submit your final internship report',
                location: 'Online Portal'
            },
            {
                id: 7,
                title: 'Final Presentation',
                date: '2024-08-25',
                start_time: '09:00',
                end_time: '18:00',
                type: 'presentation',
                description: 'Present your internship outcomes to evaluation committee',
                location: 'Auditorium',
                attendees: ['All Students', 'Evaluation Committee', 'Mentors', 'Industry Partners']
            }
        ];
    };
    
    const handleCreateEvent = async (values) => {
        try {
            const newEvent = {
                ...values,
                date: values.date.format('YYYY-MM-DD'),
                id: events.length + 1
            };
            
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/schedule/events', newEvent, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            message.success('Event created successfully');
            setModalVisible(false);
            eventForm.resetFields();
            fetchEvents();
        } catch (error) {
            console.error('Error creating event:', error);
            // Mock successful creation for demo purposes
            const newEvent = {
                ...values,
                date: values.date.format('YYYY-MM-DD'),
                id: events.length + 1
            };
            setEvents([...events, newEvent]);
            setModalVisible(false);
            eventForm.resetFields();
        }
    };
    
    const handleDeleteEvent = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/schedule/events/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Event deleted successfully');
            fetchEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            // Mock successful deletion for demo purposes
            setEvents(events.filter(event => event.id !== eventId));
        }
    };
    
    const confirmDeleteEvent = (eventId, eventTitle) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this event?',
            content: `Event: ${eventTitle}`,
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk() {
                handleDeleteEvent(eventId);
            }
        });
    };
    
    const getEventTypeColor = (type) => {
        switch (type) {
            case 'meeting':
                return 'blue';
            case 'deadline':
                return 'red';
            case 'presentation':
                return 'green';
            case 'workshop':
                return 'purple';
            default:
                return 'default';
        }
    };
    
    const dateCellRender = (value) => {
        const date = value.format('YYYY-MM-DD');
        const dayEvents = events.filter(event => event.date === date);
        
        return (
            <ul className="events">
                {dayEvents.map(event => (
                    <li key={event.id}>
                        <Badge 
                            color={getEventTypeColor(event.type)} 
                            text={<Tooltip title={event.title}>{event.title}</Tooltip>} 
                        />
                    </li>
                ))}
            </ul>
        );
    };
    
    const handleCalendarSelect = (date) => {
        setSelectedDate(date);
        if (activeTab === '1') {
            setActiveTab('2'); // Switch to events list for the selected date
        }
    };
    
    const sortEventsByDate = (events) => {
        return [...events].sort((a, b) => {
            const dateA = moment(a.date);
            const dateB = moment(b.date);
            return dateA.diff(dateB);
        });
    };
    
    const getEventTypeIcon = (type) => {
        switch (type) {
            case 'meeting':
                return <TeamOutlined style={{ color: '#1890ff' }} />;
            case 'deadline':
                return <ClockCircleOutlined style={{ color: '#ff4d4f' }} />;
            case 'presentation':
                return <UserOutlined style={{ color: '#52c41a' }} />;
            case 'workshop':
                return <InfoCircleOutlined style={{ color: '#722ed1' }} />;
            default:
                return <CalendarOutlined />;
        }
    };
    
    const renderUpcomingEvents = () => {
        const today = moment().format('YYYY-MM-DD');
        const upcomingEvents = events
            .filter(event => event.date >= today)
            .sort((a, b) => moment(a.date).diff(moment(b.date)));
        
        return (
            <div>
                <List
                    itemLayout="horizontal"
                    dataSource={upcomingEvents.slice(0, 5)} // Show only next 5 events
                    renderItem={event => (
                        <List.Item
                            actions={[
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => confirmDeleteEvent(event.id, event.title)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Badge color={getEventTypeColor(event.type)}>
                                        {getEventTypeIcon(event.type)}
                                    </Badge>
                                }
                                title={
                                    <div>
                                        <Text strong>{event.title}</Text>
                                        <Tag color={getEventTypeColor(event.type)} style={{ marginLeft: 8 }}>
                                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                        </Tag>
                                    </div>
                                }
                                description={
                                    <div>
                                        <div><CalendarOutlined /> {moment(event.date).format('dddd, MMMM D, YYYY')}</div>
                                        {event.start_time && event.end_time && (
                                            <div><ClockCircleOutlined /> {event.start_time} - {event.end_time}</div>
                                        )}
                                        {event.location && <div>{event.location}</div>}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                    locale={{ emptyText: 'No upcoming events' }}
                />
                {upcomingEvents.length === 0 && (
                    <div className="text-center p-4">
                        <Text type="secondary">No upcoming events</Text>
                    </div>
                )}
            </div>
        );
    };
    
    const renderDateEvents = () => {
        const date = selectedDate.format('YYYY-MM-DD');
        const dayEvents = events.filter(event => event.date === date);
        
        return (
            <div>
                <div className="mb-4">
                    <Title level={5}>
                        Events for {selectedDate.format('MMMM D, YYYY')}
                    </Title>
                </div>
                
                <List
                    itemLayout="horizontal"
                    dataSource={dayEvents}
                    renderItem={event => (
                        <List.Item
                            actions={[
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => confirmDeleteEvent(event.id, event.title)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Badge color={getEventTypeColor(event.type)}>
                                        {getEventTypeIcon(event.type)}
                                    </Badge>
                                }
                                title={
                                    <div>
                                        <Text strong>{event.title}</Text>
                                        <Tag color={getEventTypeColor(event.type)} style={{ marginLeft: 8 }}>
                                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                        </Tag>
                                    </div>
                                }
                                description={
                                    <div>
                                        {event.start_time && event.end_time && (
                                            <div><ClockCircleOutlined /> {event.start_time} - {event.end_time}</div>
                                        )}
                                        {event.location && <div>{event.location}</div>}
                                        {event.description && <div>{event.description}</div>}
                                        {event.attendees && (
                                            <div>
                                                <Text strong>Attendees:</Text> {event.attendees.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                    locale={{ emptyText: 'No events for this date' }}
                />
                
                {dayEvents.length === 0 && (
                    <div className="text-center p-4">
                        <Text type="secondary">No events for this date</Text>
                        <div className="mt-3">
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    eventForm.setFieldsValue({ date: selectedDate });
                                    setModalVisible(true);
                                }}
                            >
                                Add Event
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    const renderDeadlinesTab = () => {
        const deadlines = events.filter(event => event.type === 'deadline');
        const sortedDeadlines = sortEventsByDate(deadlines);
        
        return (
            <div>
                <List
                    itemLayout="horizontal"
                    dataSource={sortedDeadlines}
                    renderItem={event => (
                        <List.Item
                            actions={[
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => confirmDeleteEvent(event.id, event.title)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Badge color="red">
                                        <ClockCircleOutlined />
                                    </Badge>
                                }
                                title={
                                    <div>
                                        <Text strong>{event.title}</Text>
                                    </div>
                                }
                                description={
                                    <div>
                                        <div><CalendarOutlined /> {moment(event.date).format('dddd, MMMM D, YYYY')}</div>
                                        {event.description && <div>{event.description}</div>}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                    locale={{ emptyText: 'No deadlines' }}
                />
                
                {sortedDeadlines.length === 0 && (
                    <div className="text-center p-4">
                        <Text type="secondary">No deadlines</Text>
                    </div>
                )}
            </div>
        );
    };
    
    const renderAllEvents = () => {
        const sortedEvents = sortEventsByDate(events);
        
        return (
            <div>
                <List
                    itemLayout="horizontal"
                    dataSource={sortedEvents}
                    renderItem={event => (
                        <List.Item
                            actions={[
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => confirmDeleteEvent(event.id, event.title)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Badge color={getEventTypeColor(event.type)}>
                                        {getEventTypeIcon(event.type)}
                                    </Badge>
                                }
                                title={
                                    <div>
                                        <Text strong>{event.title}</Text>
                                        <Tag color={getEventTypeColor(event.type)} style={{ marginLeft: 8 }}>
                                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                        </Tag>
                                    </div>
                                }
                                description={
                                    <div>
                                        <div><CalendarOutlined /> {moment(event.date).format('dddd, MMMM D, YYYY')}</div>
                                        {event.start_time && event.end_time && (
                                            <div><ClockCircleOutlined /> {event.start_time} - {event.end_time}</div>
                                        )}
                                        {event.location && <div>{event.location}</div>}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                    locale={{ emptyText: 'No events' }}
                />
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <Title level={4}>Schedule & Important Dates</Title>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                        eventForm.resetFields();
                        eventForm.setFieldsValue({ date: moment() });
                        setModalVisible(true);
                    }}
                >
                    Add Event
                </Button>
            </div>
            
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Calendar" key="1">
                    <Calendar 
                        dateCellRender={dateCellRender} 
                        onSelect={handleCalendarSelect}
                        value={selectedDate}
                    />
                </TabPane>
                <TabPane tab="Selected Date" key="2">
                    {renderDateEvents()}
                </TabPane>
                <TabPane tab="Upcoming Events" key="3">
                    {renderUpcomingEvents()}
                </TabPane>
                <TabPane tab="Deadlines" key="4">
                    {renderDeadlinesTab()}
                </TabPane>
                <TabPane tab="All Events" key="5">
                    {renderAllEvents()}
                </TabPane>
            </Tabs>
            
            <Modal
                title="Add Event"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form 
                    form={eventForm}
                    layout="vertical" 
                    onFinish={handleCreateEvent}
                    initialValues={{
                        date: moment(),
                        type: 'meeting'
                    }}
                >
                    <Form.Item
                        name="title"
                        label="Event Title"
                        rules={[{ required: true, message: 'Please enter the event title' }]}
                    >
                        <Input placeholder="Enter event title" />
                    </Form.Item>
                    
                    <Form.Item
                        name="date"
                        label="Date"
                        rules={[{ required: true, message: 'Please select a date' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item
                        name="type"
                        label="Event Type"
                        rules={[{ required: true, message: 'Please select event type' }]}
                    >
                        <Select>
                            <Option value="meeting">Meeting</Option>
                            <Option value="deadline">Deadline</Option>
                            <Option value="presentation">Presentation</Option>
                            <Option value="workshop">Workshop</Option>
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea placeholder="Enter event description" rows={3} />
                    </Form.Item>
                    
                    <Form.Item
                        name="location"
                        label="Location"
                    >
                        <Input placeholder="Enter event location" />
                    </Form.Item>
                    
                    <Form.Item label="Time" style={{ marginBottom: 0 }}>
                        <Form.Item
                            name="start_time"
                            style={{ display: 'inline-block', width: 'calc(50% - 12px)' }}
                        >
                            <Input placeholder="Start time (e.g. 09:00)" />
                        </Form.Item>
                        <span style={{ display: 'inline-block', width: '24px', textAlign: 'center' }}>-</span>
                        <Form.Item
                            name="end_time"
                            style={{ display: 'inline-block', width: 'calc(50% - 12px)' }}
                        >
                            <Input placeholder="End time (e.g. 17:00)" />
                        </Form.Item>
                    </Form.Item>
                    
                    <Form.Item
                        name="attendees"
                        label="Attendees"
                    >
                        <Select mode="tags" placeholder="Add attendees" style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
                            Create Event
                        </Button>
                        <Button onClick={() => setModalVisible(false)}>
                            Cancel
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Schedule; 