import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ReportSubmission = () => {
    const [formData, setFormData] = useState({
        report_type: 'MTE',  // MTE or ETE
        report_file: null,
        presentation_file: null
    });
    const navigate = useNavigate();

    const handleFileChange = (e, fileType) => {
        setFormData({
            ...formData,
            [fileType]: e.target.files[0]
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('report_type', formData.report_type);
        data.append('report_file', formData.report_file);
        data.append('presentation_file', formData.presentation_file);

        try {
            await axios.post('http://localhost:5000/reports/upload', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            navigate('/student/dashboard');
        } catch (error) {
            alert('Report submission failed');
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Submit Report</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block mb-2">Report Type</label>
                    <select
                        value={formData.report_type}
                        onChange={(e) => setFormData({...formData, report_type: e.target.value})}
                        className="w-full p-2 border rounded"
                    >
                        <option value="MTE">Mid Term Evaluation</option>
                        <option value="ETE">End Term Evaluation</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block mb-2">Report File</label>
                    <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'report_file')}
                        className="w-full p-2 border rounded"
                        accept=".pdf,.doc,.docx"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="block mb-2">Presentation File</label>
                    <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'presentation_file')}
                        className="w-full p-2 border rounded"
                        accept=".pdf,.ppt,.pptx"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                    Submit Report
                </button>
            </form>
        </div>
    );
};

export default ReportSubmission; 