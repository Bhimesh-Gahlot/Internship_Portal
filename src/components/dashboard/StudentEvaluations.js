import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, List, Tag, Skeleton, Empty, message } from 'antd';
import moment from 'moment';

// This is a temporary file to demonstrate the correct structure
// This component should be integrated into MentorDashboard.js

const API_BASE_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000/api'
    : '/api';

const StudentEvaluations = ({ student, onRefresh, getEvaluationColor }) => {
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

export default StudentEvaluations; 