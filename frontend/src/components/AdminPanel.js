import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../utils/auth';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'student' // default role
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [testResult, setTestResult] = useState('');

    // Test DELETE request
    const testDeleteRequest = async () => {
        try {
            setError('');
            setMessage('');
            setTestResult('Testing DELETE request...');
            
            const token = getToken('admin');
            if (!token) {
                setTestResult('No admin token found. Please log in as admin first.');
                return;
            }
            
            // Try the test endpoint
            const response = await axios.delete('http://localhost:5000/admin/test-delete', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setTestResult(`Test DELETE successful! Response: ${JSON.stringify(response.data)}`);
            console.log('Test DELETE response:', response);
        } catch (err) {
            setTestResult(`Test DELETE failed: ${err.message}`);
            console.error('Test DELETE error:', err);
            if (err.response) {
                console.log('Error response:', err.response);
                setTestResult(`Test DELETE failed: ${err.message} - Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`);
            }
        }
    };

    // Fetch all users
    const fetchUsers = async () => {
        try {
            const token = getToken('admin');
            if (!token) {
                setError('Authentication token not found. Please log in again.');
                return;
            }
            
            const response = await axios.get('http://localhost:5000/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.users);
        } catch (err) {
            setError('Failed to fetch users');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        setNewUser({
            ...newUser,
            [e.target.name]: e.target.value
        });
    };

    // Create new user
    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const token = getToken('admin');
            if (!token) {
                setError('Authentication token not found. Please log in again.');
                return;
            }
            
            // Log the data being sent for debugging
            console.log('Creating user with data:', newUser);
            
            await axios.post('http://localhost:5000/admin/create-user', newUser, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage('User created successfully');
            setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'student' });
            fetchUsers(); // Refresh user list
        } catch (err) {
            console.error('User creation error:', err);
            setError(err.response?.data?.error || 'Failed to create user');
        }
    };

    // Delete user - with enhanced debugging and fallback
    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                setError('');
                setMessage('');
                console.log("Deleting user with ID:", userId);
                
                const token = getToken('admin');
                if (!token) {
                    setError('Authentication token not found. Please log in again.');
                    return;
                }
                
                // Log token for debugging (mask it for security)
                const maskedToken = token.substring(0, 10) + '...' + token.substring(token.length - 5);
                console.log(`Using admin token: ${maskedToken}`);
                
                // Use the correct delete-user endpoint format with query parameter
                const deleteEndpoint = `http://localhost:5000/admin/delete-user?user_id=${userId}`;
                console.log("Using delete endpoint:", deleteEndpoint);
                
                try {
                    // First attempt with Axios
                    console.log("Attempting delete with Axios...");
                    
                    // Setup a timeout for the request
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
                    
                    const response = await axios({
                        method: 'DELETE',
                        url: deleteEndpoint,
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        signal: controller.signal,
                        timeout: 15000
                    });
                    
                    // Clear the timeout since the request completed
                    clearTimeout(timeoutId);
                    
                    console.log("Delete response:", response.data);
                    setMessage('User deleted successfully');
                    fetchUsers(); // Refresh user list
                    
                } catch (axiosError) {
                    console.error('Axios delete error:', axiosError);
                    
                    // Try alternative approach with fetch API as fallback
                    console.log("Axios request failed, trying with fetch API...");
                    try {
                        const fetchResponse = await fetch(deleteEndpoint, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (fetchResponse.ok) {
                            const data = await fetchResponse.json();
                            console.log("Fetch delete response:", data);
                            setMessage('User deleted successfully with fetch API');
                            fetchUsers();
                            return;
                        } else {
                            console.error("Fetch error status:", fetchResponse.status);
                            const errorText = await fetchResponse.text();
                            console.error("Fetch error response:", errorText);
                            throw new Error(`Fetch failed with status ${fetchResponse.status}: ${errorText}`);
                        }
                    } catch (fetchError) {
                        console.error("Fetch approach also failed:", fetchError);
                        throw axiosError; // Re-throw the original error to be handled below
                    }
                }
                
            } catch (error) {
                console.error('Delete error details:', error);
                let errorMessage = 'Failed to delete user';
                
                if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                    errorMessage = 'Request timed out. The server might be processing the deletion but not responding in time.';
                    // Force a refresh anyway since the deletion might have actually happened
                    setTimeout(() => fetchUsers(), 2000);
                } else if (error.response) {
                    console.error('Error response status:', error.response.status);
                    console.error('Error response data:', error.response.data);
                    
                    if (error.response.status === 405) {
                        errorMessage = `Delete endpoint not configured correctly (Method Not Allowed). Confirm your server supports DELETE for ${error.config.url}`;
                    } else {
                        errorMessage += `: ${error.response.status} ${error.response.data?.message || error.response.data?.error || ''}`;
                    }
                } else if (error.request) {
                    errorMessage += ': No response from server. The deletion may still have been processed successfully.';
                    // Force a refresh anyway since the deletion might have actually happened
                    setTimeout(() => fetchUsers(), 2000);
                } else {
                    errorMessage += `: ${error.message}`;
                }
                
                setError(errorMessage);
            }
        }
    };

    return (
        <div className="container mt-4">
            <h2>Admin Panel</h2>
            
            {/* Test DELETE Request */}
            <div className="card mb-4">
                <div className="card-header bg-secondary text-white">
                    <h3>API Testing</h3>
                </div>
                <div className="card-body">
                    <button 
                        className="btn btn-warning" 
                        onClick={testDeleteRequest}
                    >
                        Test DELETE Request
                    </button>
                    {testResult && (
                        <div className="mt-3 p-3 bg-light">
                            <pre>{testResult}</pre>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Create User Form */}
            <div className="card mb-4">
                <div className="card-header">
                    <h3>Create New User</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleCreateUser}>
                        <div className="mb-3">
                            <label className="form-label">Email:</label>
                            <input
                                type="email"
                                name="email"
                                className="form-control"
                                value={newUser.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">First Name:</label>
                            <input
                                type="text"
                                name="first_name"
                                className="form-control"
                                value={newUser.first_name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Last Name:</label>
                            <input
                                type="text"
                                name="last_name"
                                className="form-control"
                                value={newUser.last_name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Password:</label>
                            <input
                                type="password"
                                name="password"
                                className="form-control"
                                value={newUser.password}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Role:</label>
                            <select
                                name="role"
                                className="form-select"
                                value={newUser.role}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="student">Student</option>
                                <option value="mentor">Mentor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        
                        {/* Show student-specific fields if role is student */}
                        {newUser.role === 'student' && (
                            <div className="mb-3 border p-3 rounded bg-light">
                                <h5>Student Information</h5>
                                <div className="mb-3">
                                    <label className="form-label">Registration Number:</label>
                                    <input
                                        type="text"
                                        name="student_info.registration_number"
                                        className="form-control"
                                        onChange={(e) => setNewUser({
                                            ...newUser,
                                            student_info: {
                                                ...newUser.student_info,
                                                registration_number: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Batch:</label>
                                    <input
                                        type="text"
                                        name="student_info.batch"
                                        className="form-control"
                                        onChange={(e) => setNewUser({
                                            ...newUser,
                                            student_info: {
                                                ...newUser.student_info,
                                                batch: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* Show mentor-specific fields if role is mentor */}
                        {newUser.role === 'mentor' && (
                            <div className="mb-3 border p-3 rounded bg-light">
                                <h5>Mentor Information</h5>
                                <div className="mb-3">
                                    <label className="form-label">Department:</label>
                                    <input
                                        type="text"
                                        name="mentor_info.department"
                                        className="form-control"
                                        onChange={(e) => setNewUser({
                                            ...newUser,
                                            mentor_info: {
                                                ...newUser.mentor_info,
                                                department: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Designation:</label>
                                    <input
                                        type="text"
                                        name="mentor_info.designation"
                                        className="form-control"
                                        onChange={(e) => setNewUser({
                                            ...newUser,
                                            mentor_info: {
                                                ...newUser.mentor_info,
                                                designation: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <button type="submit" className="btn btn-primary">Create User</button>
                    </form>
                    
                    {message && (
                        <div className="alert alert-success mt-3">{message}</div>
                    )}
                    {error && (
                        <div className="alert alert-danger mt-3">{error}</div>
                    )}
                </div>
            </div>
            
            {/* User List */}
            <div className="card">
                <div className="card-header">
                    <h3>User List</h3>
                </div>
                <div className="card-body">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.email}</td>
                                    <td>{user.first_name} {user.last_name}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel; 