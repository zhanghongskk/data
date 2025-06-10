const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  uploadPhoneNumbers, 
  getPhoneNumbers,
  getPhoneNumbersCount,
  assignPhoneNumbersToUser,
  createAdminUser,
  clearAllPhoneNumbers,
  clearAllUserAssignments,
  bulkCreateUsers,
  reconcilePhoneNumberAssignments,
  unassignAllPhoneNumbersAndResetUsers,
  bulkAssignPhoneNumbersToAllUsers,
  deleteUser,
  deleteMultipleUsers,
  clearUsedPhoneNumbers,
  clearAssignedPhoneNumbers,
  clearTotalPhoneNumbers,
  exportUnusedPhoneNumbers
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Configure video storage for public folder
const videoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Save to client/public/video folder
    const videoDir = path.join(__dirname, '../../../client/public/video');
    // Create directory if it doesn't exist
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    cb(null, videoDir);
  },
  filename: function(req, file, cb) {
    // Get the next available bg#.mp4 filename
    const videoDir = path.join(__dirname, '../../../client/public/video');
    const files = fs.readdirSync(videoDir);
    
    // Filter for bg#.mp4 pattern files
    const bgFiles = files.filter(f => /^bg\d+\.mp4$/i.test(f));
    
    // Find the highest number
    let highestNum = 3; // Start from 3 since we already have bg, bg2, bg3
    bgFiles.forEach(file => {
      const match = file.match(/^bg(\d+)\.mp4$/i);
      if (match && match[1]) {
        const num = parseInt(match[1]);
        if (num > highestNum) {
          highestNum = num;
        }
      }
    });
    
    // Create the next filename
    const nextNum = highestNum + 1;
    const filename = `bg${nextNum}.mp4`;
    cb(null, filename);
  }
});

// Filter function to accept only video files
const videoFilter = (req, file, cb) => {
  const filetypes = /mp4|webm|ogg|avi|mov/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'));
  }
};

// Filter function to accept only Excel and CSV files
const fileFilter = (req, file, cb) => {
  const filetypes = /xlsx|xls|csv/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only Excel and CSV files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

const router = express.Router();

// Public route to create initial admin
router.post('/setup', createAdminUser);

// Video upload route
router.post('/upload-video', protect, admin, videoUpload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video file uploaded' 
      });
    }

    // Return success with the file info
    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      file: {
        filename: req.file.filename,
        path: `/video/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while uploading video' 
    });
  }
});

// List available videos
router.get('/videos', protect, admin, (req, res) => {
  try {
    const videoDir = path.join(__dirname, '../../../client/public/video');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
      return res.status(200).json({ videos: [] });
    }
    
    const files = fs.readdirSync(videoDir);
    
    // Filter for mp4 files and format the response
    const videos = files
      .filter(file => file.toLowerCase().endsWith('.mp4'))
      .map(file => {
        const id = file.replace('.mp4', '');
        return {
          id: id,
          name: `Background Video ${id.replace('bg', '')}`,
          path: `/video/${file}`
        };
      });
    
    return res.status(200).json({ videos });
  } catch (error) {
    console.error('Error listing videos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while listing videos' 
    });
  }
});

// Protected admin routes
router.post('/upload-numbers', protect, admin, uploadPhoneNumbers);
router.get('/phone-numbers', protect, admin, getPhoneNumbers);
router.get('/phone-numbers/count', protect, admin, getPhoneNumbersCount);
router.post('/assign-numbers', protect, admin, assignPhoneNumbersToUser);
router.delete('/clear-numbers', protect, admin, clearAllPhoneNumbers);
router.delete('/clear-assignments', protect, admin, clearAllUserAssignments);
router.delete('/clear-used-numbers', protect, admin, clearUsedPhoneNumbers);
router.delete('/clear-assigned-numbers', protect, admin, clearAssignedPhoneNumbers);
router.delete('/clear-total-numbers', protect, admin, clearTotalPhoneNumbers);
router.get('/export-unused-numbers', protect, admin, exportUnusedPhoneNumbers);

// New route for reconciling phone number assignments
router.post('/reconcile-assignments', protect, admin, reconcilePhoneNumberAssignments);

// New route to unassign all phone numbers and reset user counts
router.post('/unassign-all-numbers', protect, admin, unassignAllPhoneNumbersAndResetUsers);

// Bulk upload users route
router.post('/bulk-create-users', 
  protect, 
  admin, 
  upload.single('file'), // 'file' is the expected field name in the form
  bulkCreateUsers
);

// New route for bulk assigning phone numbers to all users
router.post('/bulk-assign-to-all', protect, admin, bulkAssignPhoneNumbersToAllUsers);

// New route for deleting a single user
router.delete('/delete-user/:userId', protect, admin, deleteUser);

// New route for deleting multiple users
router.post('/delete-users', protect, admin, deleteMultipleUsers);

// New route for selecting background video
router.post('/set-background-video', protect, admin, (req, res) => {
  try {
    const { videoId } = req.body;
    
    // Validate videoId
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid video ID provided' 
      });
    }
    
    // In a real application, you might save this to a database
    // For now, we'll just return success since we're using localStorage on the client
    
    return res.status(200).json({
      success: true,
      message: `Background video set to ${videoId}`,
      videoId
    });
  } catch (error) {
    console.error('Error setting background video:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while setting background video' 
    });
  }
});

module.exports = router; 