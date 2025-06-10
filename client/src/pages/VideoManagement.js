import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Alert, Form, Spinner } from 'react-bootstrap';
import { setBackgroundVideo as saveBackgroundVideo, getAvailableVideos, uploadVideo } from '../utils/api';

const VideoManagement = () => {
  const [selectedVideo, setSelectedVideo] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [timestamp, setTimestamp] = useState(Date.now());
  const [availableVideos, setAvailableVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [backgroundVideo, setBackgroundVideo] = useState('');
  const [showVideoBackground] = useState(true);
  
  // Load available videos from the server
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const videos = await getAvailableVideos();
        setAvailableVideos(videos);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideos();
  }, []);
  
  // Get currently active video from localStorage
  useEffect(() => {
    const currentVideo = localStorage.getItem('backgroundVideo') || 'bg3';
    setSelectedVideo(currentVideo);
    setBackgroundVideo(`${currentVideo}.mp4?t=${Date.now()}`);
  }, []);
  
  // Refresh video paths to avoid browser caching
  const refreshVideos = () => {
    setTimestamp(Date.now());
  };
  
  // Handle video selection
  const handleVideoSelect = (videoId) => {
    setSelectedVideo(videoId);
    // Refresh videos to ensure previews are updated
    refreshVideos();
  };
  
  // Apply the selected video
  const applyVideoChange = async () => {
    try {
      setError('');
      
      // Save to localStorage
      localStorage.setItem('backgroundVideo', selectedVideo);
      
      // Update background video
      setBackgroundVideo(`${selectedVideo}.mp4?t=${Date.now()}`);
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new Event('storage'));
      
      // Call API to save on server (for future use)
      await saveBackgroundVideo(selectedVideo);
      
      // Refresh videos to prevent caching issues
      refreshVideos();
      
      setSuccess(`Successfully changed background video to ${selectedVideo}.mp4`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to change background video. Please try again.');
      setSuccess('');
    }
  };
  
  // Handle file selection for video upload
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      // Check if file is a video
      const file = e.target.files[0];
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file.');
        return;
      }
      
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('Video file is too large. Maximum size is 50MB.');
        return;
      }
      
      setVideoFile(file);
      setError('');
    }
  };
  
  // Handle video upload
  const handleVideoUpload = async (e) => {
    e.preventDefault();
    
    if (!videoFile) {
      setError('Please select a video file to upload.');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError('');
      setSuccess('');
      
      // Upload the video
      const response = await uploadVideo(videoFile);
      
      // Refresh the list of available videos
      const videos = await getAvailableVideos();
      setAvailableVideos(videos);
      
      // Clear the file input
      setVideoFile(null);
      document.getElementById('video-upload').value = '';
      
      setSuccess(`Video uploaded successfully as ${response.file.filename}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      setError(err.message || 'Failed to upload video. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };
  
  // Preview the video
  const VideoPreview = ({ src }) => (
    <div className="video-preview-container">
      <video 
        src={src} 
        key={src}
        className="video-preview" 
        autoPlay 
        muted 
        loop
        style={{ 
          width: '100%', 
          height: '200px', 
          objectFit: 'cover',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      />
    </div>
  );

  return (
    <>
      {/* Video Background */}
      {showVideoBackground && backgroundVideo && (
        <div className="video-background-container">
          <video
            key={backgroundVideo}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'fixed',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: -1,
              top: 0,
              left: 0
            }}
          >
            <source src={`/video/${backgroundVideo}`} type="video/mp4" />
          </video>
          <div className="admin-bg-overlay"></div>
        </div>
      )}
      
      <div className="admin-section active" style={{ marginTop: '80px' }}>
        <div className="admin-section-heading d-flex justify-content-between align-items-center">
          <div>
            <i className="fas fa-video me-2"></i>
            Background Video Management
          </div>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={refreshVideos}
            title="Refresh video previews"
          >
            <i className="fas fa-sync-alt"></i>
          </Button>
        </div>
        
        {error && (
          <Alert variant="danger" className="glass-container py-2 px-3 mb-4">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" className="glass-container py-2 px-3 mb-4">
            <i className="fas fa-check-circle me-2"></i>
            {success}
          </Alert>
        )}
        
        {/* Video Upload Section */}
        <Card className="modern-card mb-4">
          <Card.Body>
            <h5 className="mb-3">
              <i className="fas fa-cloud-upload-alt me-2"></i>
              Upload New Background Video
            </h5>
            <Form onSubmit={handleVideoUpload}>
              <Form.Group className="mb-3">
                <Form.Label>Select a video file to upload</Form.Label>
                <Form.Control
                  type="file"
                  id="video-upload"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={uploadLoading}
                />
                <Form.Text className="text-muted">
                  Supported formats: MP4, WebM, Ogg, AVI, MOV. Maximum size: 50MB.
                </Form.Text>
              </Form.Group>
              <Button
                variant="primary"
                type="submit"
                className="btn-modern-primary"
                disabled={!videoFile || uploadLoading}
              >
                {uploadLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt me-2"></i>
                    Upload Video
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
        
        {/* Video Selection Section */}
        <Card className="modern-card mb-4">
          <Card.Body>
            <h5 className="mb-3">
              <i className="fas fa-list me-2"></i>
              Select Background Video
            </h5>
            
            {isLoading ? (
              <div className="text-center p-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading available videos...</p>
              </div>
            ) : availableVideos.length === 0 ? (
              <Alert variant="info">
                No videos available. Please upload a video.
              </Alert>
            ) : (
              <>
                <p className="mb-4">
                  Select a background video to use throughout the admin dashboard.
                  The selected video will be applied the next time the dashboard is loaded.
                </p>
                
                <Row>
                  {availableVideos.map((video) => (
                    <Col md={4} key={video.id} className="mb-4">
                      <Card 
                        className={`h-100 modern-card ${selectedVideo === video.id ? 'border border-primary' : ''}`}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: selectedVideo === video.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
                        }} 
                        onClick={() => handleVideoSelect(video.id)}
                      >
                        <Card.Body>
                          <VideoPreview src={`${video.path}?t=${timestamp}`} />
                          <div className="d-flex align-items-center mt-3">
                            <div 
                              className="me-2" 
                              style={{ 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '50%', 
                                border: '2px solid rgba(255, 255, 255, 0.5)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}
                            >
                              {selectedVideo === video.id && (
                                <div 
                                  style={{ 
                                    width: '12px', 
                                    height: '12px', 
                                    borderRadius: '50%', 
                                    backgroundColor: '#6366F1' 
                                  }} 
                                />
                              )}
                            </div>
                            <h5 className="mb-0">{video.name}</h5>
                          </div>
                          <p className="text-white mt-2 mb-0">
                            Filename: {video.id}.mp4
                          </p>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
                
                <div className="d-flex justify-content-end mt-3">
                  <Button 
                    variant="primary" 
                    onClick={applyVideoChange}
                    className="btn-modern-primary"
                  >
                    <i className="fas fa-save me-2"></i>
                    Apply Changes
                  </Button>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    </>
  );
};

export default VideoManagement; 