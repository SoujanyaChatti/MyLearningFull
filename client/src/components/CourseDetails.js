import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const CourseDetails = () => {
  const { id } = useParams();
  console.log('Params id:', id); // Debug id parameter
  const [course, setCourse] = useState({ id: id || 'Loading...', title: 'Loading...', description: 'Fetching details...', difficulty: 'N/A', rating: 0, instructor_id: 1 });
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true); // Start as true to show loading initially
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  console.log('Token retrieved:', token ? token.substring(0, 10) + '...' : 'null');
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded ? decoded.id : 1;
  const navigate = useNavigate();

  useEffect(() => {
    if (token && id) {
      console.log(`Fetching course for id: ${id}, userId: ${userId}, token: ${token.substring(0, 10)}...`);
      setLoading(true);
      axios.get(`http://localhost:3000/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('Raw course response:', res.data);
          if (res.data.length > 0) {
            setCourse(res.data[0]); // Use first item if array
          } else {
            setCourse({ id, title: `Course ${id} not found`, description: 'No details available', difficulty: 'N/A', rating: 0, instructor_id: 1 });
            setError('No course details found in database.');
          }
        })
        .catch(err => {
          console.error('Course fetch error:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          setCourse({ id, title: `Course ${id}`, description: 'Failed to fetch details', difficulty: 'N/A', rating: 0, instructor_id: 1 });
          setError('Failed to fetch course details from database.');
        })
        .finally(() => setLoading(false));

      console.log(`Checking enrollment for userId: ${userId}, courseId: ${id}`);
      axios.get(`http://localhost:3000/api/courses/enrollments?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('Raw enrollment response:', res.data);
          setIsEnrolled(res.data.some(enrollment => enrollment.course_id === parseInt(id)));
        })
        .catch(err => {
          console.error('Enrollment check error:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          setError('Failed to check enrollment status.');
        });
    } else if (!id) {
      console.log('Invalid id, setting fallback:', { id });
      setCourse({ id: 'N/A', title: 'Invalid Course ID', description: 'Please use a valid course URL (e.g., /course-details/8)', difficulty: 'N/A', rating: 0, instructor_id: 1 });
      setError('No valid course ID provided.');
      setLoading(false);
    } else {
      console.log('No token available, setting fallback:', { id, token });
      setCourse({ id, title: `Course ${id}`, description: 'Please log in to view details', difficulty: 'N/A', rating: 0, instructor_id: 1 });
      setError('No token available.');
      setLoading(false);
    }
  }, [token, userId, id]);

  const handleEnroll = () => {
    if (!token) {
      setError('Please log in to enroll.');
      return;
    }
    if (!id) {
      setError('No valid course ID to enroll.');
      return;
    }
    setLoading(true);
    setError(null);
    axios.post(`http://localhost:3000/api/courses/enrollments`, {
      course_id: parseInt(id),
      user_id: userId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        console.log('Enrollment response:', res.data);
        setIsEnrolled(true);
        navigate(`/course-content/${id}`);
      })
      .catch(err => {
        console.error('Enrollment error:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        setError('Failed to enroll. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  if (loading) return <div className="text-center">Loading...</div>;

  return (
    <div className="container mt-4 p-4 bg-light rounded shadow-sm">
      <h1 className="mb-3">{course.title || 'Course Title Not Available'}</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <p className="mb-2"><strong>Instructor:</strong> {course.instructor_id ? `Instructor ${course.instructor_id}` : 'N/A'}</p>
      <p className="mb-2"><strong>Description:</strong> {course.description || 'No description available.'}</p>
      <p className="mb-2"><strong>Difficulty:</strong> {course.difficulty || 'N/A'}</p>
      <p className="mb-2"><strong>Rating:</strong> {course.rating || 0}/5</p>
      {!isEnrolled && (
        <button
          className="btn btn-success mb-3"
          onClick={handleEnroll}
          disabled={loading}
        >
          {loading ? 'Enrolling...' : 'Enroll Now'}
        </button>
      )}
      {isEnrolled && (
        <Link to={`/course-content/${id}`} className="btn btn-primary mb-3">
          Start Learning
        </Link>
      )}
    </div>
  );
};

export default CourseDetails;