// Add dotenv for environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to database
connectDB();

const app = express();

// Add compression to reduce response size
app.use(compression());

// Middleware
app.use(cors());
// Reduce JSON payload limit from 50MB to 5MB
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files from the React app when in production
if (process.env.NODE_ENV === 'production') {
  // Set cache control headers for static assets
  const staticOptions = {
    maxAge: '1d', // Cache static assets for 1 day
    setHeaders: (res, path) => {
      // Set longer cache for media files
      if (path.endsWith('.mp4') || path.endsWith('.jpg') || path.endsWith('.png') || 
          path.endsWith('.webp') || path.endsWith('.svg')) {
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
      }
    }
  };
  
  // Set static folder with caching options
  app.use(express.static(path.join(__dirname, '../../client/build'), staticOptions));

  // Any routes not caught by API will be handled by React
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/build', 'index.html'));
  });
} else {
  // Home route (for API testing in development)
  app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 