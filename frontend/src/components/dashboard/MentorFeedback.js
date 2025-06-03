import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../../utils/auth';

const MentorFeedback = () => {
    const [feedbackData, setFeedbackData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchFeedbackData();
    }, []);

    const fetchFeedbackData = async () => {
        try {
            const token = getToken('student');
            if (!token) {
                setError('No authentication token found');
                setLoading(false);
                return;
            }

            const response = await axios.get('http://localhost:5000/student/weekly-feedback', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Fetched feedback data:', response.data);
            if (response.data.weekly_feedback) {
                setFeedbackData(response.data.weekly_feedback);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching feedback data:', error);
            setError('Failed to fetch feedback data');
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Mentor Feedback</h2>
            
            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner"></div>
                    <p className="mt-2 text-gray-600">Loading feedback data...</p>
                </div>
            ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            ) : feedbackData.length === 0 ? (
                <div className="text-center py-4">
                    <p className="text-gray-600">No feedback received yet.</p>
                    <p className="text-sm text-gray-500 mt-1">Your mentor will provide weekly feedback as you progress through your internship.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {feedbackData.map((feedback) => (
                        <div 
                            key={feedback.id} 
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-medium">Week {feedback.week} Feedback</h3>
                                <span className="text-sm text-gray-500">
                                    {new Date(feedback.submitted_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="mb-3">
                                <div className="text-sm text-gray-500 mb-1">Completion Assessment</div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                        className="bg-blue-600 h-2.5 rounded-full" 
                                        style={{ width: `${feedback.completion_percentage}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-right mt-1 text-gray-500">
                                    {feedback.completion_percentage}% complete
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Mentor Comments</div>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                                    {feedback.feedback}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MentorFeedback; 