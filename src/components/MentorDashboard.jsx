import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
} from '@mui/material';

const API_BASE_URL = 'http://localhost:8000';  // Adjust if your Django server runs on a different port

const MentorDashboard = () => {
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch mentors on component mount
  useEffect(() => {
    fetchMentors();
  }, []);

  // Fetch students when mentor is selected
  useEffect(() => {
    if (selectedMentor) {
      fetchMentorStudents(selectedMentor);
    }
  }, [selectedMentor]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/mentors/`);
      setMentors(response.data);
    } catch (err) {
      setError('Failed to fetch mentors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorStudents = async (mentorId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/mentors/${mentorId}/students/`);
      setStudents(response.data);
    } catch (err) {
      setError('Failed to fetch students');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Mentor-Student Dashboard
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          select
          label="Select Mentor"
          value={selectedMentor}
          onChange={(e) => setSelectedMentor(e.target.value)}
          fullWidth
        >
          {mentors.map((mentor) => (
            <MenuItem key={mentor.id} value={mentor.id}>
              {mentor.user.first_name} {mentor.user.last_name} - {mentor.department}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {selectedMentor && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Roll Number</TableCell>
                <TableCell>Student Name</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.registration_number}</TableCell>
                  <TableCell>{student.batch}</TableCell>
                  <TableCell>{student.user.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MentorDashboard; 