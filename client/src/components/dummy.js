import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './CourseContent.css'; // Custom CSS file

const CourseContent = () => {
  const { id: courseId } = useParams();
  const [modules, setModules] = useState([]);
  const [contents, setContents] = useState({});
  const [expandedModule, setExpandedModule] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded ? decoded.id : 1;
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [courseRating, setCourseRating] = useState(0);
  const [showForums, setShowForums] = useState(false);
  const [forumPosts, setForumPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');

  const fetchContents = useCallback(
    (moduleId) => {
      console.log(`Fetching contents for moduleId: ${moduleId}`);
      return axios
        .get(`http://localhost:3000/api/modules/${moduleId}/contents`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Contents response (raw):', res.data);
          const contentData = res.data;
          setContents((prev) => ({ ...prev, [moduleId]: contentData }));
          return contentData;
        })
        .catch((err) => {
          console.error('Content fetch error:', err.response ? err.response.data : err.message);
          setError('Failed to load content.');
          return [];
        });
    },
    [token]
  );

  useEffect(() => {
    if (showForums && courseId && token) {
      axios
        .get(`http://localhost:3000/api/courses/${courseId}/forum-posts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Forum posts response:', res.data);
          setForumPosts(res.data);
        })
        .catch((err) => {
          console.error('Forum posts fetch error:', err.response ? err.response.data : err.message);
          setError(err.response?.data?.details || 'Failed to load forum posts.');
          setForumPosts([]);
        });
    }
  }, [showForums, courseId, token]);

  useEffect(() => {
    if (token && courseId) {
      axios
        .get(`http://localhost:3000/api/courses/enrollments?user_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Enrollment response:', res.data);
          const enrollment = res.data.find((e) => e.course_id === parseInt(courseId));
          if (enrollment) {
            setEnrollmentId(enrollment.id);
            setProgress(enrollment.progress || 0);
          } else {
            setError('No enrollment found for this course.');
          }
        })
        .catch((err) => {
          console.error('Enrollment fetch error:', err.response ? err.response.data : err.message);
          setError('Failed to load enrollment data.');
        });

      axios
        .get(`http://localhost:3000/api/courses/${courseId}/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Modules response:', res.data);
          const modulesData = res.data;
          setModules(modulesData);
          if (modulesData.length > 0) {
            const firstModuleId = modulesData[0].id;
            setExpandedModule(firstModuleId);
            fetchContents(firstModuleId).then(contentData => {
              if (!selectedContent && contentData.length > 0) {
                const firstNonQuizContent = contentData
                  .filter((c) => c.type.toLowerCase() !== 'quiz')
                  .sort((a, b) => a.order_index - b.order_index)[0];
                if (firstNonQuizContent) {
                  setSelectedContent(firstNonQuizContent.id);
                } else if (contentData[0]) {
                  setSelectedContent(contentData[0].id);
                }
              }
            });
          } else {
            setError('No modules found for this course.');
          }
        })
        .catch((err) => {
          console.error('Modules fetch error:', err.response ? err.response.data : err.message);
          setError('Failed to load modules.');
        });
    }
  }, [token, userId, courseId, fetchContents, selectedContent]);

  useEffect(() => {
    if (courseId && token) {
      axios
        .get(`http://localhost:3000/api/courses/${courseId}/rating`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Rating API response:', res.data);
          const rating = res.data.rating || 0;
          if (typeof rating !== 'number') {
            console.warn('Rating is not a number, defaulting to 0:', rating);
            setCourseRating(0);
          } else {
            setCourseRating(rating);
          }
        })
        .catch((err) => {
          console.error('Rating fetch error:', err.response ? err.response.data : err.message);
          setCourseRating(0);
        });
    }
  }, [courseId, token]);

  useEffect(() => {
    if (enrollmentId && selectedContent && expandedModule && contents[expandedModule]) {
      const content = contents[expandedModule].find((c) => c.id === selectedContent);
      if (content && content.type.toLowerCase() === 'quiz') {
        axios
          .get(`http://localhost:3000/api/submissions/count`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { enrollmentId, quizId: content.id },
          })
          .then((res) => {
            console.log('Attempt count response:', res.data);
            setAttemptCount(res.data.attemptCount || 0);
          })
          .catch((err) => {
            console.error('Attempt count fetch error:', err.response ? err.response.data : err.message);
            setAttemptCount(0);
          });

        axios
          .get(`http://localhost:3000/api/submissions/max-score`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { quizId: content.id },
          })
          .then((res) => {
            console.log('Max score response:', res.data);
            setMaxScore(res.data.maxScore || 100);
          })
          .catch((err) => {
            console.error('Max score fetch error:', err.response ? err.response.data : err.message);
            setMaxScore(100);
          });
      } else {
        setAttemptCount(0);
        setMaxScore(100);
      }
    }
  }, [enrollmentId, selectedContent, expandedModule, contents, token]);

  const markAsCompleted = (e) => {
    e.preventDefault();
    if (selectedContent && enrollmentId) {
      axios
        .post(
          `http://localhost:3000/api/courses/enrollments/${enrollmentId}/progress`,
          {
            moduleId: expandedModule,
            contentId: selectedContent,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          setProgress(res.data.progress);
          alert('Progress updated!');
        })
        .catch((err) => {
          console.error('Progress update error:', err.response ? err.response.data : err.message);
          alert('Failed to update progress.');
        });
    } else {
      alert('Enrollment not found. Please enroll in the course first.');
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    console.log('Answer changed:', { questionIndex, answer });
    setQuizAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleQuizSubmit = (e) => {
    e.preventDefault();
    const content = contents[expandedModule].find((c) => c.id === selectedContent);
    if (!content || !content.questions) {
      console.log('No quiz or questions found:', content);
      return;
    }

    const maxAttempts = 3;
    if (attemptCount >= maxAttempts) {
      alert(`Maximum ${maxAttempts} attempts reached.`);
      return;
    }

    if (!enrollmentId) {
      console.error('No enrollmentId found for submission');
      alert('Please enroll in the course first.');
      return;
    }

    let score = 0;
    const totalQuestions = content.questions.length;
    content.questions.forEach((question, qIndex) => {
      const userAnswer = quizAnswers[qIndex];
      console.log(`Evaluating question ${qIndex}: User answer=${userAnswer}, Correct answer=${question.answer}`);
      if (userAnswer === question.answer) score++;
      else if (userAnswer === undefined) console.log('No answer selected for question:', qIndex);
    });
    const percentageScore = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    setQuizScore(percentageScore);

    axios
      .post(
        `http://localhost:3000/api/submissions`,
        {
          enrollmentId,
          quizId: content.id,
          userId,
          score: percentageScore,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((res) => {
        console.log('Submission response:', res.data);
        if (res.data && res.data.attemptCount !== undefined) {
          setAttemptCount(res.data.attemptCount);
        } else {
          setAttemptCount(attemptCount + 1);
        }
        setProgress(res.data.progress || percentageScore);
        alert('Quiz submitted successfully!');
      })
      .catch((err) => {
        console.error('Submission error:', err.response ? err.response.data : err.message);
        alert('Failed to submit quiz. Check console for details.');
      });
  };

  const handleModuleClick = (e, moduleId) => {
    e.preventDefault();
    console.log("Module clicked:", moduleId);
    const isExpanding = expandedModule !== moduleId;
    setExpandedModule(isExpanding ? moduleId : null);
    setShowForums(false);
    if (isExpanding) {
      fetchContents(moduleId);
    }
  };

  const handleContentClick = (e, content) => {
    e.preventDefault();
    console.log("Content clicked:", content.id);
    setSelectedContent(content.id);
    setShowForums(false);
    setQuizScore(null);
    if (content.type.toLowerCase() === 'quiz' && enrollmentId) {
      axios
        .get(`http://localhost:3000/api/submissions/count`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { enrollmentId, quizId: content.id },
        })
        .then((res) => {
          console.log('Attempt count response:', res.data);
          setAttemptCount(res.data.attemptCount || 0);
        })
        .catch((err) => {
          console.error('Attempt count fetch error:', err.response ? err.response.data : err.message);
          setAttemptCount(0);
        });

      axios
        .get(`http://localhost:3000/api/submissions/max-score`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { quizId: content.id },
        })
        .then((res) => {
          console.log('Max score response:', res.data);
          setMaxScore(res.data.maxScore || 100);
        })
        .catch((err) => {
          console.error('Max score fetch error:', err.response ? err.response.data : err.message);
          setMaxScore(100);
        });
    }
  };

  const handleRatingSubmit = (e) => {
    e.preventDefault();
    if (rating > 0 && rating <= 5 && enrollmentId) {
      axios
        .post(
          `http://localhost:3000/api/courses/${courseId}/rate`,
          {
            userId,
            rating,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          console.log('Rating submission response:', res.data);
          setCourseRating(res.data.averageRating);
          alert('Thank you for rating the course!');
          setRating(0);
        })
        .catch((err) => {
          console.error('Rating submission error:', err.response ? err.response.data : err.message);
          alert('Failed to submit rating. Check console for details.');
        });
    } else {
      alert('Please select a rating between 1 and 5.');
    }
  };

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      alert('Please enter a post content.');
      return;
    }
    if (!token) {
      alert('Please log in to post.');
      return;
    }

    axios
      .post(
        `http://localhost:3000/api/courses/${courseId}/forum-posts`,
        {
          userId,
          content: newPostContent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((res) => {
        console.log('New post response:', res.data);
        setForumPosts([res.data, ...forumPosts]);
        setNewPostContent('');
        alert('Post submitted successfully!');
      })
      .catch((err) => {
        console.error('Post submission error:', err.response ? err.response.data : err.message);
        alert('Failed to submit post. Check console for details.');
      });
  };

  const handleUpvote = (postId) => {
    if (!token) {
      alert('Please log in to upvote.');
      return;
    }

    axios
      .patch(
        `http://localhost:3000/api/courses/${courseId}/forum-posts/${postId}/upvote`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((res) => {
        console.log('Upvote response:', res.data);
        setForumPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, upvotes: res.data.upvotes } : post
          )
        );
      })
      .catch((err) => {
        console.error('Upvote error:', err.response ? err.response.data : err.message);
        alert('Failed to upvote. Check console for details.');
      });
  };

  const renderContent = () => {
    if (error) return <div className="alert alert-danger">{error}</div>;
    if (showForums) {
      return (
        <div className="forum-container">
          <h2>Forum Posts</h2>
          {forumPosts.length === 0 ? (
            <p>No posts yet. Be the first to start a discussion!</p>
          ) : (
            <ul className="forum-posts">
              {forumPosts.map((post) => (
                <li key={post.id} className="forum-post">
                  <p><strong>{post.username}</strong> ({new Date(post.created_at).toLocaleString()})</p>
                  <p>{post.content}</p>
                  <button
                    className="btn btn-link upvote-btn"
                    onClick={() => handleUpvote(post.id)}
                  >
                    👍 {post.upvotes}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handlePostSubmit} className="forum-post-form mt-3">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Write your post here..."
              className="form-control mb-2"
              rows="3"
            ></textarea>
            <button type="submit" className="btn btn-primary">Submit Post</button>
          </form>
        </div>
      );
    }
    if (!selectedContent || !expandedModule || !contents[expandedModule]) {
      return <p className="text-center">Select a content item from the sidebar to view details.</p>;
    }

    const content = contents[expandedModule].find((c) => c.id === selectedContent);
    if (!content) return <div className="alert alert-warning">Content not available.</div>;

    switch (content.type.toLowerCase()) {
      case 'video':
        console.log('Rendering video content:', { url: content.url, type: content.type });
        if (content.url) {
          const isYouTubeUrl = content.url.includes('youtube.com') || 
                              content.url.includes('youtu.be') || 
                              content.url.includes('youtube-nocookie.com');
          if (isYouTubeUrl) {
            let videoId = '';
            if (content.url.includes('youtu.be/')) {
              videoId = content.url.split('youtu.be/')[1].split('?')[0].split('#')[0];
            } else if (content.url.includes('watch?v=')) {
              videoId = content.url.split('watch?v=')[1].split('&')[0].split('#')[0];
            } else if (content.url.includes('embed/')) {
              videoId = content.url.split('embed/')[1].split('?')[0].split('#')[0];
            } else if (content.url.includes('/v/')) {
              videoId = content.url.split('/v/')[1].split('?')[0].split('#')[0];
            }
            console.log('Extracted YouTube video ID:', videoId);
            if (videoId) {
              const embedUrl = `https://www.youtube.com/embed/${videoId}`;
              return (
                <div>
                  <div className="video-container">
                    <iframe
                      title="YouTube Video"
                      width="100%"
                      height="500"
                      src={embedUrl}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onError={(e) => console.error('Iframe error:', e)}
                    ></iframe>
                  </div>
                  <button className="btn btn-success mt-3 mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
                    Mark as Completed
                  </button>
                  <p>
                    <strong>Progress:</strong> {progress.toFixed(2)}%
                  </p>
                </div>
              );
            } else {
              return <div className="alert alert-danger">Invalid YouTube URL: Unable to extract video ID</div>;
            }
          } else {
            return (
              <div>
                <video controls className="w-100 mb-3" height="auto" onError={(e) => console.error('Video error:', e.target.error)}>
                  <source src={content.url} type="video/mp4" />
                  <source src={content.url} type="video/webm" />
                  <p>
                    Your browser does not support the video format.{' '}
                    <a href={content.url} target="_blank" rel="noopener noreferrer">
                      Download the video
                    </a>{' '}
                    or try a different browser.
                  </p>
                </video>
                <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
                  Mark as Completed
                </button>
                <p>
                  <strong>Progress:</strong> {progress.toFixed(2)}%
                </p>
              </div>
            );
          }
        } else {
          return <div className="alert alert-warning">No video URL provided</div>;
        }
      case 'pdf':
        return (
          <div>
            <iframe src={content.url} className="w-100" height="600px" title="PDF Viewer">
              <p>
                Your browser does not support PDFs.{' '}
                <a href={content.url} target="_blank" rel="noopener noreferrer">
                  Download the PDF
                </a>
                .
              </p>
            </iframe>
            <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
              Mark as Completed
            </button>
            <p>
              <strong>Progress:</strong> {progress.toFixed(2)}%
            </p>
          </div>
        );
      case 'quiz':
        console.log('Rendering quiz:', content);
        return (
          <div>
            <h4>Quiz (Attempts left: {Math.max(0, 3 - attemptCount)})</h4>
            <p>Max Score: {maxScore}</p>
            {content.questions && content.questions.length > 0 ? (
              <>
                {content.questions.map((question, qIndex) => (
                  <div key={qIndex} className="quiz-question">
                    <p>{question.question}</p>
                    {question.options && question.options.length > 0 ? (
                      question.options.map((option, index) => (
                        <div key={index}>
                          <input
                            type="radio"
                            id={`q_${qIndex}_o_${index}`}
                            name={`question_${qIndex}`}
                            value={option}
                            onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
                            checked={quizAnswers[qIndex] === option}
                          />
                          <label htmlFor={`q_${qIndex}_o_${index}`}>{option}</label>
                        </div>
                      ))
                    ) : (
                      <p className="alert alert-warning">No options available for this question.</p>
                    )}
                  </div>
                ))}
                <button className="btn btn-primary mt-3" onClick={handleQuizSubmit} disabled={attemptCount >= 3}>
                  Submit Quiz
                </button>
                {quizScore !== null && (
                  <div className="mt-3">
                    <h5>Score: {quizScore.toFixed(2)}%</h5>
                    <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
                      Mark as Completed
                    </button>
                    <p>
                      <strong>Progress:</strong> {progress.toFixed(2)}%
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="alert alert-warning">No questions available for this quiz.</p>
            )}
          </div>
        );
      default:
        return (
          <div>
            <p>
              Unsupported content type: {content.type}. URL:{' '}
              <a href={content.url} target="_blank" rel="noopener noreferrer">
                {content.url}
              </a>
            </p>
            <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
              Mark as Completed
            </button>
            <p>
              <strong>Progress:</strong> {progress.toFixed(2)}%
            </p>
          </div>
        );
    }
  };

  return (
    <div className="course-content">
      <nav className="navbar">
        <div className="navbar-brand">Online Learning Platform</div>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/student">Dashboard</Link>
          </li>
          <li className="navbar-item">
            <Link to="/profile">Profile</Link>
          </li>
          
        </ul>
      </nav>

      <div className="content-layout">
        <div className="sidebar">
          {modules.length === 0 ? (
            <p className="text-center">Loading modules...</p>
          ) : (
            modules.map((module) => (
              <div key={module.id}>
                <h5
                  className="module-title"
                  onClick={(e) => handleModuleClick(e, module.id)}
                >
                  {module.title} {expandedModule === module.id ? '▼' : '▶'}
                </h5>
                {expandedModule === module.id && contents[module.id] && (
                  <ul className="content-list">
                    {contents[module.id].map((content) => (
                      <li
                        key={content.id}
                        className={`content-item ${selectedContent === content.id ? 'selected' : ''}`}
                        onClick={(e) => handleContentClick(e, content)}
                      >
                        {content.type}: {content.url.split('/').pop() || 'Unnamed Content'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
          <button className="forums-button" onClick={() => setShowForums(!showForums)}>
            <Link to="#">Forums</Link>
          </button>
          <div className="rating-section mt-3">
            <h5>Rate this Course</h5>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= rating ? 'selected' : ''}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
            <p>Average Rating: {typeof courseRating === 'number' ? courseRating.toFixed(1) : 'N/A'}</p>
            <button className="btn btn-primary mt-2" onClick={handleRatingSubmit} disabled={rating === 0}>
              Submit Rating
            </button>
          </div>
        </div>
        <div className="main-content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default CourseContent;