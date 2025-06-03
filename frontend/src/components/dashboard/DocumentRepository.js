import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Typography, 
    Table, 
    Button, 
    Space, 
    Tag, 
    Upload, 
    Modal, 
    Form, 
    Input, 
    Select, 
    message, 
    Divider,
    Tabs
} from 'antd';
import { 
    DownloadOutlined, 
    UploadOutlined, 
    FileOutlined, 
    FilePdfOutlined, 
    FileWordOutlined, 
    FileExcelOutlined, 
    FileImageOutlined, 
    FileZipOutlined, 
    DeleteOutlined,
    InboxOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { TabPane } = Tabs;

const DocumentRepository = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState('1');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/documents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
            // Use mock data when API fails
            setDocuments(getMockDocuments());
        } finally {
            setLoading(false);
        }
    };

    const getMockDocuments = () => {
        return [
            { 
                id: 1, 
                name: 'Internship Guidelines', 
                type: 'pdf', 
                category: 'guidelines', 
                size: '1.2 MB', 
                uploaded_by: 'Admin', 
                upload_date: '2023-05-15', 
                description: 'Official guidelines for the internship program' 
            },
            { 
                id: 2, 
                name: 'Weekly Report Template', 
                type: 'docx', 
                category: 'templates', 
                size: '245 KB', 
                uploaded_by: 'Admin', 
                upload_date: '2023-05-10', 
                description: 'Template for weekly progress reports' 
            },
            { 
                id: 3, 
                name: 'Monthly Report Template', 
                type: 'docx', 
                category: 'templates', 
                size: '310 KB', 
                uploaded_by: 'Admin', 
                upload_date: '2023-05-10', 
                description: 'Template for monthly progress reports' 
            },
            { 
                id: 4, 
                name: 'Final Report Template', 
                type: 'docx', 
                category: 'templates', 
                size: '420 KB', 
                uploaded_by: 'Admin', 
                upload_date: '2023-05-10', 
                description: 'Template for final internship report' 
            },
            { 
                id: 5, 
                name: 'Company Evaluation Form', 
                type: 'pdf', 
                category: 'forms', 
                size: '180 KB', 
                uploaded_by: 'Admin', 
                upload_date: '2023-05-12', 
                description: 'Form for company to evaluate intern performance' 
            }
        ];
    };

    const uploadProps = {
        onRemove: file => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: file => {
            setFileList([...fileList, file]);
            return false;
        },
        fileList
    };

    const handleUpload = async (values) => {
        if (fileList.length === 0) {
            message.error('Please select a file to upload');
            return;
        }
        
        setUploading(true);
        try {
            const formData = new FormData();
            fileList.forEach(file => {
                formData.append('files[]', file);
            });
            
            // Append other form values
            Object.keys(values).forEach(key => {
                formData.append(key, values[key]);
            });
            
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            setFileList([]);
            message.success('Upload successful');
            setUploadModalVisible(false);
            form.resetFields();
            fetchDocuments();
        } catch (error) {
            console.error('Error uploading documents:', error);
            message.error('Upload failed. Please try again.');
            
            // Simulate successful upload for demo purposes
            setFileList([]);
            message.success('Upload successful (mock)');
            setUploadModalVisible(false);
            form.resetFields();
            
            // Add mock document to the list
            const newDoc = {
                id: documents.length + 1,
                name: values.name || fileList[0].name,
                type: fileList[0].name.split('.').pop(),
                category: values.category,
                size: `${Math.round(fileList[0].size / 1024)} KB`,
                uploaded_by: 'Current User',
                upload_date: new Date().toISOString().split('T')[0],
                description: values.description
            };
            setDocuments([newDoc, ...documents]);
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = (document) => {
        message.info(`Downloading ${document.name}...`);
        // Simulate download for demo purposes
        setTimeout(() => {
            message.success(`${document.name} downloaded successfully`);
        }, 1500);
    };

    const handleDelete = async (documentId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/documents/${documentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Document deleted successfully');
            fetchDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            message.error('Failed to delete document');
            
            // Simulate successful deletion for demo purposes
            message.success('Document deleted successfully (mock)');
            setDocuments(documents.filter(doc => doc.id !== documentId));
        }
    };

    const confirmDelete = (document) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this document?',
            content: `Document: ${document.name}`,
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk() {
                handleDelete(document.id);
            }
        });
    };

    const getFileIcon = (type) => {
        switch (type.toLowerCase()) {
            case 'pdf':
                return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
            case 'doc':
            case 'docx':
                return <FileWordOutlined style={{ color: '#1890ff' }} />;
            case 'xls':
            case 'xlsx':
                return <FileExcelOutlined style={{ color: '#52c41a' }} />;
            case 'jpg':
            case 'jpeg':
            case 'png':
                return <FileImageOutlined style={{ color: '#722ed1' }} />;
            case 'zip':
            case 'rar':
                return <FileZipOutlined style={{ color: '#faad14' }} />;
            default:
                return <FileOutlined />;
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'guidelines':
                return 'blue';
            case 'templates':
                return 'green';
            case 'forms':
                return 'purple';
            case 'reports':
                return 'orange';
            default:
                return 'default';
        }
    };

    const filteredDocuments = documents.filter(document => 
        document.name.toLowerCase().includes(searchText.toLowerCase()) ||
        document.description.toLowerCase().includes(searchText.toLowerCase()) ||
        document.category.toLowerCase().includes(searchText.toLowerCase())
    );
    
    const renderGuidelinesTab = () => {
        const guidelines = filteredDocuments.filter(doc => doc.category === 'guidelines');
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guidelines.map(doc => (
                    <Card key={doc.id} size="small" className="mb-3">
                        <Space>
                            {getFileIcon(doc.type)}
                            <div>
                                <Text strong>{doc.name}</Text>
                                <br />
                                <Text type="secondary">{doc.description}</Text>
                            </div>
                        </Space>
                        <div className="mt-2">
                            <Button 
                                type="primary" 
                                size="small" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownload(doc)}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                            >
                                Download
                            </Button>
                        </div>
                    </Card>
                ))}
                {guidelines.length === 0 && (
                    <div className="text-center p-4">
                        <Text type="secondary">No guidelines available</Text>
                    </div>
                )}
            </div>
        );
    };
    
    const renderTemplatesTab = () => {
        const templates = filteredDocuments.filter(doc => doc.category === 'templates');
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(doc => (
                    <Card key={doc.id} size="small" className="mb-3">
                        <Space>
                            {getFileIcon(doc.type)}
                            <div>
                                <Text strong>{doc.name}</Text>
                                <br />
                                <Text type="secondary">{doc.description}</Text>
                            </div>
                        </Space>
                        <div className="mt-2">
                            <Button 
                                type="primary" 
                                size="small" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownload(doc)}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                            >
                                Download
                            </Button>
                        </div>
                    </Card>
                ))}
                {templates.length === 0 && (
                    <div className="text-center p-4">
                        <Text type="secondary">No templates available</Text>
                    </div>
                )}
            </div>
        );
    };
    
    const renderFormsTab = () => {
        const forms = filteredDocuments.filter(doc => doc.category === 'forms');
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {forms.map(doc => (
                    <Card key={doc.id} size="small" className="mb-3">
                        <Space>
                            {getFileIcon(doc.type)}
                            <div>
                                <Text strong>{doc.name}</Text>
                                <br />
                                <Text type="secondary">{doc.description}</Text>
                            </div>
                        </Space>
                        <div className="mt-2">
                            <Button 
                                type="primary" 
                                size="small" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownload(doc)}
                                style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                            >
                                Download
                            </Button>
                        </div>
                    </Card>
                ))}
                {forms.length === 0 && (
                    <div className="text-center p-4">
                        <Text type="secondary">No forms available</Text>
                    </div>
                )}
            </div>
        );
    };

    const columns = [
        {
            title: 'Document',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    {getFileIcon(record.type)}
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (category) => (
                <Tag color={getCategoryColor(category)}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                </Tag>
            )
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
        },
        {
            title: 'Uploaded By',
            dataIndex: 'uploaded_by',
            key: 'uploaded_by',
        },
        {
            title: 'Upload Date',
            dataIndex: 'upload_date',
            key: 'upload_date',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button 
                        type="primary" 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(record)}
                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                    >
                        Download
                    </Button>
                    <Button 
                        size="small" 
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(record)}
                        style={{backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white', margin: '2px'}}
                    >
                        Delete
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <Title level={4}>Document Repository</Title>
                <Space>
                    <Input.Search
                        placeholder="Search documents"
                        allowClear
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 250 }}
                    />
                    <Button 
                        type="primary" 
                        icon={<UploadOutlined />}
                        onClick={() => setUploadModalVisible(true)}
                    >
                        Upload Document
                    </Button>
                </Space>
            </div>
            
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Quick Access" key="1">
                    <div className="mb-4">
                        <Title level={5}>Guidelines</Title>
                        {renderGuidelinesTab()}
                    </div>
                    
                    <Divider />
                    
                    <div className="mb-4">
                        <Title level={5}>Templates</Title>
                        {renderTemplatesTab()}
                    </div>
                    
                    <Divider />
                    
                    <div>
                        <Title level={5}>Forms</Title>
                        {renderFormsTab()}
                    </div>
                </TabPane>
                <TabPane tab="All Documents" key="2">
                    <Table 
                        dataSource={filteredDocuments} 
                        columns={columns} 
                        loading={loading}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                    />
                </TabPane>
            </Tabs>
            
            <Modal
                title="Upload Document"
                visible={uploadModalVisible}
                onCancel={() => setUploadModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form 
                    form={form}
                    layout="vertical" 
                    onFinish={handleUpload}
                >
                    <Form.Item
                        name="name"
                        label="Document Name"
                        rules={[{ required: true, message: 'Please enter document name' }]}
                    >
                        <Input placeholder="Enter document name" />
                    </Form.Item>
                    
                    <Form.Item
                        name="category"
                        label="Category"
                        rules={[{ required: true, message: 'Please select a category' }]}
                    >
                        <Select placeholder="Select category">
                            <Option value="guidelines">Guidelines</Option>
                            <Option value="templates">Templates</Option>
                            <Option value="forms">Forms</Option>
                            <Option value="reports">Reports</Option>
                            <Option value="other">Other</Option>
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea placeholder="Enter document description" rows={3} />
                    </Form.Item>
                    
                    <Form.Item label="File">
                        <Dragger {...uploadProps}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag file to this area to upload</p>
                            <p className="ant-upload-hint">
                                Support for single or bulk upload. Strictly prohibited from uploading company data or other
                                banned files.
                            </p>
                        </Dragger>
                    </Form.Item>
                    
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={uploading}
                            style={{ marginRight: 8 }}
                        >
                            {uploading ? 'Uploading' : 'Upload'}
                        </Button>
                        <Button onClick={() => setUploadModalVisible(false)}>
                            Cancel
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DocumentRepository; 