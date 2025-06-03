import React from 'react';

const WeeklyReport = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Weekly Reports</h2>
            <div className="space-y-4">
                <div className="p-4 border rounded">
                    <h3 className="font-medium">Week 1 Report</h3>
                    <textarea 
                        className="mt-2 w-full p-2 border rounded"
                        placeholder="Describe your work this week..."
                    />
                    <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Upload Documents
                        </label>
                        <input type="file" className="mt-1" />
                    </div>
                    <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                        Submit Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeeklyReport; 